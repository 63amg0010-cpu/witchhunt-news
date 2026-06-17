// 현재 public/feed.json의 거의 같은 사건들을 합치고 다시 정렬해 저장한다.
// (요약·배경·중요도는 그대로 유지. 합칠 땐 보도량 큰 사건의 것을 기준으로.)
import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { mergeEvents } from './lib-merge.mjs'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const feedPath = join(ROOT, 'public', 'feed.json')
const feed = JSON.parse(readFileSync(feedPath, 'utf8'))

const before = feed.events.length
feed.events = mergeEvents(feed.events)

// 중요도(×10) + 보도량 점수로 다시 정렬
feed.events.sort((a, b) => {
  const score = (e) => (typeof e.importance === 'number' ? e.importance : 5) * 10 + (e.outletCount || 0)
  return score(b) - score(a)
})

writeFileSync(feedPath, JSON.stringify(feed, null, 1), 'utf8')
console.log(`✅ 합치기 완료: ${before}개 → ${feed.events.length}개`)
