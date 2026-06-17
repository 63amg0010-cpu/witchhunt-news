// =====================================================================
// 실제 뉴스 → 우리 앱의 "사건(NewsEvent)" 데이터로 변환
// 우선순위: 네이버 검색(요약 있음) → 키가 없거나 실패하면 구글 뉴스(요약 없음)
//
// 핵심: 키워드 검색 결과를 "제목이 비슷한 것끼리" 묶어(클러스터링)
//       진짜 같은 사건만 한 묶음으로 만든다. (2개 이상 언론사가 보도한 묶음만 사용)
// =====================================================================
import type { Article, BiasRatio, Lean, NewsEvent } from '../types'
import { leanOf, outletFromUrl, type OutletLean } from '../data/outletBias'
import { TOPICS, type Topic } from '../data/topics'

// 한 기사를 우리 기준으로 정리한 모양
interface Candidate {
  title: string
  outlet: string
  lean: OutletLean
  url: string
  pubDate: string
  summary: string
}

const photo = (seed: string) => `https://picsum.photos/seed/${seed}/640/420`

// HTML 태그/특수문자를 사람이 읽는 글자로 정리
function stripHtml(s: string): string {
  return s
    .replace(/<[^>]*>/g, '')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .trim()
}

// "3시간 전" 같은 시간 표시
function timeAgo(pubDate: string): string {
  const t = pubDate ? Date.parse(pubDate) : NaN
  if (Number.isNaN(t)) return '최근'
  const min = Math.floor((Date.now() - t) / 60000)
  if (min < 1) return '방금 전'
  if (min < 60) return `${min}분 전`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `${hr}시간 전`
  const day = Math.floor(hr / 24)
  return `${day}일 전`
}

// 사건 시각(ms) 추정: publishedAt(실제 기사 시각) → timeAgo 문자열 → firstSeen 순
function eventTimeMs(e: NewsEvent, now: number): number {
  if (e.publishedAt) {
    const t = Date.parse(e.publishedAt)
    if (!Number.isNaN(t)) return t
  }
  if (e.timeAgo) {
    if (e.timeAgo.includes('방금')) return now
    const m = e.timeAgo.match(/(\d+)\s*(분|시간|일)/)
    if (m) {
      const unit = m[2] === '분' ? 60000 : m[2] === '시간' ? 3600000 : 86400000
      return now - Number(m[1]) * unit
    }
  }
  if (e.firstSeen) {
    const t = Date.parse(e.firstSeen)
    if (!Number.isNaN(t)) return t
  }
  return 0
}

// 최근일수록 촘촘하게 나눈 시간대 묶음 (분 단위 경계)
const BUCKET_MIN = [15, 30, 60, 120, 240, 480, 960, 1440, 2880]
function timeBucket(ms: number, now: number): number {
  const min = (now - ms) / 60000
  for (let i = 0; i < BUCKET_MIN.length; i++) if (min < BUCKET_MIN[i]) return i
  return BUCKET_MIN.length
}

// 홈 정렬: "최신 우선 + 같은 시간대 안에선 중요도·보도량 순"
// (정렬을 앱에서 하므로, 피드 파일이 어떤 순서로 오든 항상 최신순으로 보인다)
function sortForDisplay(events: NewsEvent[], now: number): NewsEvent[] {
  const score = (e: NewsEvent) => (typeof e.importance === 'number' ? e.importance : 5) * 10 + (e.outletCount || 0)
  return [...events].sort((a, b) => {
    const ba = timeBucket(eventTimeMs(a, now), now)
    const bb = timeBucket(eventTimeMs(b, now), now)
    if (ba !== bb) return ba - bb // 최신 시간대 먼저
    return score(b) - score(a) // 같은 시간대 안에선 중요·보도량 큰 순
  })
}

// 진보/중도/보수 개수를 합 100%로 맞추기
function toPercent(counts: { prog: number; center: number; cons: number }): BiasRatio {
  const total = counts.prog + counts.center + counts.cons
  if (total === 0) return { prog: 0, center: 100, cons: 0 }
  const prog = Math.round((counts.prog / total) * 100)
  const cons = Math.round((counts.cons / total) * 100)
  const center = 100 - prog - cons
  return { prog, center, cons }
}

// 너무 오래된 기사는 제외 (최근 며칠까지만)
const MAX_AGE_DAYS = 14
function ageMs(pubDate: string): number {
  const t = pubDate ? Date.parse(pubDate) : NaN
  return Number.isNaN(t) ? Number.POSITIVE_INFINITY : Date.now() - t
}

// 제목에서 흔한·의미 약한 단어 (사건 구분에 도움 안 되는 것)
const STOP = new Set([
  '있다', '없다', '대한', '위해', '관련', '이번', '오늘', '내일', '우리', '지난',
  '다시', '최근', '대해', '통해', '종합', '속보', '단독', '영상', '사진', '기자',
  '뉴스', '오전', '오후', '그는', '했다', '한다', '된다', '밝혀', '전했다', '예정',
  '전망', '계획', '입장', '상황', '대상', '경우', '문제', '추진', '발표',
])

// 제목을 의미있는 단어 묶음으로 쪼갠다
function tokenize(s: string): Set<string> {
  const out = new Set<string>()
  for (const raw of s.replace(/[^가-힣a-zA-Z0-9]+/g, ' ').split(' ')) {
    const t = raw.trim()
    if (t.length >= 2 && !STOP.has(t) && !/^\d+$/.test(t)) out.add(t)
  }
  return out
}

// 제목이 비슷한 기사끼리 묶기(클러스터링).
// queryTokens(키워드 자체 단어)는 모두가 공유하므로 비교에서 제외한다.
function clusterCandidates(cands: Candidate[], queryTokens: Set<string>): Candidate[][] {
  const clusters: { seed: Set<string>; members: Candidate[] }[] = []
  for (const c of cands) {
    const toks = tokenize(c.title)
    for (const q of queryTokens) toks.delete(q)

    let best: { seed: Set<string>; members: Candidate[] } | null = null
    let bestScore = 1 // 2개 이상 겹쳐야 같은 사건으로 본다
    for (const cl of clusters) {
      let shared = 0
      for (const t of toks) if (cl.seed.has(t)) shared++
      if (shared > bestScore) {
        bestScore = shared
        best = cl
      }
    }
    if (best) best.members.push(c)
    else clusters.push({ seed: toks, members: [c] })
  }
  // 보도량 많은(여러 기사) 묶음 먼저
  return clusters.sort((a, b) => b.members.length - a.members.length).map((cl) => cl.members)
}

// 한 묶음(같은 사건) → 사건 1개 만들기
function makeEvent(topic: Topic, idx: number, picked: (Candidate & { lean: Lean })[]): NewsEvent {
  const counts = { prog: 0, center: 0, cons: 0 }
  for (const c of picked) counts[c.lean]++
  const bias = toPercent(counts)

  const articles: Article[] = picked.map((c, i) => ({
    id: `${topic.id}-c${idx}-a${i}`,
    outlet: c.outlet,
    lean: c.lean,
    title: c.title,
    url: c.url,
    timeAgo: timeAgo(c.pubDate),
    summary: c.summary || undefined,
  }))

  const rep = picked.find((c) => c.lean === 'center') ?? picked[0]
  const progArticle = picked.find((c) => c.lean === 'prog')
  const consArticle = picked.find((c) => c.lean === 'cons')

  const maxShare = Math.max(bias.prog, bias.center, bias.cons)
  const dominantLean: Lean =
    bias.prog === maxShare ? 'prog' : bias.cons === maxShare ? 'cons' : 'center'
  const biasWarning = maxShare >= 60 && picked.length >= 3 && dominantLean !== 'center'

  return {
    id: `${topic.id}-c${idx}`,
    category: topic.category,
    title: rep.title,
    imageUrl: photo(`hannun-${topic.id}-${idx}`),
    imageSourceUrl: rep.url, // 대표기사 주소 → 실제 사진(og:image) 가져오기용
    summary: rep.summary || picked.find((c) => c.summary)?.summary || undefined,
    outletCount: picked.length,
    timeAgo: timeAgo(rep.pubDate),
    bias,
    biasWarning,
    dominantLean: biasWarning ? dominantLean : undefined,
    frameProg: progArticle ? progArticle.title : '진보 성향으로 분류된 기사가 적습니다.',
    frameCons: consArticle ? consArticle.title : '보수 성향으로 분류된 기사가 적습니다.',
    articles,
  }
}

// 키워드 하나 → (클러스터링으로) 진짜 사건 여러 개
function buildEventsForTopic(topic: Topic, cands: Candidate[]): NewsEvent[] {
  // 성향 아는 언론사 + 최근 기사만, 최신순
  const maxAge = MAX_AGE_DAYS * 24 * 60 * 60 * 1000
  const fresh = cands
    .filter((c): c is Candidate & { lean: Lean } => c.lean !== 'unknown')
    .filter((c) => ageMs(c.pubDate) <= maxAge)
    .sort((a, b) => ageMs(a.pubDate) - ageMs(b.pubDate))

  const queryTokens = tokenize(topic.query)
  const clusters = clusterCandidates(fresh, queryTokens)

  const events: NewsEvent[] = []
  for (const members of clusters) {
    // 같은 언론사는 1건만 (최신 기사 우선)
    const seen = new Set<string>()
    const picked: (Candidate & { lean: Lean })[] = []
    for (const c of members as (Candidate & { lean: Lean })[]) {
      if (seen.has(c.outlet)) continue
      seen.add(c.outlet)
      picked.push(c)
      if (picked.length >= 8) break
    }
    if (picked.length < 2) continue // 2개 이상 언론사가 보도한 사건만
    events.push(makeEvent(topic, events.length, picked))
    if (events.length >= 3) break // 키워드당 최대 3개 사건
  }
  return events
}

// --- 네이버 검색에서 가져오기 (요약 있음) ---
async function fetchTopicNaver(topic: Topic): Promise<Candidate[]> {
  const url = `/naver/v1/search/news.json?query=${encodeURIComponent(topic.query)}&display=100&sort=date`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`naver fetch failed: ${res.status}`)
  const data = (await res.json()) as {
    items?: { title: string; originallink: string; link: string; description: string; pubDate: string }[]
  }
  return (data.items ?? []).map((it) => {
    const link = it.originallink || it.link
    const o = outletFromUrl(link)
    return {
      title: stripHtml(it.title),
      outlet: o?.name ?? '',
      lean: (o?.lean ?? 'unknown') as OutletLean,
      url: link,
      pubDate: it.pubDate,
      summary: stripHtml(it.description),
    }
  })
}

// --- 구글 뉴스에서 가져오기 (요약 없음, 키 불필요) ---
async function fetchTopicGoogle(topic: Topic): Promise<Candidate[]> {
  const url = `/gnews/rss/search?q=${encodeURIComponent(topic.query)}&hl=ko&gl=KR&ceid=KR:ko`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`google fetch failed: ${res.status}`)
  const xml = await res.text()
  const doc = new DOMParser().parseFromString(xml, 'application/xml')

  return [...doc.querySelectorAll('item')].map((item) => {
    const source = item.querySelector('source')?.textContent?.trim() ?? ''
    let title = item.querySelector('title')?.textContent?.trim() ?? ''
    if (source) {
      while (title.endsWith(' - ' + source)) {
        title = title.slice(0, -(source.length + 3)).trim()
      }
    }
    const at = title.lastIndexOf(' - ')
    if (at > 10 && title.length - at - 3 <= 12) {
      title = title.slice(0, at).trim()
    }
    return {
      title,
      outlet: source,
      lean: leanOf(source),
      url: item.querySelector('link')?.textContent?.trim() ?? '',
      pubDate: item.querySelector('pubDate')?.textContent?.trim() ?? '',
      summary: '',
    }
  })
}

// 네이버 키가 설정돼 있는지 한 번 확인 (안 되면 구글 뉴스로 대체)
async function isNaverReady(): Promise<boolean> {
  try {
    const res = await fetch(`/naver/v1/search/news.json?query=${encodeURIComponent('뉴스')}&display=1`)
    return res.ok
  } catch {
    return false
  }
}

// 같은 사건 중복 판단용 키
function titleKey(title: string): string {
  return title.replace(/[\s"'""''.,…·\-–—[\]()]/g, '').slice(0, 16)
}

// 모든 키워드를 가져와 → (클러스터링) → 사건 목록으로 변환
export async function fetchEvents(): Promise<{ events: NewsEvent[]; source: 'feed' | 'naver' | 'google' }> {
  // 0) 미리 만들어둔 피드 파일이 있으면 그걸 사용 (AI 요약·사진 포함, 1시간마다 갱신)
  try {
    const r = await fetch('/feed.json', { cache: 'no-store' })
    if (r.ok) {
      const data = (await r.json()) as { events?: NewsEvent[] }
      if (data.events && data.events.length > 0) {
        const now = Date.now()
        // "N분 전" 표시를 지금 기준으로 다시 계산(파일이 만들어진 시점 기준이라 오래되면 어긋남)
        const refreshed = data.events.map((e) =>
          e.publishedAt ? { ...e, timeAgo: timeAgo(e.publishedAt) } : e,
        )
        return { events: sortForDisplay(refreshed, now), source: 'feed' }
      }
    }
  } catch {
    // 파일 없으면 아래 실시간 수집으로
  }

  const useNaver = await isNaverReady()
  const fetchTopic = useNaver ? fetchTopicNaver : fetchTopicGoogle

  const results = await Promise.allSettled(
    TOPICS.map(async (topic) => buildEventsForTopic(topic, await fetchTopic(topic))),
  )

  const events: NewsEvent[] = []
  const seenTitles = new Set<string>()
  for (const r of results) {
    if (r.status !== 'fulfilled') continue
    for (const ev of r.value) {
      const key = titleKey(ev.title)
      if (seenTitles.has(key)) continue
      seenTitles.add(key)
      events.push(ev)
    }
  }

  events.sort((a, b) => b.outletCount - a.outletCount)
  return { events, source: useNaver ? 'naver' : 'google' }
}
