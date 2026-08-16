// 진보 RSS 기사가 현재 사건에 왜 붙지 않는지 읽기 전용으로 측정한다.
// 실행: node scripts/diagnose-prog.mjs
// 이 파일은 public/feed.json을 포함해 어떤 파일도 쓰지 않는다.
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const MAX_AGE = 14 * 24 * 60 * 60 * 1000

// build-feed.mjs의 진보 RSS 목록과 동일하다. 진단은 API 키 없이 이 RSS만 사용한다.
const PROG_FEEDS = [
  { outlet: '한겨레', category: '정치', url: 'https://www.hani.co.kr/rss/politics/' },
  { outlet: '한겨레', category: '경제', url: 'https://www.hani.co.kr/rss/economy/' },
  { outlet: '한겨레', category: '사회', url: 'https://www.hani.co.kr/rss/society/' },
  { outlet: '한겨레', category: '국제', url: 'https://www.hani.co.kr/rss/international/' },
  { outlet: '경향신문', category: '정치', url: 'https://www.khan.co.kr/rss/rssdata/politic_news.xml' },
  { outlet: '경향신문', category: '경제', url: 'https://www.khan.co.kr/rss/rssdata/economy_news.xml' },
  { outlet: '경향신문', category: '사회', url: 'https://www.khan.co.kr/rss/rssdata/society_news.xml' },
  { outlet: '경향신문', category: '국제', url: 'https://www.khan.co.kr/rss/rssdata/kh_world.xml' },
  { outlet: '오마이뉴스', category: '사회', url: 'http://rss.ohmynews.com/rss/ohmynews.xml' },
  { outlet: '오마이뉴스', category: '정치', url: 'http://rss.ohmynews.com/rss/politics.xml' },
  { outlet: '프레시안', category: '사회', url: 'https://www.pressian.com/api/v3/site/rss/news' },
  { outlet: '프레시안', category: '정치', url: 'https://www.pressian.com/api/v3/site/rss/section/65' },
  { outlet: '미디어오늘', category: '사회', url: 'http://www.mediatoday.co.kr/rss/allArticle.xml' },
]

// 아래 토큰화·RSS 파싱·매칭 규칙은 export되지 않은 build-feed.mjs와 같게 복사했다.
// 원본 규칙이 바뀌면 이 블록도 함께 맞춰야 진단 수치가 의미를 가진다.
const STOP = new Set(['있다','없다','대한','위해','관련','이번','오늘','내일','우리','지난','다시','최근','대해','통해','종합','속보','단독','영상','사진','기자','뉴스','오전','오후','그는','했다','한다','된다','밝혀','전했다','예정','전망','계획','입장','상황','대상','경우','문제','추진','발표','금리','인상','인하','종전','물가','환율','증시','시장','경제','달러','주가','코스피','지수','여부','변수','월드컵','조별리그','32강','16강','8강','4강','탈락','진출','예선','본선','승부','경기'])
// 시기·기간 표현은 사건이 언제 일어났는지만 가리켜 사건을 구분하지 못하므로 날씨 기사가 사고 기사에 붙는 식의 오매칭을 일으킨다.
const MATCH_STOP = new Set(['이재명', '대통령', '정부', '국민', '한국', '우리', '오늘', '당원', '의혹', '간부', '위원장', '조사', '논란', '만에', '이후', '당일', '직후', '연휴', '광복절', '명절', '설날', '추석', '주말', '휴일', '오전', '오후', '새벽', '저녁', '올해', '내년', '지난해', '상반기', '하반기', '전국'])
const PARTICLES2 = ['으로써', '에게서', '으로', '에서', '에게', '한테', '까지', '부터', '조차', '마저', '이라', '라고', '이나', '에는', '에도', '으론', '과의', '와의', '로의', '라는']
const PARTICLES1 = ['은', '는', '이', '가', '을', '를', '에', '의', '로', '와', '과', '도', '만', '서', '나', '며']
const stripHtml = (s) => s.replace(/<[^>]*>/g, '').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').trim()
function tokenize(s) {
  const out = new Set()
  for (const r of s.replace(/[^가-힣a-zA-Z0-9]+/g, ' ').split(' ')) {
    const t = r.trim()
    if (t.length >= 2 && !STOP.has(t) && !/^\d+$/.test(t)) out.add(t)
  }
  return out
}
function stem(t) {
  if (t.length <= 2) return t
  for (const p of PARTICLES2) if (t.length - p.length >= 2 && t.endsWith(p)) return t.slice(0, -p.length)
  if (PARTICLES1.includes(t.slice(-1))) return t.slice(0, -1)
  return t
}
const stemSet = (s) => new Set([...s].map(stem))
function coreTokens(title) {
  const core = String(title).split(/…|\.\.\./)[0]
  const base = core.replace(/[^가-힣a-zA-Z0-9]+/g, '').length >= 6 ? core : title
  return new Set([...stemSet(tokenize(base))].filter((x) => !MATCH_STOP.has(x)))
}
function parseRss(xml, outlet) {
  const items = []
  for (const block of xml.split(/<item[\s>]/i).slice(1)) {
    const seg = block.split(/<\/item>/i)[0]
    const pick = (tag) => {
      const m = seg.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, 'i'))
      return m ? stripHtml(m[1].replace(/<!\[CDATA\[|\]\]>/g, '')) : ''
    }
    const title = pick('title')
    let url = pick('link')
    if (!url) { const g = seg.match(/<link[^>]*href=["']([^"']+)/i); url = g ? g[1] : '' }
    if (title && url) items.push({ title, url, outlet, lean: 'prog', pubDate: pick('pubDate') || pick('dc:date'), summary: pick('description') })
  }
  return items
}

async function fetchFeed(feed) {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), 15_000)
  try {
    const response = await fetch(feed.url, { redirect: 'follow', signal: ctrl.signal, headers: { 'User-Agent': 'Mozilla/5.0' } })
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    return { feed, articles: parseRss(await response.text(), feed.outlet) }
  } catch (error) {
    console.log(`  [실패] ${feed.outlet}/${feed.category}: ${error.name === 'AbortError' ? '15초 시간 초과' : error.message}`)
    return { feed, articles: [], failed: true }
  } finally {
    clearTimeout(timer)
  }
}

function compare(article, event, tokenDocFreq) {
  const articleTokens = [...stemSet(tokenize(article.title))].filter((t) => !MATCH_STOP.has(t))
  const eventTokens = coreTokens(event.title)
  let shared = []
  let hasRareShared = false
  if (articleTokens.length >= 2 && eventTokens.size >= 2) {
    for (const x of articleTokens) {
      for (const y of eventTokens) {
        if (x === y || (x.length >= 3 && y.includes(x)) || (y.length >= 3 && x.includes(y))) {
          shared.push(x)
          if (tokenDocFreq.get(y) === 1) hasRareShared = true
          break
        }
      }
    }
  }
  return { shared, ratio: shared.length / Math.min(articleTokens.length || 1, eventTokens.size || 1), hasRareShared, articleTokens, eventTokens }
}

function bestCandidate(article, events, tokenDocFreq) {
  let best = null
  for (const event of events) {
    const score = compare(article, event, tokenDocFreq)
    if (!best || score.shared.length > best.score.shared.length) best = { event, score }
  }
  return best
}

const currentRule = (score) => score.shared.length >= 3 || (score.shared.length >= 2 && score.ratio >= 0.5)
const beforeBugRule = (score) => score.shared.length >= 3
const twoWords = (score) => score.shared.length >= 2
const relaxedRatio = (score) => score.shared.length >= 2 && score.ratio >= 0.34
const rareWordRule = (score) => currentRule(score) || (score.shared.length >= 2 && score.hasRareShared)
const finalRule = (score) => score.shared.length >= 3 || (score.shared.length >= 2 && score.hasRareShared)

// enrichWithProg의 실제 제약(한 사건 12개, 같은 매체 1개)을 포함해 순서대로 가상 실행한다.
function simulate(events, articles, accepts, tokenDocFreq) {
  const state = new Map(events.map((e) => [e.id, { count: e.articles.filter((a) => a.lean !== 'prog').length, outlets: new Set(e.articles.filter((a) => a.lean !== 'prog').map((a) => a.outlet)) }]))
  const covered = new Set()
  let attached = 0
  const risk = []
  const attachedArticles = []
  for (const article of articles) {
    if ([...stemSet(tokenize(article.title))].filter((t) => !MATCH_STOP.has(t)).length < 2) continue
    let selected = null
    let selectedScore = null
    for (const event of events) {
      const score = compare(article, event, tokenDocFreq)
      if (accepts(score) && (!selectedScore || score.shared.length > selectedScore.shared.length)) { selected = event; selectedScore = score }
    }
    if (!selected) continue
    const slot = state.get(selected.id)
    if (slot.count >= 12 || slot.outlets.has(article.outlet)) continue
    slot.count++; slot.outlets.add(article.outlet); attached++; covered.add(selected.id)
    attachedArticles.push({ article, event: selected, score: selectedScore })
    if (!currentRule(selectedScore)) risk.push({ article, event: selected, score: selectedScore })
  }
  return { attached, covered: covered.size, risk, attachedArticles }
}

function outletRows(articles, successes) {
  const names = [...new Set(articles.map((a) => a.outlet))]
  return names.map((name) => {
    const total = articles.filter((a) => a.outlet === name).length
    const matched = successes.filter((x) => x.article.outlet === name).length
    return `${name} ${total}건 중 ${matched}건 성공, ${total - matched}건 실패`
  }).join(' / ')
}

const feed = JSON.parse(readFileSync(join(ROOT, 'public', 'feed.json'), 'utf8'))
const events = feed.events || []
const tokenDocFreq = new Map()
for (const event of events) {
  for (const token of coreTokens(event.title)) tokenDocFreq.set(token, (tokenDocFreq.get(token) || 0) + 1)
}
console.log(`진보 기사 매칭 진단 — 현재 사건 ${events.length}건`)
console.log('RSS를 직접 받는 중입니다. 각 피드는 최대 15초까지 기다립니다.')
const results = await Promise.all(PROG_FEEDS.map(fetchFeed))
const received = results.flatMap((r) => r.articles)
const fresh = received.filter((a) => !a.pubDate || (!Number.isNaN(Date.parse(a.pubDate)) && Date.now() - Date.parse(a.pubDate) <= MAX_AGE))
console.log(`\n1. RSS 수집 결과\n- 받은 기사: ${received.length}건 (${outletRows(received, [])})`)
console.log(`- 실제 빌드와 같은 14일 이내 매칭 대상: ${fresh.length}건`)

const current = simulate(events, fresh, currentRule, tokenDocFreq)
console.log(`\n2. 현재 규칙 결과\n- 매칭 성공: ${current.attached}건 / 실패: ${fresh.length - current.attached}건`)
console.log(`- 언론사별: ${outletRows(fresh, current.attachedArticles)}`)
console.log(`- 진보 기사가 붙는 사건: ${current.covered}개 / 전체 ${events.length}개`)

const attachedUrls = new Set(current.attachedArticles.map((x) => x.article.url))
const nearMisses = fresh.map((article) => ({ article, ...bestCandidate(article, events, tokenDocFreq) }))
  .filter((x) => x.score.shared.length === 2 && !attachedUrls.has(x.article.url))
  .sort((a, b) => b.score.ratio - a.score.ratio || a.article.outlet.localeCompare(b.article.outlet, 'ko'))
  .slice(0, 20)
console.log(`\n3. 아깝게 떨어진 기사 상위 ${nearMisses.length}건 (단어 2개가 겹친 경우)`)
if (!nearMisses.length) console.log('- 해당 없음')
for (const { article, event, score } of nearMisses) console.log(`- [${article.outlet}] ${article.title}  ↔  ${event.title}  (겹친 단어 ${score.shared.length}개: ${score.shared.join(', ')})`)

const variants = [
  ['(a0) 고치기 전 실제 운영 규칙', simulate(events, fresh, beforeBugRule, tokenDocFreq)],
  ['(a) 현재 규칙', current],
  ['(b) 겹친 단어 2개 이상', simulate(events, fresh, twoWords, tokenDocFreq)],
  ['(c) 2개 이상 + 비율 0.34 이상', simulate(events, fresh, relaxedRatio, tokenDocFreq)],
  ['(d) 희소 단어 조건 추가', simulate(events, fresh, rareWordRule, tokenDocFreq)],
  ['(e) 최종: 3개 이상 또는 (2개 + 희소 단어)', simulate(events, fresh, finalRule, tokenDocFreq)],
]
console.log('\n4. 문턱 완화 가상 시뮬레이션')
console.log('규칙                         | 붙는 기사 수 | 진보 기사가 붙는 사건 수 | 잘못 붙을 위험 사례 수')
console.log('-----------------------------|-------------|--------------------------|------------------------')
for (const [label, result] of variants) console.log(`${label.padEnd(28)} | ${String(result.attached).padStart(11)} | ${String(result.covered).padStart(24)} | ${String(result.risk.length).padStart(22)}`)
console.log('\n※ 위험 사례 수는 현재 규칙이라면 통과하지 못하지만 완화 규칙에서 붙는 기사 수입니다. 실제 오매칭 여부는 위의 제목 쌍을 보고 판단해야 합니다. (a0)은 버그로 비율 조건이 죽어 있던 실제 운영 상태입니다.')

const rareResult = variants.find(([label]) => label.startsWith('(d)'))[1]
const newlyAttached = rareResult.attachedArticles.filter((x) => !attachedUrls.has(x.article.url))
const beforeBugResult = variants.find(([label]) => label.startsWith('(a0)'))[1]
const beforeBugAttachedUrls = new Set(beforeBugResult.attachedArticles.map((x) => x.article.url))
const ratioFixNewlyAttached = current.attachedArticles.filter((x) => !beforeBugAttachedUrls.has(x.article.url))
console.log(`\n4-1. 비율 조건 버그 수정으로 새로 붙는 기사 ${ratioFixNewlyAttached.length}건`)
if (!ratioFixNewlyAttached.length) console.log('- 해당 없음')
for (const { article, event, score } of ratioFixNewlyAttached) console.log(`- [${article.outlet}] ${article.title} ↔ ${event.title} (겹친 단어: ${score.shared.join(', ')})`)

console.log(`\n5. (d) 희소 단어 조건으로 새로 붙는 기사 ${newlyAttached.length}건`)
if (!newlyAttached.length) console.log('- 해당 없음')
for (const { article, event, score } of newlyAttached) console.log(`- [${article.outlet}] ${article.title} ↔ ${event.title} (겹친 단어: ${score.shared.join(', ')})`)

const finalResult = variants.find(([label]) => label.startsWith('(e)'))[1]
const finalNewlyAttached = finalResult.attachedArticles.filter((x) => !beforeBugAttachedUrls.has(x.article.url))
console.log(`\n6. (e) 최종 규칙이 (a0) 대비 새로 붙이는 기사 ${finalNewlyAttached.length}건`)
if (!finalNewlyAttached.length) console.log('- 해당 없음')
for (const { article, event, score } of finalNewlyAttached) console.log(`- [${article.outlet}] ${article.title} ↔ ${event.title} (겹친 단어: ${score.shared.join(', ')})`)
