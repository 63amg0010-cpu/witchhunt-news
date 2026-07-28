// 사건 하나가 '사람에게 보여줄 만한 상태인지' 판정하는 공용 기준.
// ⚠️ 같은 판정을 dump-articles(재요약 대상 고르기)와 push-feed(배포 제외)가 함께 쓴다.
//    예전에 언론사 분류표를 두 벌 두었다가 어긋난 적이 있어, 이 기준은 한 곳에만 둔다.

// 요약이 'AI 요약'이 아니라 네이버 원문 조각인지 판정
export function summaryBroken(ev) {
  const t = (ev.summary || '').trim()
  if (!t) return true
  // 말줄임표로 끝나면 원문이 중간에서 잘린 것 — '.'으로 끝나 보여도 AI 요약이 아니다
  if (/(\.\.\.|…|⋯)$/.test(t)) return true
  if (!/[.!?]$/.test(t)) return true
  if (/&[a-zA-Z]+;|&#\d+;/.test(t)) return true
  if (/ {2,}/.test(t)) return true
  return false
}

// 화면에 내보내도 되는 사건인가 = AI 요약을 제대로 거쳤는가
export function isPublishable(ev) {
  return !!ev.background && !summaryBroken(ev)
}
