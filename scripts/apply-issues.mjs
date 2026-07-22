// =====================================================================
// AI가 쓴 이슈 해설(_issue_out.json)을 public/issues.json에 합친다.
//   - 새 해설은 앞에, 기존 해설은 뒤에 (최신순)
//   - 오래된 해설(KEEP_DAYS 초과)은 자동 정리, 최대 MAX_KEEP건 유지
//   - AI가 한글을 '?'로 깨서 저장한 경우는 적용하지 않는다(안전망)
// =====================================================================
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const KEEP_DAYS = 3 // 해설은 뉴스보다 오래 유효(이슈는 며칠 감)
const MAX_KEEP = 8

const issuesPath = join(ROOT, 'public', 'issues.json')
const outPath = join(ROOT, '_issue_out.json')

let incoming = []
if (existsSync(outPath)) {
  try {
    let raw = readFileSync(outPath, 'utf8')
    const s0 = raw.indexOf('['), s1 = raw.lastIndexOf(']')
    if (s0 >= 0 && s1 > s0) raw = raw.slice(s0, s1 + 1)
    incoming = JSON.parse(raw)
  } catch (e) {
    console.warn('⚠️ _issue_out.json 읽기 실패:', e.message)
  }
}

// 한글 깨짐(물음표 범벅) 차단
const corrupt = (s) => {
  if (typeof s !== 'string') return false
  const q = (s.match(/\?/g) || []).length
  return q >= 3 && q / s.length > 0.15
}
const valid = (x) =>
  x && x.title && x.oneLine && x.whatHappened && x.meaning && x.impact && x.watch &&
  Array.isArray(x.intents) && x.intents.length >= 2 &&
  ![x.title, x.oneLine, x.whatHappened, x.meaning, x.impact, x.watch].some(corrupt)

const NOW = new Date().toISOString()
const fresh = incoming.filter(valid).map((x) => ({ ...x, terms: x.terms || [], createdAt: x.createdAt || NOW }))
if (incoming.length !== fresh.length) console.log(`⚠️ 형식 이상/깨짐 ${incoming.length - fresh.length}건 제외`)

// 기존 해설 불러오기
let existing = []
if (existsSync(issuesPath)) {
  try { existing = JSON.parse(readFileSync(issuesPath, 'utf8')).issues || [] } catch { /* 무시 */ }
}

// 합치기: 새 것 우선, 같은 사건은 새 것으로 교체
const seen = new Set(fresh.map((x) => x.eventId).filter(Boolean))
const merged = [...fresh, ...existing.filter((x) => !x.eventId || !seen.has(x.eventId))]

// 오래된 것 정리 + 개수 제한
const cutoff = Date.now() - KEEP_DAYS * 24 * 60 * 60 * 1000
const kept = merged
  .filter((x) => !x.createdAt || Date.parse(x.createdAt) >= cutoff)
  .slice(0, MAX_KEEP)

writeFileSync(issuesPath, JSON.stringify({ generatedAt: NOW, issues: kept }, null, 1), 'utf8')
console.log(`✅ 이슈 해설 저장 — 새로 ${fresh.length}건 추가 / 전체 ${kept.length}건 유지 (오래된 ${merged.length - kept.length}건 정리)`)
