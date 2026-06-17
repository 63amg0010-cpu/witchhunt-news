// 편향 비교용 계산 모음 — 이 앱의 핵심(진영별 보도 비교)을 화면에 드러내는 데 쓴다.
import type { Lean, NewsEvent } from '../types'

export const LEAN_KO: Record<Lean, string> = { prog: '진보', center: '중도', cons: '보수' }

// 사건을 보도한 언론사를 진영별로 센다 (기사 목록 기준)
export function leanCounts(ev: NewsEvent): { prog: number; center: number; cons: number } {
  const c = { prog: 0, center: 0, cons: 0 }
  for (const a of ev.articles) c[a.lean]++
  return c
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
export function biasBadge(ev: NewsEvent): BiasBadge | null {
  const c = leanCounts(ev)
  const total = c.prog + c.center + c.cons
  if (total < 2) return null
  // 1) 한쪽 진영에 강하게 쏠림
  if (ev.biasWarning && ev.dominantLean && ev.dominantLean !== 'center') {
    return { kind: 'tilt', text: `${LEAN_KO[ev.dominantLean]} 쏠림`, lean: ev.dominantLean }
  }
  // 2) 블라인드스팟 — '오직 한 진영만' 보도(중도·반대편 전혀 없음)인 드문 경우만.
  //    (진보 기사가 원래 적어서 "진보 없음"은 너무 흔함 → 그건 표시 안 함)
  if (total >= 3) {
    const sides = [c.prog > 0, c.center > 0, c.cons > 0].filter(Boolean).length
    if (sides === 1) {
      if (c.prog > 0) return { kind: 'blindspot', text: '진보 매체만 보도', lean: 'prog' }
      if (c.cons > 0) return { kind: 'blindspot', text: '보수 매체만 보도', lean: 'cons' }
      // 중도(통신사)만 보도한 경우는 '편향'이 아니므로 표시하지 않음
    }
  }
  return null
}

// 홈 상단 "오늘의 편향 브리핑"용 집계
export function feedBiasSummary(events: NewsEvent[]) {
  const totals = { prog: 0, center: 0, cons: 0 }
  let tilted = 0
  let blindspot = 0
  for (const ev of events) {
    const b = biasBadge(ev)
    if (b?.kind === 'tilt') tilted++
    if (b?.kind === 'blindspot') blindspot++
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
