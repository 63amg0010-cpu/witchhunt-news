// feed.json의 각 사건 대표기사 본문을 모아 _articles.json 으로 저장 (AI 요약 입력용)
import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { fetchRetry, sleep } from './lib-fetch.mjs'
import { pickContrast } from './lib-contrast.mjs'
import { summaryBroken } from './lib-quality.mjs'

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
//  ② 요약이 깨진 사건
//  ③ 진영별 논조(views)가 아직 없는데 '비교 가능한'(진영 2개 이상) 사건 → 논조 채울 기회 부여
//     (진영이 하나뿐이라 비교 자체가 불가능한 사건은 영원히 대상이 되지 않게 걸러낸다)
// 코덱스가 항목별 품질을 유지할 수 있도록 회차당 후속 보완 대상 수를 제한한다.
const TARGET_MAX = 20
const needsViews = (ev) => {
  if (ev.views) return false
  const { left, right } = pickContrast(ev)
  return !!(left && right)
}
//  ④ 요약이 'AI 요약'이 아니라 네이버 원문조각(문장 안 끝남·HTML코드·이중공백)인 사건 → 다시 요약
//     (수집 실패 회차에 원문조각으로 들어온 요약이 계속 남는 것을 자동 치유)
//     판정 기준은 push-feed의 배포 제외 기준과 같아야 하므로 lib-quality에 모아 뒀다.
const newTargets = feed.events.filter((ev) => !ev.background)
const brokenSummaryTargets = feed.events.filter((ev) => ev.background && summaryBroken(ev))
// ⚠️ 상한은 '우선대상에도' 적용한다. 예전엔 새 사건+깨진 요약이 무제한이라 30건 넘게 몰렸고,
//    그러면 codex가 제한 시간 안에 아무것도 못 써서 회차 전체가 실패하는 악순환이 났다.
const priorityAll = [...newTargets, ...brokenSummaryTargets]
const priorityTargets = priorityAll.slice(0, TARGET_MAX)
const prioritizedIds = new Set(priorityTargets.map((ev) => ev.id))
// 후속 보완 대상은 논조 백로그만 남기며, 남는 자리에서만 처리한다.
const viewBacklog = feed.events.filter((ev) => !prioritizedIds.has(ev.id) && needsViews(ev))
const remainingSlots = Math.max(0, TARGET_MAX - priorityTargets.length)
const viewTargets = viewBacklog.slice(0, remainingSlots)
const targets = [...priorityTargets, ...viewTargets]
const deferredPriority = priorityAll.length - priorityTargets.length
const deferredViews = viewBacklog.length - viewTargets.length

if (deferredPriority > 0) {
  console.log(`ℹ️ 요약 대상 ${priorityAll.length}건 중 ${deferredPriority}건은 다음 회차로 미룸(상한 ${TARGET_MAX})`)
}
if (deferredViews > 0) {
  console.log(`ℹ️ 논조 백로그 ${viewBacklog.length}건 중 ${deferredViews}건은 다음 회차로 미룸`)
}

const out = []
for (const ev of targets) {
  const text = await getText(ev._repUrl || ev.imageSourceUrl, ev.id)
  const item = { id: ev.id, title: ev.title, text }

  // ★ 진영별 논조용: 가장 벌어진 두 진영의 대표기사 본문도 함께 받아온다.
  //   (AI가 이 둘을 읽고 "진보 매체는 ~라고 본다 / 보수 매체는 ~라고 본다"를 씀)
  const { left, right } = pickContrast(ev)
  if (left && right) {
    await sleep(300)
    const leftText = await getText(left.url, `${ev.id}(${left.lean})`)
    await sleep(300)
    const rightText = await getText(right.url, `${ev.id}(${right.lean})`)
    if (leftText || rightText) {
      item.views = {
        left: { lean: left.lean, outlet: left.outlet, title: left.title, text: leftText },
        right: { lean: right.lean, outlet: right.outlet, title: right.title, text: rightText },
      }
    }
  }

  out.push(item)
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
