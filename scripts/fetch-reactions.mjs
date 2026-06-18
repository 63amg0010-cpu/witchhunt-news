// =====================================================================
// 네티즌 반응 수집 → _reactions.json
//  - 네이버 뉴스 댓글에서 '공감 많은 순' 댓글을 모은다.
//  - 코덱스(자동화)가 브라우징을 못 해도, 이 스크립트가 긁어온 댓글을
//    코덱스가 요약(publicTake)하면 된다.
//   실행: node scripts/fetch-reactions.mjs
// =====================================================================
import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const feed = JSON.parse(readFileSync(join(ROOT, 'public', 'feed.json'), 'utf8'))

const env = {}
try {
  for (const line of readFileSync(join(ROOT, '.env'), 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z_]+)\s*=\s*(.*)\s*$/)
    if (m) env[m[1]] = m[2].trim()
  }
} catch {}
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
const clean = (s) => String(s).replace(/<[^>]+>/g, ' ').replace(/&[a-zA-Z#0-9]+;/g, ' ').replace(/\s+/g, ' ').trim()
const keyword = (t) => clean(t).replace(/[\[\]"'“”‘’()]/g, ' ').split(' ').filter((w) => w.length >= 2).slice(0, 3).join(' ')

// 네이버 뉴스 댓글: 제목으로 검색 → 네이버 기사 중 댓글 많은 것의 공감순 댓글
async function naverComments(title) {
  try {
    const q = encodeURIComponent(keyword(title))
    const r = await fetch(`https://openapi.naver.com/v1/search/news.json?query=${q}&display=20&sort=sim`, {
      headers: { 'X-Naver-Client-Id': env.NAVER_CLIENT_ID, 'X-Naver-Client-Secret': env.NAVER_CLIENT_SECRET },
    })
    const items = (await r.json()).items || []
    let best = []
    for (const it of items.filter((x) => /article\/(\d+)\/(\d+)/.test(x.link)).slice(0, 6)) {
      const [, oid, aid] = it.link.match(/article\/(\d+)\/(\d+)/)
      try {
        const cb = await fetch(
          `https://apis.naver.com/commentBox/cbox/web_naver_list_jsonp.json?ticket=news&pool=cbox5&lang=ko&country=KR&objectId=news${oid}%2C${aid}&pageSize=15&page=1&sort=FAVORITE`,
          { headers: { 'User-Agent': UA, Referer: `https://n.news.naver.com/mnews/article/${oid}/${aid}` } },
        )
        const j = JSON.parse((await cb.text()).replace(/^[^(]*\(/, '').replace(/\);?\s*$/, ''))
        const list = (j?.result?.commentList || [])
          .map((c) => ({ t: clean(c.contents), s: c.sympathyCount || 0 }))
          .filter((c) => c.t.length > 5)
        if (list.length > best.length) best = list
        if (best.length >= 10) break
      } catch {}
    }
    return best.slice(0, 12).map((c) => `(공감${c.s}) ${c.t}`)
  } catch {
    return []
  }
}

// 중요한 사건(중요도 6+) 대상, 댓글이 모일 만한 것 위주
const targets = feed.events.filter((ev) => (ev.importance ?? 0) >= 6).slice(0, 16)
console.log(`네티즌 반응 수집 대상: ${targets.length}개 사건`)
const out = {}
for (const ev of targets) {
  const comments = await naverComments(ev.title)
  if (comments.length) out[ev.id] = { title: ev.title, comments }
  console.log(`  · ${ev.title.slice(0, 26)} → 댓글 ${comments.length}개`)
}
writeFileSync(join(ROOT, '_reactions.json'), JSON.stringify(out, null, 1), 'utf8')
console.log(`✅ _reactions.json 저장 (${Object.keys(out).length}개 사건)`)
