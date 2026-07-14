// feed.json의 각 사건 대표기사 본문을 모아 _articles.json 으로 저장 (AI 요약 입력용)
import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { fetchRetry, sleep } from './lib-fetch.mjs'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const feed = JSON.parse(readFileSync(join(ROOT, 'public', 'feed.json'), 'utf8'))

// 실패 이유를 남겨두면(아래 로그) 자동화가 왜 본문을 못 받았는지 다음에 바로 안다.
const failed = []

async function getText(url, id) {
  if (!url) {
    failed.push(`${id}: 주소 없음`)
    return ''
  }
  try {
    // 자동화 회차에서 fetch가 일시적으로 죽는 일이 있어 재시도한다(3회, 각 15초)
    const r = await fetchRetry(
      url,
      { redirect: 'follow', headers: { 'User-Agent': 'Mozilla/5.0 (compatible; HannunBot/1.0)' } },
      { retries: 3, timeoutMs: 15000 },
    )
    const html = await r.text()
    return html
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&[a-zA-Z#0-9]+;/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 1600)
  } catch (e) {
    failed.push(`${id}: ${e?.cause?.message || e?.message || e}`)
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
  const text = await getText(ev._repUrl || ev.imageSourceUrl, ev.id)
  out.push({ id: ev.id, title: ev.title, text })
  await sleep(300) // 연달아 때리지 않게 짧은 텀 (연결이 끊기는 것 방지)
}
writeFileSync(join(ROOT, '_articles.json'), JSON.stringify(out, null, 1), 'utf8')

const ok = out.filter((x) => x.text && x.text.length > 0).length
console.log(`✅ _articles.json 저장 (새 사건 ${out.length}건 / 전체 ${feed.events.length}건)`)
console.log(`   본문 확보 ${ok}/${out.length}건`)
if (failed.length) {
  console.log(`⚠️ 본문 실패 ${failed.length}건 (원인):`)
  for (const f of failed) console.log(`   - ${f}`)
}
