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

// 거친 댓글을 그대로 보여주지 않고, 공감 많은 댓글들의 '전체 분위기'만 중립적인 한 줄로 만든다.
// (AI 없이 단어 신호로 판단 → 자동화에서도 항상 안정적으로 채워짐)
const NEG = ['최악','비판','문제','거짓','선동','사기','분노','화나','한심','답답','불안','우려','반대','무능','위선','어이없','황당','짜증','실망','부끄','폭락','공포','망했','망쳐','망한','쪽팔','역겹','심각','조작','내로남불','퇴진','탄핵','구속','처벌','엉망','형편없','뻔뻔','적반하장','어처구니','거짓말','쇼','코미디','한숨','걱정','불신','속였','속이','거품','세금','나랏돈','빚']
const POS = ['잘했','잘한','환영','다행','응원','기대','희망','좋다','좋네','찬성','지지','박수','든든','감사','훌륭','명품','반갑','잘됐','긍정','성공','자랑','대단','믿음','신뢰','안심']
const hasAny = (text, words) => words.some((w) => text.includes(w))

function moodLine(comments) {
  let neg = 0, pos = 0
  for (const c of comments) {
    const w = Math.max(c.sympathy || 0, 1) // 공감 수로 가중 (최소 1)
    if (hasAny(c.text, NEG)) neg += w
    if (hasAny(c.text, POS)) pos += w
  }
  const total = neg + pos
  if (total === 0) return '댓글마다 의견이 다양하게 엇갈리는 분위기입니다.'
  const negR = neg / total
  if (negR >= 0.7) return '비판적인 반응이 우세한 분위기입니다.'
  if (negR >= 0.55) return '비판적인 의견이 다소 많은 편입니다.'
  if (negR <= 0.3) return '긍정적인 반응이 많은 편입니다.'
  if (negR <= 0.45) return '긍정적인 의견이 다소 많은 편입니다.'
  return '찬반이 팽팽하게 엇갈리는 분위기입니다.'
}

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
    // 공감 많은 순으로 상위 6개까지 {text, sympathy} 형태로
    return best.slice(0, 6).map((c) => ({ text: c.t, sympathy: c.s }))
  } catch {
    return []
  }
}

// 대상: 보도량(언론사 수) 큰 사건 위주 — 중요도(importance)는 코덱스 요약 뒤에야
// 생기므로, 자동화에서 이 단계가 먼저 돌아도 비지 않도록 보도량 기준으로 고른다.
const targets = [...feed.events]
  .sort((a, b) => (b.outletCount || 0) - (a.outletCount || 0))
  .slice(0, 16)
console.log(`네티즌 반응 수집 대상: ${targets.length}개 사건 (보도량 상위)`)

// 옛 방식(댓글 원문) 흔적은 전부 제거하고 시작
for (const ev of feed.events) delete ev.publicComments

const out = {}
let applied = 0
for (const ev of targets) {
  const comments = await naverComments(ev.title)
  if (comments.length >= 3) {
    // 댓글이 충분할 때만 '분위기 한 줄'을 만든다 (너무 적으면 신뢰 어려움)
    const line = moodLine(comments)
    out[ev.id] = { title: ev.title, comments: comments.map((c) => `(공감${c.sympathy}) ${c.text}`), mood: line }
    // ★ 코덱스(AI) 거치지 않고 feed.json에 '분위기 한 줄'을 바로 넣는다.
    ev.publicTake = line
    delete ev.publicComments // 옛 방식(댓글 원문) 흔적 제거
    applied++
  }
  console.log(`  · ${ev.title.slice(0, 26)} → 댓글 ${comments.length}개${comments.length >= 3 ? '' : ' (적어서 건너뜀)'}`)
}

// 참고용 원본(_reactions.json) + feed.json에 직접 반영
writeFileSync(join(ROOT, '_reactions.json'), JSON.stringify(out, null, 1), 'utf8')
writeFileSync(join(ROOT, 'public', 'feed.json'), JSON.stringify(feed, null, 1), 'utf8')
console.log(`✅ 네티즌 반응 ${applied}개 사건에 적용 (feed.json 직접 기록)`)
