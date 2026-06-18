// _summaries.json(AI 요약)을 public/feed.json에 합쳐 넣는다.
import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const feedPath = join(ROOT, 'public', 'feed.json')
const feed = JSON.parse(readFileSync(feedPath, 'utf8'))

// 코덱스 출력이 ```json 펜스나 앞뒤 잡텍스트를 포함해도 JSON만 뽑아낸다 (BOM 포함 처리)
let rawSum = readFileSync(join(ROOT, '_summaries.json'), 'utf8')
const s0 = rawSum.indexOf('{')
const s1 = rawSum.lastIndexOf('}')
if (s0 >= 0 && s1 > s0) rawSum = rawSum.slice(s0, s1 + 1)
const summaries = JSON.parse(rawSum)

// 값은 두 가지 형태를 모두 허용:
//   "요약문"                                              (요약만)
//   { "summary": "...", "background": "...", "importance": 8 }  (요약+배경+중요도)
let n = 0
for (const ev of feed.events) {
  const v = summaries[ev.id]
  if (!v) continue
  if (typeof v === 'string') {
    if (v.trim()) ev.summary = v.trim()
  } else if (typeof v === 'object') {
    if (v.summary && v.summary.trim()) ev.summary = v.summary.trim()
    if (v.background && v.background.trim()) ev.background = v.background.trim()
    if (typeof v.importance === 'number') ev.importance = v.importance
    // 네티즌 반응 (네이버 뉴스 댓글 요약) — 문자열, 있을 때만
    if (typeof v.publicTake === 'string' && v.publicTake.trim()) ev.publicTake = v.publicTake.trim()
  }
  if (ev.summary && ev.articles && ev.articles[0]) ev.articles[0].summary = ev.summary
  n++
}

feed.events.sort((a, b) => {
  const ai = typeof a.importance === 'number' ? a.importance : 0
  const bi = typeof b.importance === 'number' ? b.importance : 0
  if (ai !== bi) return bi - ai
  return (b.outletCount || 0) - (a.outletCount || 0)
})

feed.summarizedAt = new Date().toISOString()
writeFileSync(feedPath, JSON.stringify(feed, null, 1), 'utf8')
console.log(`✅ AI 요약 ${n}건 적용 완료 (전체 ${feed.events.length} 사건)`)
