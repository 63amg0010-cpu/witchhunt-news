import type { NewsEvent } from '../types'
import { feedBiasSummary } from '../lib/bias'

// 홈 맨 위 "오늘의 편향 브리핑" — 이 앱의 정체성(진영별 보도 비교)을 한눈에 보여주는 헤더
export default function BiasBriefing({ events, onOpenBiasFeed }: { events: NewsEvent[]; onOpenBiasFeed: () => void }) {
  const s = feedBiasSummary(events)

  return (
    <div className="briefing">
      <div className="briefing__top">
        <span className="briefing__kicker">오늘의 편향 브리핑</span>
        <span className="briefing__count">사건 {s.total}건</span>
      </div>

      <p className="briefing__headline">
        한쪽 진영에 쏠려 보도된 사건 <b className="briefing__big">{s.tilted}</b>건
        {s.blindspot > 0 && (
          <>
            {' '}· 한쪽만 다룬 사건 <b className="briefing__big">{s.blindspot}</b>건
          </>
        )}
      </p>

      {/* 전체 보도가 어느 진영에 쏠려 있는지 한 줄 띠로 */}
      <div className="briefing__bar">
        <div className="briefing__seg briefing__seg--prog" style={{ width: `${s.pct.prog}%` }} />
        <div className="briefing__seg briefing__seg--center" style={{ width: `${s.pct.center}%` }} />
        <div className="briefing__seg briefing__seg--cons" style={{ width: `${s.pct.cons}%` }} />
      </div>
      <div className="briefing__legend">
        <span className="lean-prog">진보 {s.pct.prog}%</span>
        <span className="lean-center">중도 {s.pct.center}%</span>
        <span className="lean-cons">보수 {s.pct.cons}%</span>
        <span className="briefing__hint">전체 보도량 기준</span>
      </div>

      <button className="briefing__cta" onClick={onOpenBiasFeed}>
        쏠린 사건만 모아보기 <span className="briefing__cta-arrow">›</span>
      </button>
    </div>
  )
}
