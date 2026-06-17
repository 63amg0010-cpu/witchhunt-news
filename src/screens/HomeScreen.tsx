import type { NewsEvent } from '../types'
import Header from '../components/Header'
import EventCard from '../components/EventCard'

const CATEGORIES = ['주요 사건', '정치', '경제', '사회', '국제'] as const

interface Props {
  events: NewsEvent[]
  usingSample: boolean
  category: string
  onCategoryChange: (c: string) => void
  onOpenEvent: (id: string) => void
  onOpenBiasFeed: () => void
  onOpenOutletBias: () => void
}

// 홈 화면 — 오늘의 주요 사건
// 카테고리는 App(브라우저 기록)이 관리 → 기사 보고 뒤로 와도 보던 카테고리 유지
export default function HomeScreen({ events, usingSample, category, onCategoryChange, onOpenEvent, onOpenBiasFeed, onOpenOutletBias }: Props) {
  const list = category === '주요 사건' ? events : events.filter((e) => e.category === category)
  const warnCount = events.filter((e) => e.biasWarning).length

  const [top, ...rest] = list

  return (
    <div className="screen">
      <Header />

      {/* 실시간 뉴스를 못 불러왔을 때 안내 */}
      {usingSample && (
        <div className="sample-note">
          실시간 뉴스를 불러오지 못해 <b>샘플 데이터</b>를 보여주고 있어요.
        </div>
      )}

      {/* 카테고리 탭 (둥근 알약형) */}
      <div className="tabs">
        {CATEGORIES.map((c) => (
          <button
            key={c}
            className={`tab ${category === c ? 'tab--active' : ''}`}
            onClick={() => onCategoryChange(c)}
          >
            {c}
          </button>
        ))}
      </div>

      {/* 편향 경고 배너 */}
      <button className="warn-banner" onClick={onOpenBiasFeed}>
        <span className="warn-banner__icon">⚠️</span>
        <span>편향 경고 {warnCount}건 — 한쪽 진영만 보도 중인 사건이 있어요</span>
        <span className="warn-banner__arrow">›</span>
      </button>

      {/* 언론사 성향 분류표 바로가기 */}
      <button className="outlet-link" onClick={onOpenOutletBias}>
        <span className="outlet-link__dots">
          <span className="dot-prog" /><span className="dot-center" /><span className="dot-cons" />
        </span>
        <span>언론사 성향 분류 보기 <span className="muted">(진보·중도·보수)</span></span>
        <span className="warn-banner__arrow">›</span>
      </button>

      {/* 대표 사건 큰 카드 + 나머지 작은 카드 */}
      {list.length === 0 ? (
        <div className="placeholder-empty" style={{ height: '40vh' }}>
          <div className="placeholder-empty__icon">🗞️</div>
          <div className="placeholder-empty__text">이 분류에는 표시할 사건이 없어요</div>
        </div>
      ) : (
        <>
          {top && <EventCard event={top} variant="large" onClick={() => onOpenEvent(top.id)} />}
          <ul>
            {rest.map((e) => (
              <li key={e.id}>
                <EventCard event={e} variant="small" onClick={() => onOpenEvent(e.id)} />
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  )
}
