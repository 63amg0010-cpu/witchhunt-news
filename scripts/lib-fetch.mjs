// =====================================================================
// 네트워크 요청 공통 유틸 (재시도 포함)
//
// 왜 필요한가:
//   자동화(코덱스) 회차에서 build-feed가 수백 번 fetch를 한 직후,
//   dump-articles / fetch-reactions의 fetch가 '전부' 실패하는 일이 있었다.
//   (단독 실행하면 8/8 성공 → 스크립트·네트워크 문제가 아니라 그 순간의 일시적 실패)
//   한 번 실패하면 그냥 빈 값으로 넘어가서, 기사 본문이 안 와 AI 요약이 안 되고
//   네이버 원문 조각이 그대로 화면에 노출됐다.
//   → 실패하면 잠깐 쉬었다 다시 시도하도록 만들어 이런 일시적 실패를 넘긴다.
// =====================================================================

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

// fetch + 타임아웃 + 재시도. 끝내 실패하면 마지막 에러를 throw 한다.
export async function fetchRetry(url, options = {}, { retries = 3, timeoutMs = 15000, backoffMs = 900 } = {}) {
  let lastErr
  for (let attempt = 1; attempt <= retries; attempt++) {
    const ctrl = new AbortController()
    const timer = setTimeout(() => ctrl.abort(), timeoutMs)
    try {
      const res = await fetch(url, { ...options, signal: ctrl.signal })
      clearTimeout(timer)
      return res
    } catch (e) {
      clearTimeout(timer)
      lastErr = e
      if (attempt < retries) await sleep(backoffMs * attempt) // 갈수록 더 기다렸다 재시도
    }
  }
  throw lastErr
}
