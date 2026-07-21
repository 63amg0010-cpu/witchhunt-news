// =====================================================================
// 뉴스 피드 빌더 (자동 실행용)
// 네이버에서 뉴스 수집 → 같은 사건 묶기 → 대표 사진/설명 → public/feed.json 저장.
// 요약(summary)은 일단 출판사 설명문으로 채워두고, AI 요약은 다음 단계(에이전트)가 덮어쓴다.
//   실행:  node scripts/build-feed.mjs
// =====================================================================
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { mergeEvents } from './lib-merge.mjs'
import { classifyCategory } from './lib-category.mjs'
import { sortForDisplay } from './lib-order.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')
const NOW = new Date().toISOString()
// 한 사건이 피드에 머무는 최대 기간(처음 등장 시점 기준).
// ⚠️ 이게 길면, 같은 사건에 새 기사가 계속 붙어 시간표시만 갱신되면서
//    "어제도 본 뉴스가 오늘도 새 것처럼" 계속 자리를 차지한다. → 1.5일로 짧게 유지.
const KEEP_DAYS = 1.5

// --- .env에서 네이버 키 읽기 ---
function loadEnv() {
  try {
    const raw = readFileSync(join(ROOT, '.env'), 'utf8')
    const env = {}
    for (const line of raw.split('\n')) {
      const m = line.match(/^\s*([A-Z_]+)\s*=\s*(.*)\s*$/)
      if (m) env[m[1]] = m[2].trim()
    }
    return env
  } catch {
    return {}
  }
}
const env = loadEnv()
const NAVER_ID = env.NAVER_CLIENT_ID
const NAVER_SECRET = env.NAVER_CLIENT_SECRET

// --- 관심 키워드 ---
const TOPICS = [
  // 정치
  { id: 'p1', query: '대통령실', category: '정치' },
  { id: 'p2', query: '국회', category: '정치' },
  { id: 'p3', query: '여야 협상', category: '정치' },
  { id: 'p4', query: '외교 안보', category: '정치' },
  { id: 'p5', query: '특검', category: '정치' },
  { id: 'p6', query: '선거', category: '정치' },
  { id: 'p7', query: '검찰개혁', category: '정치' },
  { id: 'p8', query: '국회 원구성', category: '정치' },
  // 경제
  { id: 'e1', query: '기준금리', category: '경제' },
  { id: 'e2', query: '부동산', category: '경제' },
  { id: 'e3', query: '물가', category: '경제' },
  { id: 'e4', query: '환율 증시', category: '경제' },
  { id: 'e5', query: '수출', category: '경제' },
  { id: 'e6', query: '고용 일자리', category: '경제' },
  { id: 'e7', query: '부도', category: '경제' }, // 기업 부도·워크아웃·회생 등 위기 뉴스 포착(키워드 사각지대 보완)
  { id: 'e8', query: '세금 예산', category: '경제' },
  { id: 'e9', query: '한국은행 기준금리', category: '경제' },
  // 사회
  { id: 's1', query: '의대 정원', category: '사회' },
  { id: 's2', query: '검찰 수사', category: '사회' },
  { id: 's3', query: '노동 파업', category: '사회' },
  { id: 's4', query: '교육 정책', category: '사회' },
  { id: 's5', query: '재난 사고', category: '사회' },
  { id: 's6', query: '복지', category: '사회' },
  { id: 's7', query: '전세 사기', category: '사회' },
  { id: 's8', query: '폭염 날씨', category: '사회' },
  // 국제
  { id: 'i1', query: '북한', category: '국제' },
  { id: 'i2', query: '트럼프 미국', category: '국제' },
  { id: 'i3', query: '중국', category: '국제' },
  { id: 'i4', query: '일본', category: '국제' },
  { id: 'i5', query: '중동 정세', category: '국제' },
  { id: 'i6', query: '우크라이나', category: '국제' },
  { id: 'i7', query: '이란', category: '국제' }, // 미국-이란 전쟁 등 이란발 큰 이슈 포착
  { id: 'i8', query: '이스라엘', category: '국제' },
  // 주식
  { id: 'st1', query: '코스피 코스닥', category: '주식' },
  { id: 'st2', query: '증시 종목', category: '주식' },
  { id: 'st3', query: '나스닥 다우', category: '주식' },
  { id: 'st4', query: 'IPO 공모주', category: '주식' },
  // 크립토
  { id: 'cr1', query: '비트코인', category: '크립토' },
  { id: 'cr2', query: '가상자산 코인', category: '크립토' },
  { id: 'cr3', query: '이더리움', category: '크립토' },
  { id: 'cr4', query: '스테이블코인', category: '크립토' },
  // 예측시장
  { id: 'pm1', query: '폴리마켓', category: '예측시장' },
  { id: 'pm2', query: '예측시장 칼시', category: '예측시장' },
  { id: 'pm3', query: 'Kalshi 예측', category: '예측시장' },
  { id: 'pm4', query: 'Polymarket', category: '예측시장' },
  { id: 'pm5', query: 'Kalshi', category: '예측시장' },
  { id: 'pm6', query: '예측시장', category: '예측시장' },
]

// --- 전 진영·분야별 RSS (검색 키워드 사각지대 보강용 1차 후보) ---
const FEEDS = [
  { outlet: '한겨레', lean: 'prog', category: '정치', url: 'https://www.hani.co.kr/rss/politics/' },
  { outlet: '한겨레', lean: 'prog', category: '경제', url: 'https://www.hani.co.kr/rss/economy/' },
  { outlet: '한겨레', lean: 'prog', category: '사회', url: 'https://www.hani.co.kr/rss/society/' },
  { outlet: '한겨레', lean: 'prog', category: '국제', url: 'https://www.hani.co.kr/rss/international/' },
  { outlet: '경향신문', lean: 'prog', category: '정치', url: 'https://www.khan.co.kr/rss/rssdata/politic_news.xml' },
  { outlet: '경향신문', lean: 'prog', category: '경제', url: 'https://www.khan.co.kr/rss/rssdata/economy_news.xml' },
  { outlet: '경향신문', lean: 'prog', category: '사회', url: 'https://www.khan.co.kr/rss/rssdata/society_news.xml' },
  { outlet: '경향신문', lean: 'prog', category: '국제', url: 'https://www.khan.co.kr/rss/rssdata/kh_world.xml' },
  { outlet: '오마이뉴스', lean: 'prog', category: '사회', url: 'http://rss.ohmynews.com/rss/ohmynews.xml' },
  { outlet: '오마이뉴스', lean: 'prog', category: '정치', url: 'http://rss.ohmynews.com/rss/politics.xml' },
  { outlet: '프레시안', lean: 'prog', category: '사회', url: 'https://www.pressian.com/api/v3/site/rss/news' },
  { outlet: '프레시안', lean: 'prog', category: '정치', url: 'https://www.pressian.com/api/v3/site/rss/section/65' },
  { outlet: '미디어오늘', lean: 'prog', category: '사회', url: 'http://www.mediatoday.co.kr/rss/allArticle.xml' },
  { outlet: '연합뉴스', lean: 'center', category: '정치', url: 'https://www.yna.co.kr/rss/politics.xml' },
  { outlet: '연합뉴스', lean: 'center', category: '경제', url: 'https://www.yna.co.kr/rss/economy.xml' },
  { outlet: '연합뉴스', lean: 'center', category: '사회', url: 'https://www.yna.co.kr/rss/society.xml' },
  { outlet: '연합뉴스', lean: 'center', category: '국제', url: 'https://www.yna.co.kr/rss/international.xml' },
  { outlet: 'SBS', lean: 'center', category: '정치', url: 'https://news.sbs.co.kr/news/SectionRssFeed.do?sectionId=01' },
  { outlet: 'SBS', lean: 'center', category: '경제', url: 'https://news.sbs.co.kr/news/SectionRssFeed.do?sectionId=02' },
  { outlet: 'SBS', lean: 'center', category: '사회', url: 'https://news.sbs.co.kr/news/SectionRssFeed.do?sectionId=03' },
  { outlet: 'SBS', lean: 'center', category: '국제', url: 'https://news.sbs.co.kr/news/SectionRssFeed.do?sectionId=07' },
  { outlet: '서울신문', lean: 'center', category: '정치', url: 'https://www.seoul.co.kr/xml/rss/rss_politics.xml' },
  { outlet: '서울신문', lean: 'center', category: '경제', url: 'https://www.seoul.co.kr/xml/rss/rss_economy.xml' },
  { outlet: '서울신문', lean: 'center', category: '사회', url: 'https://www.seoul.co.kr/xml/rss/rss_society.xml' },
  { outlet: '서울신문', lean: 'center', category: '국제', url: 'https://www.seoul.co.kr/xml/rss/rss_international.xml' },
  { outlet: '조선일보', lean: 'cons', category: '정치', url: 'https://www.chosun.com/arc/outboundfeeds/rss/category/politics/?outputType=xml' },
  { outlet: '조선일보', lean: 'cons', category: '경제', url: 'https://www.chosun.com/arc/outboundfeeds/rss/category/economy/?outputType=xml' },
  { outlet: '조선일보', lean: 'cons', category: '사회', url: 'https://www.chosun.com/arc/outboundfeeds/rss/category/national/?outputType=xml' },
  { outlet: '조선일보', lean: 'cons', category: '국제', url: 'https://www.chosun.com/arc/outboundfeeds/rss/category/international/?outputType=xml' },
  { outlet: '동아일보', lean: 'cons', category: '정치', url: 'https://rss.donga.com/politics.xml' },
  { outlet: '동아일보', lean: 'cons', category: '경제', url: 'https://rss.donga.com/economy.xml' },
  { outlet: '동아일보', lean: 'cons', category: '사회', url: 'https://rss.donga.com/national.xml' },
  { outlet: '동아일보', lean: 'cons', category: '국제', url: 'https://rss.donga.com/international.xml' },
  { outlet: '한국경제', lean: 'cons', category: '정치', url: 'https://www.hankyung.com/feed/politics' },
  { outlet: '한국경제', lean: 'cons', category: '경제', url: 'https://www.hankyung.com/feed/economy' },
  { outlet: '한국경제', lean: 'cons', category: '사회', url: 'https://www.hankyung.com/feed/society' },
  { outlet: '한국경제', lean: 'cons', category: '국제', url: 'https://www.hankyung.com/feed/international' },
  { outlet: '세계일보', lean: 'cons', category: '정치', url: 'https://www.segye.com/Articles/RSSList/segye_politic.xml' },
  { outlet: '세계일보', lean: 'cons', category: '경제', url: 'https://www.segye.com/Articles/RSSList/segye_economy.xml' },
  { outlet: '세계일보', lean: 'cons', category: '사회', url: 'https://www.segye.com/Articles/RSSList/segye_society.xml' },
  { outlet: '세계일보', lean: 'cons', category: '국제', url: 'https://www.segye.com/Articles/RSSList/segye_international.xml' },
  { outlet: '뉴시스', lean: 'center', category: '정치', url: 'https://www.newsis.com/RSS/politics.xml' },
  { outlet: '뉴시스', lean: 'center', category: '경제', url: 'https://www.newsis.com/RSS/economy.xml' },
  { outlet: '뉴시스', lean: 'center', category: '사회', url: 'https://www.newsis.com/RSS/society.xml' },
  { outlet: '뉴시스', lean: 'center', category: '국제', url: 'https://www.newsis.com/RSS/international.xml' },
]

// --- 도메인 → 언론사명 + 성향 ---
const DOMAIN_OUTLET = {
  'hani.co.kr': { name: '한겨레', lean: 'prog' },
  'khan.co.kr': { name: '경향신문', lean: 'prog' },
  'ohmynews.com': { name: '오마이뉴스', lean: 'prog' },
  'pressian.com': { name: '프레시안', lean: 'prog' },
  'mediatoday.co.kr': { name: '미디어오늘', lean: 'prog' },
  'newstapa.org': { name: '뉴스타파', lean: 'prog' },
  'vop.co.kr': { name: '민중의소리', lean: 'prog' },
  'imbc.com': { name: 'MBC', lean: 'prog' },
  'yna.co.kr': { name: '연합뉴스', lean: 'center' },
  'yonhapnewstv.co.kr': { name: '연합뉴스TV', lean: 'center' },
  'news1.kr': { name: '뉴스1', lean: 'center' },
  'newsis.com': { name: '뉴시스', lean: 'center' },
  'kbs.co.kr': { name: 'KBS', lean: 'center' },
  'ytn.co.kr': { name: 'YTN', lean: 'center' },
  'sbs.co.kr': { name: 'SBS', lean: 'center' },
  'hankookilbo.com': { name: '한국일보', lean: 'center' },
  'seoul.co.kr': { name: '서울신문', lean: 'center' },
  'kmib.co.kr': { name: '국민일보', lean: 'center' },
  'nocutnews.co.kr': { name: '노컷뉴스', lean: 'center' },
  'jtbc.co.kr': { name: 'JTBC', lean: 'center' },
  'mt.co.kr': { name: '머니투데이', lean: 'center' },
  'asiae.co.kr': { name: '아시아경제', lean: 'center' },
  'heraldcorp.com': { name: '헤럴드경제', lean: 'center' },
  'edaily.co.kr': { name: '이데일리', lean: 'center' },
  'fnnews.com': { name: '파이낸셜뉴스', lean: 'center' },
  'newspim.com': { name: '뉴스핌', lean: 'center' },
  'ajunews.com': { name: '아주경제', lean: 'center' },
  'etoday.co.kr': { name: '이투데이', lean: 'center' },
  'bizwatch.co.kr': { name: '비즈워치', lean: 'center' },
  'bloter.net': { name: '블로터', lean: 'center' },
  'ddaily.co.kr': { name: '디지털데일리', lean: 'center' },
  'zdnet.co.kr': { name: '지디넷코리아', lean: 'center' },
  'sisain.co.kr': { name: '시사IN', lean: 'prog' },
  'joongang.co.kr': { name: '중앙일보', lean: 'center' },
  'joins.com': { name: '중앙일보', lean: 'center' },
  'chosun.com': { name: '조선일보', lean: 'cons' },
  'donga.com': { name: '동아일보', lean: 'cons' },
  'munhwa.com': { name: '문화일보', lean: 'cons' },
  'segye.com': { name: '세계일보', lean: 'cons' },
  'tvchosun.com': { name: 'TV조선', lean: 'cons' },
  'ichannela.com': { name: '채널A', lean: 'cons' },
  'mbn.co.kr': { name: 'MBN', lean: 'cons' },
  'hankyung.com': { name: '한국경제', lean: 'cons' },
  'mk.co.kr': { name: '매일경제', lean: 'cons' },
  'sedaily.com': { name: '서울경제', lean: 'cons' },
  'dt.co.kr': { name: '디지털타임스', lean: 'cons' },
  'dailian.co.kr': { name: '데일리안', lean: 'cons' },
}
function outletFromUrl(url) {
  if (!url) return null
  let host = ''
  try {
    host = new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return null
  }
  for (const d of Object.keys(DOMAIN_OUTLET)) {
    if (host === d || host.endsWith('.' + d)) return DOMAIN_OUTLET[d]
  }
  return null
}

const stripHtml = (s) =>
  s
    .replace(/<[^>]*>/g, '')
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'").replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&')
    .trim()

function timeAgo(pubDate) {
  const t = pubDate ? Date.parse(pubDate) : NaN
  if (Number.isNaN(t)) return '최근'
  const min = Math.floor((Date.now() - t) / 60000)
  if (min < 1) return '방금 전'
  if (min < 60) return `${min}분 전`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `${hr}시간 전`
  return `${Math.floor(hr / 24)}일 전`
}

function toPercent(c) {
  const total = c.prog + c.center + c.cons
  if (total === 0) return { prog: 0, center: 100, cons: 0 }
  const prog = Math.round((c.prog / total) * 100)
  const cons = Math.round((c.cons / total) * 100)
  return { prog, center: 100 - prog - cons, cons }
}

const STOP = new Set(['있다','없다','대한','위해','관련','이번','오늘','내일','우리','지난','다시','최근','대해','통해','종합','속보','단독','영상','사진','기자','뉴스','오전','오후','그는','했다','한다','된다','밝혀','전했다','예정','전망','계획','입장','상황','대상','경우','문제','추진','발표',
  // 너무 일반적이라 서로 다른 사건을 잘못 묶는 경제·시황 단어들 (lib-merge와 동일하게 유지)
  '금리','인상','인하','종전','물가','환율','증시','시장','경제','달러','주가','코스피','지수','여부','변수',
  '월드컵','조별리그','32강','16강','8강','4강','탈락','진출','예선','본선','승부','경기'])
function tokenize(s) {
  const out = new Set()
  for (const r of s.replace(/[^가-힣a-zA-Z0-9]+/g, ' ').split(' ')) {
    const t = r.trim()
    if (t.length >= 2 && !STOP.has(t) && !/^\d+$/.test(t)) out.add(t)
  }
  return out
}
function cluster(cands, qTokens) {
  const clusters = []
  for (const c of cands) {
    const toks = tokenize(c.title)
    for (const q of qTokens) toks.delete(q)
    let best = null, bestScore = 1
    for (const cl of clusters) {
      let shared = 0
      for (const t of toks) if (cl.seed.has(t)) shared++
      if (shared > bestScore) { bestScore = shared; best = cl }
    }
    if (best) best.members.push(c)
    else clusters.push({ seed: toks, members: [c] })
  }
  return clusters.sort((a, b) => b.members.length - a.members.length).map((cl) => cl.members)
}

const MAX_AGE = 14 * 24 * 60 * 60 * 1000
const ageMs = (p) => {
  const t = p ? Date.parse(p) : NaN
  return Number.isNaN(t) ? Infinity : Date.now() - t
}

async function fetchNaver(query) {
  const url = `https://openapi.naver.com/v1/search/news.json?query=${encodeURIComponent(query)}&display=100&sort=date`
  const res = await fetch(url, {
    headers: { 'X-Naver-Client-Id': NAVER_ID, 'X-Naver-Client-Secret': NAVER_SECRET },
  })
  if (!res.ok) throw new Error(`naver ${res.status}`)
  const data = await res.json()
  return (data.items ?? []).map((it) => {
    const link = it.originallink || it.link
    const o = outletFromUrl(link)
    return {
      title: stripHtml(it.title),
      outlet: o?.name ?? '',
      lean: o?.lean ?? 'unknown',
      url: link,
      pubDate: it.pubDate,
      summary: stripHtml(it.description),
    }
  })
}

// 기사 페이지에서 대표사진 + 설명문
async function fetchOg(target) {
  try {
    const ctrl = new AbortController()
    const timer = setTimeout(() => ctrl.abort(), 7000)
    const r = await fetch(target, { redirect: 'follow', signal: ctrl.signal, headers: { 'User-Agent': 'Mozilla/5.0 (compatible; HannunBot/1.0)' } })
    clearTimeout(timer)
    const html = (await r.text()).slice(0, 250000)
    const im = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i) || html.match(/<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["']/i)
    let image = im ? im[1] : ''
    if (image && !/^https?:\/\//i.test(image)) { try { image = new URL(image, target).href } catch { image = '' } }
    const dm = html.match(/<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']*)["']/i) || html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)["']/i)
    const description = dm ? stripHtml(dm[1]) : ''
    return { image, description }
  } catch {
    return { image: '', description: '' }
  }
}

// RSS(XML)에서 기사 목록 뽑기 (CDATA·HTML 엔티티 정리 포함)
function parseRss(xml, outlet) {
  const items = []
  for (const block of xml.split(/<item[\s>]/i).slice(1)) {
    const seg = block.split(/<\/item>/i)[0]
    const pick = (tag) => {
      const m = seg.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, 'i'))
      return m ? stripHtml(m[1].replace(/<!\[CDATA\[|\]\]>/g, '')) : ''
    }
    const title = pick('title')
    let link = pick('link')
    if (!link) { const g = seg.match(/<link[^>]*href=["']([^"']+)/i); link = g ? g[1] : '' }
    if (title && link) {
      items.push({ title, url: link, outlet, lean: 'prog', pubDate: pick('pubDate') || pick('dc:date'), summary: pick('description') })
    }
  }
  return items
}

async function fetchRss(url, outlet) {
  try {
    const ctrl = new AbortController()
    const timer = setTimeout(() => ctrl.abort(), 8000)
    const r = await fetch(url, { redirect: 'follow', signal: ctrl.signal, headers: { 'User-Agent': 'Mozilla/5.0' } })
    clearTimeout(timer)
    return parseRss(await r.text(), outlet)
  } catch {
    return []
  }
}

function logFeedSummary(rows) {
  console.log('RSS 피드 검증 요약')
  for (const r of rows) {
    const status = r.count > 0 ? 'OK' : 'SKIP'
    console.log(`  [${status}] ${r.feed.outlet}/${r.feed.category} ${r.count}건 (${r.total}개 파싱) - ${r.feed.url}`)
  }
}

async function collectFeedPool() {
  const pool = []
  const rows = await Promise.all(FEEDS.map(async (feed) => {
    const articles = await fetchRss(feed.url, feed.outlet)
    const fresh = articles
      .map((a) => ({
        ...a,
        // 날짜 태그가 없는 RSS(한겨레 등)는 날짜를 NOW로 속이지 않고 비워둔다(옛 기사가 최신으로 둔갑 방지). 단, 거르지는 않는다.
        pubDate: a.pubDate && !Number.isNaN(Date.parse(a.pubDate)) ? a.pubDate : undefined,
        outlet: feed.outlet,
        lean: feed.lean,
        category: feed.category,
      }))
      .filter((a) => !a.pubDate || ageMs(a.pubDate) <= MAX_AGE)
    return { feed, total: articles.length, count: fresh.length, articles: fresh }
  }))
  for (const r of rows) pool.push(...r.articles)
  logFeedSummary(rows)
  return pool
}

function modeCategory(members) {
  const counts = new Map()
  for (const m of members) counts.set(m.category, (counts.get(m.category) || 0) + 1)
  const first = members.find((m) => m.category)?.category ?? '사회'
  const max = Math.max(...counts.values(), 0)
  if ((counts.get(first) || 0) === max) return first
  for (const [category, count] of counts) if (count === max) return category
  return first
}

// 사건의 성향 분포·프레임·경고를 기사 목록 기준으로 다시 계산
function recomputeEvent(e) {
  const counts = { prog: 0, center: 0, cons: 0 }
  for (const x of e.articles) counts[x.lean] = (counts[x.lean] || 0) + 1
  e.bias = toPercent(counts)
  const max = Math.max(e.bias.prog, e.bias.center, e.bias.cons)
  const dom = e.bias.prog === max ? 'prog' : e.bias.cons === max ? 'cons' : 'center'
  e.biasWarning = max >= 60 && e.articles.length >= 3 && dom !== 'center'
  e.dominantLean = e.biasWarning ? dom : undefined
  const prog = e.articles.find((x) => x.lean === 'prog')
  const cons = e.articles.find((x) => x.lean === 'cons')
  e.frameProg = prog ? prog.title : '진보 성향으로 분류된 기사가 적습니다.'
  e.frameCons = cons ? cons.title : '보수 성향으로 분류된 기사가 적습니다.'
}

// 너무 흔해서 단독으로 매칭하면 엉뚱한 사건에 붙는 단어들 (이재명·정부 두 개만 겹치는 식)
const MATCH_STOP = new Set([
  '이재명', '대통령', '정부', '국민', '한국', '우리', '오늘', '당원',
  '의혹', '간부', '위원장', '조사', '논란', '만에', '이후', '당일', '직후',
])

// 한국어 조사 제거(간단 어간) — "위원장은/위원장에"→"위원장", "선관위가"→"선관위"로 맞춤
const PARTICLES2 = ['으로써', '에게서', '으로', '에서', '에게', '한테', '까지', '부터', '조차', '마저', '이라', '라고', '이나', '에는', '에도', '으론', '과의', '와의', '로의', '라는']
const PARTICLES1 = ['은', '는', '이', '가', '을', '를', '에', '의', '로', '와', '과', '도', '만', '서', '나', '며']
function stem(t) {
  if (t.length <= 2) return t
  for (const p of PARTICLES2) if (t.length - p.length >= 2 && t.endsWith(p)) return t.slice(0, -p.length)
  if (PARTICLES1.includes(t.slice(-1))) return t.slice(0, -1)
  return t
}
const stemSet = (s) => new Set([...s].map(stem))

// 매칭용 핵심 단어 = 제목의 '…'(또는 ...) 앞 주절만 사용 (뒤 곁가지 문구의 우연 매칭 방지) + 흔한 단어 제외
function coreTokens(title) {
  const core = String(title).split(/…|\.\.\./)[0]
  const base = core.replace(/[^가-힣a-zA-Z0-9]+/g, '').length >= 6 ? core : title
  return new Set([...stemSet(tokenize(base))].filter((x) => !MATCH_STOP.has(x)))
}

// 진보 RSS 기사를 제목이 겹치는 사건에 붙인다 (같은 사건의 진보 시각 보강)
function enrichWithProg(events, progArticles) {
  // 멱등성: 이전에 붙인 진보 기사는 일단 모두 제거하고 현재 RSS·현재 규칙으로 다시 매칭
  for (const e of events) {
    const removedOutlets = new Set(e.articles.filter((a) => a.lean === 'prog').map((a) => a.outlet))
    e.articles = e.articles.filter((a) => a.lean !== 'prog')
    e.outletCount = Math.max(0, (e.outletCount || 0) - removedOutlets.size)
  }
  // 사건은 대표 제목의 '주절'(…앞)만 사용 — 곁가지 문구로 엉뚱한 기사가 붙는 걸 막음
  const evToks = events.map((e) => ({ e, toks: coreTokens(e.title) }))
  let added = 0
  for (const a of progArticles) {
    // 진보 기사는 제목 전체를 사용 (재현율 확보)
    const at = [...stemSet(tokenize(a.title))].filter((t) => !MATCH_STOP.has(t))
    if (at.length < 2) continue
    let best = null
    let bestShared = 0
    for (const { e, toks } of evToks) {
      if (toks.length < 2) continue
      let s = 0
      // 어미·부분 단어도 같은 단어로 인정 (구속영장↔영장, 재선거↔재선거론 등)
      for (const x of at) {
        for (const y of toks) {
          if (x === y || (x.length >= 3 && y.includes(x)) || (y.length >= 3 && x.includes(y))) { s++; break }
        }
      }
      // ⚠️ 단어 2개 우연히 겹치는 것만으로 엉뚱한 기사가 붙던 문제(예: '사망' 같은 흔한 단어) 방지.
      //   3개 이상 겹치면 확실한 같은 사건으로 인정, 2개만 겹치면 '짧은 쪽 제목의 절반 이상'일 때만.
      const ratio = s / Math.min(at.length, toks.length)
      const good = s >= 3 || (s >= 2 && ratio >= 0.5)
      if (good && s > bestShared) { bestShared = s; best = e }
    }
    // 진보는 비교를 위해 자리 제한을 넉넉히(12) — 큰 사건이 이미 8개로 꽉 차도 진보가 들어가게
    if (!best || best.articles.length >= 12) continue
    if (best.articles.some((x) => x.outlet === a.outlet)) continue // 같은 매체 중복 방지
    best.articles.push({
      id: `${best.id}-p${best.articles.length}`,
      outlet: a.outlet, lean: 'prog', title: a.title, url: a.url,
      timeAgo: timeAgo(a.pubDate), summary: a.summary || undefined,
    })
    best.outletCount = (best.outletCount || 0) + 1
    // 붙인 진보 기사가 더 최근이면 사건 시각도 갱신
    const pt = Date.parse(a.pubDate)
    if (!Number.isNaN(pt) && (!best.publishedAt || pt > Date.parse(best.publishedAt))) {
      best.publishedAt = new Date(pt).toISOString()
    }
    added++
  }
  for (const { e } of evToks) recomputeEvent(e)
  return added
}

function buildEvents(topic, cands) {
  const fresh = cands
    .filter((c) => c.lean !== 'unknown')
    .filter((c) => ageMs(c.pubDate) <= MAX_AGE)
    .sort((a, b) => ageMs(a.pubDate) - ageMs(b.pubDate))
  const clusters = cluster(fresh, tokenize(topic.query))
  const events = []
  for (const members of clusters) {
    // 이 사건을 보도한 '전체' 언론사 수(보도량 지표, 8개 상한 없음)
    const coverage = new Set(members.map((c) => c.outlet)).size
    const seen = new Set()
    const picked = []
    for (const c of members) {
      if (seen.has(c.outlet)) continue
      seen.add(c.outlet); picked.push(c)
      if (picked.length >= 8) break
    }
    if (picked.length < 2) continue
    // 사건 시각 = 묶인 기사 중 '가장 최근' 보도 시각 (대표기사가 아니라 최신 기준)
    const newestMs = Math.max(...picked.map((c) => Date.parse(c.pubDate)).filter((t) => !Number.isNaN(t)), 0)
    const newestPub = newestMs > 0 ? new Date(newestMs).toISOString() : undefined
    const counts = { prog: 0, center: 0, cons: 0 }
    for (const c of picked) counts[c.lean]++
    const bias = toPercent(counts)
    const rep = picked.find((c) => c.lean === 'center') ?? picked[0]
    const prog = picked.find((c) => c.lean === 'prog')
    const cons = picked.find((c) => c.lean === 'cons')
    const maxShare = Math.max(bias.prog, bias.center, bias.cons)
    const dominantLean = bias.prog === maxShare ? 'prog' : bias.cons === maxShare ? 'cons' : 'center'
    const biasWarning = maxShare >= 60 && picked.length >= 3 && dominantLean !== 'center'
    const idx = events.length
    events.push({
      id: `${topic.id}-c${idx}`,
      category: topic.category,
      title: rep.title,
      imageUrl: `https://picsum.photos/seed/hannun-${topic.id}-${idx}/640/420`,
      imageSourceUrl: rep.url,
      summary: rep.summary || picked.find((c) => c.summary)?.summary || '',
      outletCount: coverage,
      timeAgo: newestPub ? timeAgo(newestPub) : '최근',
      publishedAt: newestPub,
      bias,
      biasWarning,
      dominantLean: biasWarning ? dominantLean : undefined,
      frameProg: prog ? prog.title : '진보 성향으로 분류된 기사가 적습니다.',
      frameCons: cons ? cons.title : '보수 성향으로 분류된 기사가 적습니다.',
      firstSeen: NOW, // 처음 등장 시각 (누적/3일 유지용)
      articles: picked.map((c, i) => ({
        id: `${topic.id}-c${idx}-a${i}`,
        outlet: c.outlet, lean: c.lean, title: c.title, url: c.url,
        timeAgo: timeAgo(c.pubDate), summary: c.summary || undefined,
      })),
      _repUrl: rep.url, // AI 요약 단계에서 본문 가져올 주소
    })
    if (events.length >= 3) break
  }
  return events
}

function buildEventsFromFeeds(feedPool) {
  const fresh = feedPool
    .filter((c) => c.lean !== 'unknown')
    .filter((c) => ageMs(c.pubDate) <= MAX_AGE)
    .sort((a, b) => ageMs(a.pubDate) - ageMs(b.pubDate))
  const clusters = cluster(fresh, new Set())
  const events = []
  for (const members of clusters) {
    const coverage = new Set(members.map((c) => c.outlet)).size
    if (coverage < 2) continue
    const seen = new Set()
    const picked = []
    for (const c of members) {
      if (seen.has(c.outlet)) continue
      seen.add(c.outlet); picked.push(c)
      if (picked.length >= 8) break
    }
    if (picked.length < 2) continue
    const newestMs = Math.max(...picked.map((c) => Date.parse(c.pubDate)).filter((t) => !Number.isNaN(t)), 0)
    const newestPub = newestMs > 0 ? new Date(newestMs).toISOString() : undefined
    const counts = { prog: 0, center: 0, cons: 0 }
    for (const c of picked) counts[c.lean]++
    const bias = toPercent(counts)
    const rep = picked.find((c) => c.lean === 'center') ?? picked[0]
    const prog = picked.find((c) => c.lean === 'prog')
    const cons = picked.find((c) => c.lean === 'cons')
    const maxShare = Math.max(bias.prog, bias.center, bias.cons)
    const dominantLean = bias.prog === maxShare ? 'prog' : bias.cons === maxShare ? 'cons' : 'center'
    const biasWarning = maxShare >= 60 && picked.length >= 3 && dominantLean !== 'center'
    const idx = events.length
    events.push({
      id: `rss-c${idx}`,
      category: modeCategory(members),
      title: rep.title,
      imageUrl: `https://picsum.photos/seed/hannun-rss-${idx}/640/420`,
      imageSourceUrl: rep.url,
      summary: rep.summary || '',
      outletCount: coverage,
      timeAgo: newestPub ? timeAgo(newestPub) : '최근',
      publishedAt: newestPub,
      bias,
      biasWarning,
      dominantLean: biasWarning ? dominantLean : undefined,
      frameProg: prog ? prog.title : '진보 성향으로 분류된 기사가 없습니다.',
      frameCons: cons ? cons.title : '보수 성향으로 분류된 기사가 없습니다.',
      firstSeen: NOW,
      articles: picked.map((c, i) => ({
        id: `rss-c${idx}-a${i}`,
        outlet: c.outlet, lean: c.lean, title: c.title, url: c.url,
        timeAgo: timeAgo(c.pubDate), summary: c.summary || undefined,
      })),
      _repUrl: rep.url,
    })
  }
  return events
}

async function main() {
  if (!NAVER_ID || !NAVER_SECRET) {
    console.error('❌ .env에 NAVER 키가 없습니다.')
    process.exit(1)
  }
  console.log('뉴스 수집 중...')
  const all = []
  for (const topic of TOPICS) {
    try {
      const cands = await fetchNaver(topic.query)
      all.push(...buildEvents(topic, cands))
    } catch (e) {
      console.warn(`  ! ${topic.query}: ${e.message}`)
    }
  }
  const feedPool = await collectFeedPool()
  const rssEvents = buildEventsFromFeeds(feedPool)
  all.push(...rssEvents)
  console.log(`RSS 1차 후보 사건 ${rssEvents.length}건 생성`)
  // 기존 피드 불러오기 (누적: 어제·이전 사건을 안 지우고 함께 둠)
  let oldEvents = []
  try {
    if (process.env.FRESH) throw new Error('FRESH 빌드: 누적 무시하고 새로 시작')
    const prev = JSON.parse(readFileSync(join(ROOT, 'public', 'feed.json'), 'utf8'))
    oldEvents = (prev.events || []).map((e) => ({
      ...e,
      firstSeen: e.firstSeen || NOW,
      // 예전 합치기 버그로 부풀어 있던 보도량을 정상 범위로 잘라줌(최대 60개 언론사)
      outletCount: Math.min(e.outletCount || 0, 60),
    }))
  } catch {
    /* 기존 피드 없으면 새로 시작 */
  }

  // 새 사건 + 기존 사건 합치기 (같은 사건은 하나로, 요약·배경은 보존)
  const cutoff = Date.now() - KEEP_DAYS * 24 * 60 * 60 * 1000
  // 기사 자체가 너무 오래된 사건은 제외 — 뉴스 적은 분야(크립토·예측시장)를 오래된 기사로
  // 억지로 채우면서 '13일 전 뉴스'가 뜨던 문제 방지. (publishedAt 기준 5일)
  const DISPLAY_MAX_AGE = 1.5 * 24 * 60 * 60 * 1000
  const tooOld = (e) => {
    const p = e.publishedAt ? Date.parse(e.publishedAt) : NaN
    return !Number.isNaN(p) && Date.now() - p > DISPLAY_MAX_AGE
  }
  const merged = mergeEvents([...all, ...oldEvents])
    .filter((e) => !e.firstSeen || Date.parse(e.firstSeen) >= cutoff) // 3일 지난 건 정리
    .filter((e) => !tooOld(e)) // 기사가 5일 넘게 오래된 건 제외(오래된 padding 방지)
    .sort((a, b) => (b.outletCount || 0) - (a.outletCount || 0))

  // 진보 매체 RSS는 위에서 수집한 feedPool을 재사용한다. 같은 피드를 다시 받지 않는다.
  const progArticles = feedPool.filter((a) => a.lean === 'prog')

  // 내용(제목+요약) 기반으로 분야 재분류 — 검색어로만 정하면 엉뚱하게 분류되는 것 교정
  // (예: '중국'으로 찾은 장원영 공항 기사 → 사회). 분야별 균형 맞추기 '전에' 적용.
  for (const ev of merged) {
    ev.category = classifyCategory(ev.title, ev.summary, ev.category)
  }

  // 분야별 최소 보장(각 6개) 후 나머지는 보도량 순으로 채워 전체 40개까지
  const PER_CAT_MIN = 3
  // 뉴스 양이 적은 니치 분야(크립토·예측시장)는 최소를 낮춰, 오래된 기사로 억지로 채우지 않게 함.
  // 사회·경제는 국내 큰 사건이 밀리지 않게 유지.
  const CAT_MIN = { 주식: 4, 크립토: 3, 예측시장: 3, 사회: 5, 경제: 5 }
  // 한 분야 독점 방지 상한. 국제는 전쟁 등 큰 이슈 때 더 담기게 15로 상향.
  const CAT_MAX = { 국제: 15 }
  const minFor = (c) => CAT_MIN[c] ?? PER_CAT_MIN
  const maxFor = (c) => CAT_MAX[c] ?? Infinity
  const TOTAL = 60
  const byCat = {}
  for (const e of merged) (byCat[e.category] ??= []).push(e)
  const picked = []
  const taken = new Set()
  const catCount = {}
  for (const c of Object.keys(byCat)) {
    for (const e of byCat[c].slice(0, minFor(c))) {
      picked.push(e); taken.add(e); catCount[c] = (catCount[c] || 0) + 1
    }
  }
  for (const e of merged) {
    if (picked.length >= TOTAL) break
    if (taken.has(e)) continue
    if ((catCount[e.category] || 0) >= maxFor(e.category)) continue
    picked.push(e); taken.add(e); catCount[e.category] = (catCount[e.category] || 0) + 1
  }
  const events = picked
  // 진보 RSS 기사를 최종 사건들에 붙임 (같은 사건의 진보 시각 보강)
  const progAdded = enrichWithProg(events, progArticles)
  console.log(`진보 RSS ${progArticles.length}건 수집 → 사건에 ${progAdded}건 보강`)
  // 사건 번호(id) 중복 방지: 어제·오늘 사건이 같은 번호를 달고 둘 다 남는 경우를 막는다.
  // (중복이면 -b, -c … 를 붙여 고유하게. 앱에서 엉뚱한 사건이 열리거나 요약이 잘못 적용되는 걸 방지)
  const usedIds = new Set()
  for (const ev of events) {
    if (!usedIds.has(ev.id)) { usedIds.add(ev.id); continue }
    let suffix = 'b'
    while (usedIds.has(`${ev.id}-${suffix}`)) suffix = String.fromCharCode(suffix.charCodeAt(0) + 1)
    ev.id = `${ev.id}-${suffix}`
    usedIds.add(ev.id)
  }
  // 기사 번호(id)도 사건 안에서 고유하게 다시 매김 — 합칠 때 같은 번호가 겹쳐 React key 충돌나는 것 방지
  for (const ev of events) {
    ev.articles.forEach((a, i) => { a.id = `${ev.id}-a${i}` })
  }
  console.log(`새 ${all.length} + 기존 ${oldEvents.length} → 합쳐서 ${merged.length}개 → ${events.length}개 유지. 새 사건 사진/설명 가져오는 중...`)
  // 사진/설명은 아직 없는(새) 사건만 — 기존 사건은 그대로 둠
  for (const ev of events) {
    if (!ev.imageUrl || ev.imageUrl.includes('picsum')) {
      const og = await fetchOg(ev._repUrl)
      if (og.image) ev.imageUrl = og.image
      if (og.description && og.description.length > (ev.summary || '').length) ev.summary = og.description
    }
  }

  // 최신 우선 + 같은 시간대 안에선 중요도·보도량 순으로 정렬
  sortForDisplay(events)

  mkdirSync(join(ROOT, 'public'), { recursive: true })
  const out = { generatedAt: NOW, events }
  writeFileSync(join(ROOT, 'public', 'feed.json'), JSON.stringify(out, null, 1), 'utf8')
  console.log(`✅ public/feed.json 저장 완료 (사건 ${events.length}개)`)
}

main()
