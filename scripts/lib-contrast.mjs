// =====================================================================
// '진영별 논조 비교'에 쓸 두 기사를 고른다.
// 규칙: 그 사건을 실제로 보도한 매체 중 '가장 벌어진 두 진영'의 대표기사.
//   (진보가 없으면 중도 vs 보수처럼, 있는 진영 중 양 끝)
// ⚠️ 화면(src/screens/DetailScreen.tsx의 pickContrast)과 반드시 같은 규칙이어야
//    논조 문장과 '근거 기사 링크'가 어긋나지 않는다.
// =====================================================================
const ORDER = ['prog', 'center', 'cons']

export function pickContrast(event) {
  const repByLean = {}
  for (const a of event.articles || []) if (!repByLean[a.lean]) repByLean[a.lean] = a
  const present = ORDER.filter((l) => repByLean[l])
  if (present.length < 2) return {} // 진영이 하나뿐이면 비교 불가
  return { left: repByLean[present[0]], right: repByLean[present[present.length - 1]] }
}
