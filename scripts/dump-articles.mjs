// feed.json의 각 사건 대표기사 본문을 모아 _articles.json 으로 저장 (AI 요약 입력용)
import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const feed = JSON.parse(readFileSync(join(ROOT, 'public', 'feed.json'), 'utf8'))

async function getText(url) {
  try {
    const ctrl = new AbortController()
    const timer = setTimeout(() => ctrl.abort(), 7000)
    const r = await fetch(url, { redirect: 'follow', signal: ctrl.signal, headers: { 'User-Agent': 'Mozilla/5.0 (compatible; HannunBot/1.0)' } })
    clearTimeout(timer)
    const html = await r.text()
    return html
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&[a-zA-Z#0-9]+;/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 1600)
  } catch {
    return ''
  }
}

// 코덱스에 넘길 사건 고르기:
//  ① 배경이 아직 없는 '새' 사건 (요약 필요)
//  ② 중요한 사건(중요도 7+)인데 '대중의 시각'이 아직 없는 것 (publicTake 채울 기회 부여)
// → 반응 많은 큰 사건(특검 등)은 이미 요약이 있어도 publicTake를 받을 수 있게 됨.
const targets = feed.events.filter(
  (ev) => !ev.background || (!ev.publicTake && (ev.importance ?? 0) >= 7),
)

const out = []
for (const ev of targets) {
  const text = await getText(ev._repUrl || ev.imageSourceUrl)
  out.push({ id: ev.id, title: ev.title, text })
}
writeFileSync(join(ROOT, '_articles.json'), JSON.stringify(out, null, 1), 'utf8')
console.log(`✅ _articles.json 저장 (새 사건 ${out.length}건 / 전체 ${feed.events.length}건)`)
