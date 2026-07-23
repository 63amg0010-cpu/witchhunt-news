// 편향 비교용 계산 모음 — 이 앱의 핵심(진영별 보도 비교)을 화면에 드러내는 데 쓴다.
import type { Lean, NewsEvent } from '../types'

export const LEAN_KO: Record<Lean, string> = { prog: '진보', center: '중도', cons: '보수' }

// 정치·사회·국제 밖의 뉴스는 진영별 보도 차이를 편향 경고로 해석하기 어렵다.
const PARTISAN_TILT_CATEGORIES: readonly NewsEvent['category'][] = ['정치', '사회', '국제'] as const

// 사건을 보도한 언론사를 진영별로 센다 (기사 목록 기준, 최대 8건 표본)
export function leanCounts(ev: NewsEvent): { prog: number; center: number; cons: number } {
  const c = { prog: 0, center: 0, cons: 0 }
  for (const a of ev.articles) c[a.lean]++
  return c
}

// 화면에 보여줄 '진영별 언론사 수' — 표본(최대 8건)을 전체 보도량(outletCount)에 비례해 환산해서
// 카드의 'N개 언론사 보도'와 합이 맞도록 한다. (정확 분류가 아니라 비율 추정 = 참고용)
// 표본에서 0인 진영은 0을 유지해(없는 진영을 만들어내지 않음) 정직하게.
export function displayLeanCounts(ev: NewsEvent): { prog: number; center: number; cons: number } {
  const c = leanCounts(ev)
  const sample = c.prog + c.center + c.cons
  const total = ev.outletCount || sample
  if (sample === 0 || total <= sample) return c // 표본이 전부면 그대로
  const keys = ['prog', 'center', 'cons'] as const
  const raw = { prog: 0, center: 0, cons: 0 }
  const out = { prog: 0, center: 0, cons: 0 }
  for (const k of keys) {
    raw[k] = (c[k] / sample) * total
    out[k] = c[k] === 0 ? 0 : Math.floor(raw[k]) // 0인 진영은 0 유지
  }
  // 최대잔여법: 합이 total이 되도록 소수부 큰 진영부터 +1 (단, 표본에 있는 진영만)
  let rem = total - (out.prog + out.center + out.cons)
  const order = keys.filter((k) => c[k] > 0).sort((a, b) => raw[b] - Math.floor(raw[b]) - (raw[a] - Math.floor(raw[a])))
  while (rem > 0 && order.length) {
    for (const k of order) {
      if (rem <= 0) break
      out[k]++
      rem--
    }
  }
  return out
}

// 사건에 붙일 편향 뱃지.
//  - 'tilt'      : 한쪽 진영(진보/보수)에 60% 이상 쏠림 (강한 경고)
//  - 'blindspot' : 한쪽 진영이 이 사건을 아예 안 다룸 (놓치기 쉬운 반대편 시각)
//  - null        : 비교적 균형
export interface BiasBadge {
  kind: 'tilt' | 'blindspot'
  text: string
  lean: Lean // 강조 색에 쓸 진영
}
// 진영 쏠림 판정 — 앱에서 직접 계산(빌드 없이 기준 조정 가능).
// 한국 언론은 중도(통신사)가 많아 '전체의 60%' 기준으론 거의 안 잡힌다.
// 그래서 진보↔보수 사이의 불균형을 본다.
//  - kind 'blindspot' : 한쪽 진영이 3곳+ 보도했는데 반대편은 0곳 → 'lean'은 빠진(반대) 진영
//  - kind 'tilt'      : 양쪽 다 있지만 한쪽이 진영 보도의 75% 이상 → 'lean'은 쏠린 진영
export function partisanTilt(ev: NewsEvent): { lean: 'prog' | 'cons'; kind: 'tilt' | 'blindspot' } | null {
  if (!PARTISAN_TILT_CATEGORIES.includes(ev.category)) return null
  const c = leanCounts(ev)
  const partisan = c.prog + c.cons
  if (partisan < 3) return null
  // 1) 한쪽이 3곳+ 보도, 반대편 0곳 → 반대편 시각이 빠짐. lean = '빠진' 진영
  if (c.cons === 0 && c.prog >= 3) return { lean: 'cons', kind: 'blindspot' }
  if (c.prog === 0 && c.cons >= 3) return { lean: 'prog', kind: 'blindspot' }
  // 2) 양쪽 다 있어도 한쪽이 진영 보도의 75% 이상 → 쏠림. lean = '쏠린' 진영
  if (partisan >= 4) {
    if (c.prog / partisan >= 0.75) return { lean: 'prog', kind: 'tilt' }
    if (c.cons / partisan >= 0.75) return { lean: 'cons', kind: 'tilt' }
  }
  return null
}

export function biasBadge(ev: NewsEvent): BiasBadge | null {
  const t = partisanTilt(ev)
  if (!t) return null
  const text = t.kind === 'blindspot' ? `${LEAN_KO[t.lean]} 시각 빠짐` : `${LEAN_KO[t.lean]} 쏠림`
  return { kind: t.kind, text, lean: t.lean }
}

// 홈 상단 "오늘의 편향 브리핑"용 집계
export function feedBiasSummary(events: NewsEvent[]) {
  const totals = { prog: 0, center: 0, cons: 0 }
  let tilted = 0
  let blindspot = 0
  for (const ev of events) {
    const t = partisanTilt(ev)
    if (t?.kind === 'tilt') tilted++
    if (t?.kind === 'blindspot') blindspot++
    const c = leanCounts(ev)
    totals.prog += c.prog
    totals.center += c.center
    totals.cons += c.cons
  }
  const sum = totals.prog + totals.center + totals.cons || 1
  const pct = {
    prog: Math.round((totals.prog / sum) * 100),
    cons: Math.round((totals.cons / sum) * 100),
  }
  return {
    total: events.length,
    tilted, // 쏠린 사건 수
    blindspot, // 한쪽만 보도한 사건 수
    totals,
    pct: { prog: pct.prog, center: 100 - pct.prog - pct.cons, cons: pct.cons },
  }
}
