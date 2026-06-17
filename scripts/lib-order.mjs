// =====================================================================
// 홈 사건 정렬 규칙 (공용): "최신 우선 + 같은 시간대 안에선 중요도 순"
//  - 사건을 시간대 묶음(1시간내/6시간내/오늘/어제/그이전)으로 나누고,
//  - 같은 묶음 안에서는 중요도×10 + 보도량(언론사 수)로 정렬.
//  → 최신이면서도 크게 보도된 사건이 아래로 묻히지 않음.
// build-feed.mjs / apply-summaries.mjs 에서 함께 사용.
// =====================================================================

// 사건의 시각(ms). publishedAt(실제 기사 시각) → timeAgo 문자열 → firstSeen 순으로 추정.
function eventTimeMs(e, now) {
  if (e.publishedAt) { const t = Date.parse(e.publishedAt); if (!Number.isNaN(t)) return t }
  if (e.timeAgo) {
    if (e.timeAgo.includes('방금')) return now
    const m = e.timeAgo.match(/(\d+)\s*(분|시간|일)/)
    if (m) {
      const unit = m[2] === '분' ? 60000 : m[2] === '시간' ? 3600000 : 86400000
      return now - Number(m[1]) * unit
    }
  }
  if (e.firstSeen) { const t = Date.parse(e.firstSeen); if (!Number.isNaN(t)) return t }
  return 0
}

// 최근일수록 촘촘하게 나눠 '최신 우선'이 잘 드러나게 (분 단위 경계)
const BUCKET_MIN = [15, 30, 60, 120, 240, 480, 960, 1440, 2880]
function timeBucket(ms, now) {
  const min = (now - ms) / 60000
  for (let i = 0; i < BUCKET_MIN.length; i++) if (min < BUCKET_MIN[i]) return i
  return BUCKET_MIN.length
}

const score = (e) => (typeof e.importance === 'number' ? e.importance : 5) * 10 + (e.outletCount || 0)

export function sortForDisplay(events, now = Date.now()) {
  return events.sort((a, b) => {
    const ba = timeBucket(eventTimeMs(a, now), now)
    const bb = timeBucket(eventTimeMs(b, now), now)
    if (ba !== bb) return ba - bb       // 최신 시간대 먼저
    return score(b) - score(a)          // 같은 시간대 안에선 중요·보도량 큰 순
  })
}
