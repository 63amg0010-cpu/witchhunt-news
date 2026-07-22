// =====================================================================
// 이슈 해설 대상 고르기 + 자료 수집 → _issue_in.json
//   - 이미 해설이 있는 이슈는 건너뛴다(매 회차 새로 쓰지 않음 = 토큰 절약).
//   - 아직 해설 없는 '큰 이슈'만 최대 2건 뽑아 기사 본문까지 모은다.
//   - 특정 사건을 지정해 만들고 싶으면:  node scripts/build-issues.mjs <eventId>
// =====================================================================
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { fetchRetry, sleep } from './lib-fetch.mjs'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const feed = JSON.parse(readFileSync(join(ROOT, 'public', 'feed.json'), 'utf8'))

const MAX_NEW = 2 // 한 회차에 새로 쓸 해설 수 (해설은 길어서 조금씩만)

// 이미 해설이 있는 사건은 다시 만들지 않는다
let coveredIds = new Set()
const issuesPath = join(ROOT, 'public', 'issues.json')
if (existsSync(issuesPath)) {
  try {
    const cur = JSON.parse(readFileSync(issuesPath, 'utf8'))
    coveredIds = new Set((cur.issues || []).map((x) => x.eventId).filter(Boolean))
  } catch { /* 깨져 있으면 새로 시작 */ }
}

async function body(url) {
  if (!url) return ''
  try {
    const r = await fetchRetry(url, { redirect: 'follow', headers: { 'User-Agent': 'Mozilla/5.0 (compatible; HannunBot/1.0)' } }, { retries: 3, timeoutMs: 15000 })
    const h = await r.text()
    return h
      .replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<[^>]+>/g, ' ').replace(/&[a-zA-Z#0-9]+;/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 2200)
  } catch { return '' }
}

// 고를 사건: (지정이 있으면 그것) / 없으면 '보도량·중요도 높고 아직 해설 없는' 사건
const wanted = process.argv[2]
let picked = []
if (wanted) {
  const e = feed.events.find((x) => x.id === wanted)
  if (e) picked = [e]
  else console.log(`⚠️ 지정한 사건(${wanted})을 피드에서 못 찾음`)
} else {
  picked = feed.events
    .filter((e) => !coveredIds.has(e.id))
    .filter((e) => (e.importance ?? 0) >= 6 || (e.outletCount ?? 0) >= 10) // 해설할 만큼 큰 이슈만
    .sort((a, b) => ((b.importance ?? 0) * 10 + (b.outletCount ?? 0)) - ((a.importance ?? 0) * 10 + (a.outletCount ?? 0)))
    .slice(0, MAX_NEW)
}

const out = []
for (const e of picked) {
  const main = await body(e._repUrl || e.imageSourceUrl)
  await sleep(300)
  const other = e.articles.find((a) => a.lean === 'cons') || e.articles.find((a) => a.lean === 'prog')
  const otherText = other ? await body(other.url) : ''
  await sleep(300)
  out.push({
    eventId: e.id, category: e.category, title: e.title,
    summary: e.summary || '', background: e.background || '',
    outletCount: e.outletCount,
    articleTitles: (e.articles || []).slice(0, 10).map((a) => `[${a.lean}/${a.outlet}] ${a.title}`),
    mainText: main, otherText,
  })
  console.log(`  ${e.id} 본문 ${main.length}자 / 보조 ${otherText.length}자 | ${e.title.slice(0, 30)}`)
}

writeFileSync(join(ROOT, '_issue_in.json'), JSON.stringify(out, null, 1), 'utf8')
console.log(`✅ _issue_in.json 저장 (해설 만들 이슈 ${out.length}건 / 이미 해설 있는 이슈 ${coveredIds.size}건은 건너뜀)`)
