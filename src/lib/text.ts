// 긴 글을 문장 단위로 나눠 가독성 좋게 보여주기 위한 도우미.
// 한국어 문장은 보통 ".", "?", "!" 로 끝난다.
export function splitSentences(text: string): string[] {
  if (!text) return []
  return text
    .split(/(?<=[.?!])\s+/)
    .map((s) => s.trim())
    .filter(Boolean)
}
