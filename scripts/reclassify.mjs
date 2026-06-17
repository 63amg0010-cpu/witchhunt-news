// 현재 public/feed.json 사건들의 분야를 내용 기반으로 다시 분류 (오분류 교정)
import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { classifyCategory } from './lib-category.mjs'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const feedPath = join(ROOT, 'public', 'feed.json')
const feed = JSON.parse(readFileSync(feedPath, 'utf8'))

let changed = 0
for (const ev of feed.events) {
  const next = classifyCategory(ev.title, ev.summary, ev.category)
  if (next !== ev.category) {
    console.log(`  ${ev.category} → ${next} | ${ev.title.slice(0, 40)}`)
    ev.category = next
    changed++
  }
}
writeFileSync(feedPath, JSON.stringify(feed, null, 1), 'utf8')
console.log(`✅ 분야 재분류 완료 — ${changed}건 변경 / 전체 ${feed.events.length}개`)
