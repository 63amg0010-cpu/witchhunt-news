import { defineConfig, loadEnv } from 'vite'
import type { Plugin } from 'vite'
import react from '@vitejs/plugin-react'

// =====================================================================
// 기사 대표사진(og:image) + 출판사 요약(og:description) 가져오기 — 개발서버 전용
// 앱이 /og?url=<기사주소> 로 물어보면, 서버가 그 기사 페이지를 열어
// 대표사진과 설명문을 찾아서 돌려준다. (한 번 찾은 건 기억해 둠)
// =====================================================================
function ogImagePlugin(): Plugin {
  const cache = new Map<string, { image: string; description: string }>()
  const decode = (s: string) =>
    s
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;|&apos;/g, "'")
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .trim()

  return {
    name: 'og-image',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const r2 = req as { originalUrl?: string; url?: string }
        const full = r2.originalUrl || r2.url || ''
        if (!full.startsWith('/og')) {
          next()
          return
        }
        res.setHeader('Content-Type', 'application/json; charset=utf-8')
        const qs = full.split('?')[1] ?? ''
        const target = new URLSearchParams(qs).get('url') ?? ''
        if (!target) {
          res.end(JSON.stringify({ image: '', description: '' }))
          return
        }
        const hit = cache.get(target)
        if (hit) {
          res.end(JSON.stringify(hit))
          return
        }
        try {
          const ctrl = new AbortController()
          const timer = setTimeout(() => ctrl.abort(), 6000)
          const r = await fetch(target, {
            redirect: 'follow',
            signal: ctrl.signal,
            headers: { 'User-Agent': 'Mozilla/5.0 (compatible; HannunBot/1.0)' },
          })
          clearTimeout(timer)
          const html = (await r.text()).slice(0, 250000) // 앞부분(<head>)만 보면 충분
          const m =
            html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i) ||
            html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i) ||
            html.match(/<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["']/i)
          let image = m ? m[1] : ''
          if (image && !/^https?:\/\//i.test(image)) {
            try {
              image = new URL(image, target).href
            } catch {
              image = ''
            }
          }
          const dm =
            html.match(/<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']*)["']/i) ||
            html.match(/<meta[^>]+content=["']([^"']*)["'][^>]+property=["']og:description["']/i) ||
            html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)["']/i)
          const description = dm ? decode(dm[1]) : ''

          const result = { image, description }
          cache.set(target, result)
          res.end(JSON.stringify(result))
        } catch (e) {
          res.end(JSON.stringify({ image: '', description: '', error: String(e) }))
        }
      })
    },
  }
}

// =====================================================================
// 기사 본문 AI 요약 (구글 Gemini, 무료 키) — 개발서버 전용
// 앱이 /summarize?url=<기사주소> 로 물어보면, 서버가 기사 본문을 읽어
// Gemini에게 3문장 요약을 시켜 돌려준다. (키 없으면 빈 값 → 다른 요약으로 대체)
// =====================================================================
function summarizePlugin(geminiKey: string): Plugin {
  const cache = new Map<string, string>()
  return {
    name: 'summarize',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const r2 = req as { originalUrl?: string; url?: string }
        const full = r2.originalUrl || r2.url || ''
        if (!full.startsWith('/summarize')) {
          next()
          return
        }
        res.setHeader('Content-Type', 'application/json; charset=utf-8')
        if (!geminiKey) {
          res.end(JSON.stringify({ summary: '' })) // 키 없으면 빈 값
          return
        }
        const qs = full.split('?')[1] ?? ''
        const target = new URLSearchParams(qs).get('url') ?? ''
        if (!target) {
          res.end(JSON.stringify({ summary: '' }))
          return
        }
        const hit = cache.get(target)
        if (hit !== undefined) {
          res.end(JSON.stringify({ summary: hit }))
          return
        }
        try {
          // 1) 기사 본문 가져와서 글자만 추리기
          const ctrl = new AbortController()
          const timer = setTimeout(() => ctrl.abort(), 7000)
          const pageRes = await fetch(target, {
            redirect: 'follow',
            signal: ctrl.signal,
            headers: { 'User-Agent': 'Mozilla/5.0 (compatible; HannunBot/1.0)' },
          })
          clearTimeout(timer)
          const html = await pageRes.text()
          const text = html
            .replace(/<script[\s\S]*?<\/script>/gi, ' ')
            .replace(/<style[\s\S]*?<\/style>/gi, ' ')
            .replace(/<[^>]+>/g, ' ')
            .replace(/&[a-zA-Z#0-9]+;/g, ' ')
            .replace(/\s+/g, ' ')
            .trim()
            .slice(0, 6000)

          // 2) Gemini에게 요약 요청
          const prompt =
            '다음 뉴스 기사를 한국어로 핵심만 3문장 이내로 간단히 요약해줘. ' +
            '의견·평가 없이 사실만, 자연스러운 문장으로:\n\n' +
            text
          const apiRes = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiKey}`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
            },
          )
          const data = (await apiRes.json()) as {
            candidates?: { content?: { parts?: { text?: string }[] } }[]
          }
          const summary = (data.candidates?.[0]?.content?.parts?.[0]?.text ?? '').trim()
          cache.set(target, summary)
          res.end(JSON.stringify({ summary }))
        } catch (e) {
          res.end(JSON.stringify({ summary: '', error: String(e) }))
        }
      })
    },
  }
}

// =====================================================================
// 뉴스 중계(프록시) 설정 — 개발서버 전용
// 브라우저는 보안(CORS) 때문에 외부 뉴스를 직접 못 부릅니다.
// 그래서 개발서버가 대신 전달해 줍니다.
//   /gnews/...  → 구글 뉴스 (키 불필요, 요약 없음)
//   /naver/...  → 네이버 검색 (.env의 키를 헤더에 넣어 전달, 요약 있음)
// 네이버 키는 .env 파일에서 읽으며 브라우저로는 절대 노출되지 않습니다.
// =====================================================================

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '') // .env에서 NAVER_CLIENT_ID/SECRET 읽기
  const naverId = env.NAVER_CLIENT_ID ?? ''
  const naverSecret = env.NAVER_CLIENT_SECRET ?? ''
  const naverHeaders: Record<string, string> = {}
  if (naverId && naverSecret) {
    naverHeaders['X-Naver-Client-Id'] = naverId
    naverHeaders['X-Naver-Client-Secret'] = naverSecret
  }
  const geminiKey = env.GEMINI_API_KEY ?? '' // 구글 Gemini 무료 키 (AI 요약용)

  return {
    plugins: [react(), ogImagePlugin(), summarizePlugin(geminiKey)],
    server: {
      // 같은 와이파이의 휴대폰 등 다른 기기에서도 접속할 수 있게 외부에 노출
      host: true,
      // 터널(외부 공개) 주소로 접속해도 막히지 않도록 허용
      allowedHosts: true,
      proxy: {
        '/gnews': {
          target: 'https://news.google.com',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/gnews/, ''),
        },
        '/naver': {
          target: 'https://openapi.naver.com',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/naver/, ''),
          headers: naverHeaders,
        },
      },
    },
  }
})
