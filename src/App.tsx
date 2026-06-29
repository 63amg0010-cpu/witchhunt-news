import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { NewsEvent } from './types'
import { EVENTS as SAMPLE_EVENTS } from './data/events'
import { fetchEvents } from './lib/news'
import BottomNav from './components/BottomNav'
import HomeScreen from './screens/HomeScreen'
import DetailScreen from './screens/DetailScreen'
import ArticleScreen from './screens/ArticleScreen'
import BiasFeedScreen from './screens/BiasFeedScreen'
import MyInfoScreen from './screens/MyInfoScreen'
import OutletBiasScreen from './screens/OutletBiasScreen'

// 하단 네비 탭 종류 (다른 파일에서도 씀)
export type Tab = 'home' | 'bias' | 'debate' | 'me'

// 지금 어느 화면을 보고 있는지 (브라우저 기록과 연동해 폰 뒤로가기 지원)
interface Nav {
  tab: Tab
  openEventId: string | null
  openArticleId: string | null
  page?: 'outletBias' | null // 부가 화면(언론사 성향 분류 등)
  category?: string // 홈 카테고리(주요 사건/정치/…) — 기록에 저장해 뒤로가기 시 복원
  _scroll?: number // 이 화면을 떠날 때의 스크롤 위치(뒤로가기 복원용)
}
const HOME_NAV: Nav = { tab: 'home', openEventId: null, openArticleId: null, page: null, category: '주요 사건' }

export default function App() {
  // 화면 상태 하나로 묶어서 관리 (폰 뒤로가기 = 브라우저 기록 되돌리기)
  const [nav, setNav] = useState<Nav>(HOME_NAV)

  // 실제 뉴스 데이터
  const [events, setEvents] = useState<NewsEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [usingSample, setUsingSample] = useState(false)

  // 처음 화면이 뜰 때 실제 뉴스를 불러온다
  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        const { events: real } = await fetchEvents()
        if (!alive) return
        if (real.length > 0) {
          setEvents(real)
          setUsingSample(false)
        } else {
          setEvents(SAMPLE_EVENTS)
          setUsingSample(true)
        }
      } catch {
        if (!alive) return
        setEvents(SAMPLE_EVENTS)
        setUsingSample(true)
      } finally {
        if (alive) setLoading(false)
      }
    })()
    return () => {
      alive = false
    }
  }, [])

  // 다음에 적용할 스크롤 위치 (앞으로가기=0 / 뒤로가기=이전 위치)
  const pendingScroll = useRef(0)

  // 브라우저 기록 연동: 처음 상태 등록 + 폰/브라우저 뒤로가기(popstate) 처리
  useEffect(() => {
    history.replaceState(HOME_NAV, '')
    const onPop = (e: PopStateEvent) => {
      const st = (e.state as Nav) ?? HOME_NAV
      pendingScroll.current = st._scroll ?? 0 // 뒤로가기: 보던 위치로 복원
      setNav(st)
    }
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])

  // 화면이 바뀌면 스크롤 적용: 새 화면은 맨 위, 뒤로 돌아온 화면은 보던 위치로
  useLayoutEffect(() => {
    const y = pendingScroll.current
    pendingScroll.current = 0
    window.scrollTo(0, y) // 즉시 적용 (앞으로가기=0은 항상 정확)
    // 뒤로가기 복원은 이미지 로딩으로 높이가 늦게 늘 수 있어 한 번 더 시도
    if (y > 0) {
      const t = setTimeout(() => window.scrollTo(0, y), 80)
      return () => clearTimeout(t)
    }
  }, [nav])

  // 새 화면으로 이동 = 상태 변경 + 기록에 쌓기 (그래야 뒤로가기로 되돌아올 수 있음)
  const goTo = (next: Nav) => {
    // 지금 보던 스크롤 위치를 현재 기록에 저장 (뒤로 돌아오면 복원됨)
    history.replaceState({ ...nav, _scroll: window.scrollY }, '')
    pendingScroll.current = 0 // 새 화면은 맨 위에서 시작
    setNav(next)
    history.pushState(next, '')
  }
  // 뒤로가기 = 브라우저 기록을 한 칸 되돌림 (상단 버튼·폰 뒤로가기 모두 이걸로)
  const goBack = () => history.back()

  const openEvent = (id: string) => goTo({ ...nav, openEventId: id, openArticleId: null, page: null })
  const openArticle = (id: string) => goTo({ ...nav, openArticleId: id })
  const changeTab = (t: Tab) =>
    goTo({ tab: t, openEventId: null, openArticleId: null, page: null, category: '주요 사건' })
  const openOutletBias = () => goTo({ ...nav, page: 'outletBias' })
  // 홈 카테고리 변경: 기록을 새로 쌓지 않고 현재 기록만 갱신 (뒤로가기 한 번에 빠져나오게)
  const changeCategory = (c: string) => {
    const next = { ...nav, category: c }
    setNav(next)
    history.replaceState(next, '')
  }

  const selectedEvent = nav.openEventId ? events.find((e) => e.id === nav.openEventId) : null

  let content
  if (loading) {
    content = (
      <div className="screen">
        <div className="placeholder-empty">
          <div className="placeholder-empty__icon">📡</div>
          <div className="placeholder-empty__text">실시간 뉴스를 불러오는 중…</div>
        </div>
      </div>
    )
  } else if (nav.page === 'outletBias') {
    content = <OutletBiasScreen onBack={goBack} />
  } else if (selectedEvent && nav.openArticleId) {
    content = (
      <ArticleScreen
        event={selectedEvent}
        articleId={nav.openArticleId}
        onBack={goBack}
        onOpenArticle={openArticle}
      />
    )
  } else if (selectedEvent) {
    content = <DetailScreen event={selectedEvent} onBack={goBack} onOpenArticle={openArticle} />
  } else if (nav.tab === 'home') {
    content = (
      <HomeScreen
        events={events}
        usingSample={usingSample}
        category={nav.category ?? '주요 사건'}
        onCategoryChange={changeCategory}
        onOpenEvent={openEvent}
        onOpenBiasFeed={() => changeTab('bias')}
        onOpenOutletBias={openOutletBias}
      />
    )
  } else if (nav.tab === 'bias') {
    content = <BiasFeedScreen events={events} onOpenEvent={openEvent} />
  } else if (nav.tab === 'me') {
    content = <MyInfoScreen onOpenOutletBias={openOutletBias} />
  } else {
    content = (
      <div className="screen">
        <div className="placeholder-empty">
          <div className="placeholder-empty__icon">💬</div>
          <div className="placeholder-empty__text">토론 기능은 준비 중이에요</div>
        </div>
      </div>
    )
  }

  // 상세(사건/기사)·언론사 분류 화면에서는 하단 탭바를 숨긴다 — 읽는 데 방해되지 않게
  const showNav = !selectedEvent && nav.page !== 'outletBias'

  return (
    <div className={`app-shell ${showNav ? '' : 'app-shell--flush'}`}>
      {content}
      {showNav && <BottomNav active={nav.tab} onChange={changeTab} />}
    </div>
  )
}
