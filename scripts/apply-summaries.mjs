// _summaries.json(AI 요약)을 public/feed.json에 합쳐 넣는다.
import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { pickContrast } from './lib-contrast.mjs'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const feedPath = join(ROOT, 'public', 'feed.json')
const feed = JSON.parse(readFileSync(feedPath, 'utf8'))

// 코덱스 출력이 ```json 펜스나 앞뒤 잡텍스트를 포함해도 JSON만 뽑아낸다 (BOM 포함 처리)
let rawSum = readFileSync(join(ROOT, '_summaries.json'), 'utf8')
const s0 = rawSum.indexOf('{')
const s1 = rawSum.lastIndexOf('}')
if (s0 >= 0 && s1 > s0) rawSum = rawSum.slice(s0, s1 + 1)
const summaries = JSON.parse(rawSum)

// ⚠️ 인코딩 깨짐 차단: 코덱스가 _summaries.json을 저장할 때 환경(윈도우 코드페이지) 문제로
// 한글이 '?'로 바뀌어 들어오는 경우가 있다. 물음표가 많은(=깨진) 텍스트는 적용하지 않는다.
const isCorrupt = (s) => {
  if (typeof s !== 'string') return false
  const q = (s.match(/\?/g) || []).length
  return q >= 3 && q / s.length > 0.15
}
const ok = (s) => typeof s === 'string' && s.trim() && !isCorrupt(s)

// 코덱스 요약에 남은 HTML 기호 엔티티(&#34; &#039; &quot; 등)를 진짜 문자로 바꾼다.
function decodeEntities(s) {
  if (typeof s !== 'string') return s
  return s
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/&#x([0-9a-fA-F]+);/g, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(parseInt(d, 10)))
    .replace(/&amp;/g, '&')
}

// 값은 두 가지 형태를 모두 허용:
//   "요약문"                                              (요약만)
//   { "summary": "...", "background": "...", "importance": 8 }  (요약+배경+중요도)
let n = 0
let skipped = 0
for (const ev of feed.events) {
  const v = summaries[ev.id]
  if (!v) continue
  if (typeof v === 'string') {
    if (ok(v)) ev.summary = decodeEntities(v.trim())
    else if (v.trim()) skipped++
  } else if (typeof v === 'object') {
    if (ok(v.summary)) ev.summary = decodeEntities(v.summary.trim())
    else if (v.summary && v.summary.trim()) skipped++
    if (ok(v.background)) ev.background = decodeEntities(v.background.trim())
    if (typeof v.importance === 'number') ev.importance = v.importance
    if (typeof v.category === 'string' && ['정치', '경제', '사회', '국제', '주식', '크립토', '예측시장'].includes(v.category)) ev.category = v.category
    // 네티즌 반응: 코덱스가 '구체적인 한 줄'을 주면 그것으로 덮어쓰고(무엇에 대한 어떤 반응),
    // 없으면 fetch-reactions.mjs가 미리 넣어둔 '일반 분위기 한 줄'이 그대로 남는다(안전망).
    if (ok(v.publicTake)) ev.publicTake = decodeEntities(v.publicTake.trim())
  }
  if (ev.summary && ev.articles && ev.articles[0]) ev.articles[0].summary = ev.summary
  n++
}
if (skipped) console.log(`⚠️ 인코딩 깨진 요약 ${skipped}건 건너뜀(원본 유지)`)

// 기사 번호(id)를 사건 안에서 고유하게 — 합치기로 같은 번호가 겹쳐 React key 충돌나는 것 방지(안전망)
for (const ev of feed.events) {
  if (Array.isArray(ev.articles)) ev.articles.forEach((a, i) => { a.id = `${ev.id}-a${i}` })
}

// ★ 진영별 논조(views) 적용 — 기사 id가 확정된 뒤에 넣어야 '근거 기사 링크'가 어긋나지 않는다.
//   AI는 viewLeft/viewRight 문장만 주고, 어느 진영·매체·기사인지는 여기서 규칙대로 채운다.
let vn = 0
for (const ev of feed.events) {
  const v = summaries[ev.id]
  if (!v || typeof v !== 'object') continue
  if (!ok(v.viewLeft) || !ok(v.viewRight)) continue
  const { left, right } = pickContrast(ev)
  if (!left || !right) continue
  ev.views = {
    left: { lean: left.lean, outlet: left.outlet, articleId: left.id, text: decodeEntities(v.viewLeft.trim()) },
    right: { lean: right.lean, outlet: right.outlet, articleId: right.id, text: decodeEntities(v.viewRight.trim()) },
  }
  if (ok(v.issue)) ev.views.issue = decodeEntities(v.issue.trim()) // 쟁점 한 줄(있으면)
  vn++
}
if (vn) console.log(`✅ 진영별 논조 ${vn}건 적용`)

// ★ 논조 링크 자동 치유 — build-feed가 사건을 새로 묶으면 기사 번호가 바뀌어
//   기존에 붙어있던 views의 articleId가 어긋난다. 매번 현재 기사에 맞게 다시 연결한다.
//   (같은 진영·매체 기사로 재매칭, 그 진영 기사가 아예 없어졌으면 논조를 통째로 뗀다)
let relinked = 0, viewsDropped = 0
for (const ev of feed.events) {
  if (!ev.views) continue
  const ids = new Set((ev.articles || []).map((a) => a.id))
  let broke = false
  for (const side of ['left', 'right']) {
    const v = ev.views[side]
    if (!v) { broke = true; break }
    if (ids.has(v.articleId)) continue
    const m = ev.articles.find((a) => a.lean === v.lean && a.outlet === v.outlet)
      || ev.articles.find((a) => a.lean === v.lean)
    if (m) { v.articleId = m.id; v.outlet = m.outlet; relinked++ }
    else { broke = true; break }
  }
  if (broke) { delete ev.views; viewsDropped++ }
}
if (relinked || viewsDropped) console.log(`🔗 논조 링크 재연결 ${relinked}건 / 진영 없어져 제거 ${viewsDropped}건`)

feed.events.sort((a, b) => {
  const ai = typeof a.importance === 'number' ? a.importance : 0
  const bi = typeof b.importance === 'number' ? b.importance : 0
  if (ai !== bi) return bi - ai
  return (b.outletCount || 0) - (a.outletCount || 0)
})

const summarizedAt = new Date().toISOString()
feed.summarizedAt = summarizedAt
for (const ev of feed.events) ev.summarizedAt = summarizedAt
writeFileSync(feedPath, JSON.stringify(feed, null, 1), 'utf8')
console.log(`✅ AI 요약 ${n}건 적용 완료 (전체 ${feed.events.length} 사건)`)
