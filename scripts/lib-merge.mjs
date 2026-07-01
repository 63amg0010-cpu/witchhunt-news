// =====================================================================
// 거의 같은 사건끼리 합치기 (제목 단어가 많이 겹치면 하나로)
//  - 보도량(언론사 수) 큰 사건을 기준(anchor)으로 삼고,
//  - 제목 단어가 2개 이상 겹치는 사건들을 그 안으로 흡수(기사 합치기).
// build-feed.mjs(자동 갱신)와 merge-feed.mjs(현재 피드)에서 함께 사용.
// =====================================================================

const STOP = new Set([
  '있다','없다','대한','위해','관련','이번','오늘','내일','우리','지난','다시','최근','대해','통해',
  '종합','속보','단독','영상','사진','기자','뉴스','오전','오후','그는','했다','한다','된다','밝혀',
  '전했다','예정','전망','계획','입장','상황','대상','경우','문제','추진','발표','2보','3보',
  // 너무 일반적이라 서로 다른 사건을 잘못 묶는 경제·시황 단어들
  '금리','인상','인하','종전','물가','환율','증시','시장','경제','달러','주가','코스피','지수','여부','변수',
  '월드컵','조별리그','32강','16강','8강','4강','탈락','진출','예선','본선','승부','경기',
])

function tokenize(s) {
  const out = new Set()
  for (const r of String(s).replace(/[^가-힣a-zA-Z0-9]+/g, ' ').split(' ')) {
    const t = r.trim()
    if (t.length >= 2 && !STOP.has(t) && !/^\d+$/.test(t)) out.add(t)
  }
  return out
}

// 겹치는 단어 수. 어미만 다른 경우(재선거↔재선거론)도 포함되도록
// 한쪽이 다른 쪽을 포함하면(3글자 이상) 같은 단어로 본다.
function shared(a, b) {
  let n = 0
  for (const x of a) {
    for (const y of b) {
      if (x === y || (x.length >= 3 && y.includes(x)) || (y.length >= 3 && x.includes(y))) {
        n++
        break
      }
    }
  }
  return n
}

function toPercent(c) {
  const total = c.prog + c.center + c.cons
  if (total === 0) return { prog: 0, center: 100, cons: 0 }
  const prog = Math.round((c.prog / total) * 100)
  const cons = Math.round((c.cons / total) * 100)
  return { prog, center: 100 - prog - cons, cons }
}

// 합쳐진 사건의 성향 분포·프레임·경고를 기사 목록 기준으로 다시 계산
function recompute(ev) {
  const counts = { prog: 0, center: 0, cons: 0 }
  for (const a of ev.articles) counts[a.lean] = (counts[a.lean] || 0) + 1
  ev.bias = toPercent(counts)
  const max = Math.max(ev.bias.prog, ev.bias.center, ev.bias.cons)
  const dom = ev.bias.prog === max ? 'prog' : ev.bias.cons === max ? 'cons' : 'center'
  ev.biasWarning = max >= 60 && ev.articles.length >= 3 && dom !== 'center'
  ev.dominantLean = ev.biasWarning ? dom : undefined
  const prog = ev.articles.find((a) => a.lean === 'prog')
  const cons = ev.articles.find((a) => a.lean === 'cons')
  ev.frameProg = prog ? prog.title : '진보 성향으로 분류된 기사가 적습니다.'
  ev.frameCons = cons ? cons.title : '보수 성향으로 분류된 기사가 적습니다.'
}

function mergeInto(target, ev) {
  const targetOutlets = new Set(target.articles.map((a) => a.outlet))
  // 보도량(언론사 수): 같은 사건의 갈라진 묶음은 대체로 같은 언론사들이라
  // 합집합 ≈ 더 큰 쪽. 통째로 더하면(예전 방식) 갱신할 때마다 숫자가 끝없이 부풀어서,
  // 더 큰 쪽 값만 쓴다(여러 번 갱신해도 그대로 — idempotent).
  target.outletCount = Math.max(target.outletCount || 0, ev.outletCount || 0)
  // 기사 합치기 (언론사 중복 없이, 최대 8개)
  for (const a of ev.articles) {
    if (target.articles.length >= 8) break
    if (targetOutlets.has(a.outlet)) continue
    targetOutlets.add(a.outlet)
    target.articles.push(a)
  }
  // 중요도는 더 높은 쪽으로
  if (typeof ev.importance === 'number') {
    target.importance = Math.max(target.importance ?? 0, ev.importance)
  }
  // 요약·배경은 가진 쪽 것을 살린다 (누적 시 옛 사건의 요약 보존)
  if (!target.summary && ev.summary) target.summary = ev.summary
  if (!target.background && ev.background) target.background = ev.background
  if (!target.publicTake && ev.publicTake) target.publicTake = ev.publicTake
  // 처음 등장 시각은 더 이른 쪽으로 (오래된 사건 추적용)
  if (ev.firstSeen && (!target.firstSeen || ev.firstSeen < target.firstSeen)) {
    target.firstSeen = ev.firstSeen
  }
  // 기사 시각(publishedAt)은 더 최신 쪽으로 (최신순 정렬용)
  if (ev.publishedAt && (!target.publishedAt || ev.publishedAt > target.publishedAt)) {
    target.publishedAt = ev.publishedAt
  }
  recompute(target)
}

export function mergeEvents(events) {
  // 보도량 큰 사건이 기준이 되도록 정렬
  const sorted = [...events].sort((a, b) => (b.outletCount || 0) - (a.outletCount || 0))
  const kept = []
  for (const ev of sorted) {
    const toks = tokenize(ev.title)
    let target = null
    for (const k of kept) {
      if (shared(toks, k._tokens) >= 2) {
        target = k
        break
      }
    }
    if (target) {
      mergeInto(target, ev)
    } else {
      ev._tokens = toks
      kept.push(ev)
    }
  }
  // 임시 토큰 필드 제거
  for (const k of kept) delete k._tokens
  return kept
}
