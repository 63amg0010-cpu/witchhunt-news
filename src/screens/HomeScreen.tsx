import { useEffect, useState } from 'react'
import type { NewsEvent } from '../types'
import Header from '../components/Header'
import EventCard from '../components/EventCard'
import BiasBriefing from '../components/BiasBriefing'
import { IconNews } from '../components/icons'
import { eventRegion, REGIONS } from '../lib/region'

const CATEGORIES = ['주요 사건', '정치', '경제', '주식', '크립토', '예측시장', '사회', '국제'] as const

interface Props {
  events: NewsEvent[]
  usingSample: boolean
  updatedAt?: string
  category: string
  onCategoryChange: (c: string) => void
  onOpenEvent: (id: string) => void
  onOpenBiasFeed: () => void
  onOpenOutletBias: () => void
}

// 홈 화면 — 오늘의 주요 사건
// 카테고리는 App(브라우저 기록)이 관리 → 기사 보고 뒤로 와도 보던 카테고리 유지
export default function HomeScreen({ events, usingSample, updatedAt, category, onCategoryChange, onOpenEvent, onOpenBiasFeed, onOpenOutletBias }: Props) {
  const [region, setRegion] = useState<(typeof REGIONS)[number]>('전체')
  const categoryList = category === '주요 사건' ? events : events.filter((e) => e.category === category)
  const list = category === '국제' && region !== '전체'
    ? categoryList.filter((e) => eventRegion(e) === region)
    : categoryList

  useEffect(() => {
    if (category !== '국제') setRegion('전체')
  }, [category])

  const [top, ...rest] = list

  return (
    <div className="screen">
      <Header updatedAt={updatedAt} />

      {/* 카테고리 탭 — 스크롤해도 위에 남아 현재 분류를 바로 바꾼다 */}
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

      {category === '국제' && (
        <div className="subtabs" aria-label="국가/지역 필터">
          {REGIONS.map((r) => (
            <button
              key={r}
              className={`subtab ${region === r ? 'subtab--active' : ''}`}
              onClick={() => setRegion(r)}
            >
              {r}
            </button>
          ))}
        </div>
      )}

      {/* 실시간 뉴스를 못 불러왔을 때 안내 */}
      {usingSample && (
        <div className="sample-note">
          실시간 뉴스를 불러오지 못해 <b>샘플 데이터</b>를 보여주고 있어요.
        </div>
      )}

      {/* 오늘의 편향 브리핑 — 이 앱의 핵심(진영별 보도 비교) */}
      <BiasBriefing events={events} onOpenBiasFeed={onOpenBiasFeed} />

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
          <div className="placeholder-empty__icon"><IconNews size={40} /></div>
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
