// =====================================================================
// '진영별 논조 비교'에 쓸 두 기사를 고른다.
// 규칙: 그 사건을 실제로 보도한 진보·보수 매체의 대표기사만 고른다.
//   (중도 매체는 어느 쪽에도 포함하지 않으며, 한쪽이라도 없으면 비교하지 않는다.)
// ⚠️ 화면(src/screens/DetailScreen.tsx의 pickContrast)과 반드시 같은 규칙이어야
//    논조 문장과 '근거 기사 링크'가 어긋나지 않는다.
// =====================================================================
export function pickContrast(event) {
  const repByLean = {}
  for (const a of event.articles || []) {
    if ((a.lean === 'prog' || a.lean === 'cons') && !repByLean[a.lean]) repByLean[a.lean] = a
  }
  if (!repByLean.prog || !repByLean.cons) return {} // 진보·보수 중 한쪽이라도 없으면 비교 불가
  return { left: repByLean.prog, right: repByLean.cons }
}
