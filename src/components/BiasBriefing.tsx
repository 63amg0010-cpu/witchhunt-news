import type { NewsEvent } from '../types'
import { feedBiasSummary } from '../lib/bias'

// 홈 맨 위 "오늘의 편향 브리핑" — 이 앱의 정체성(진영별 보도 비교)을 한눈에 보여주는 헤더
export default function BiasBriefing({ events, onOpenBiasFeed }: { events: NewsEvent[]; onOpenBiasFeed: () => void }) {
  const s = feedBiasSummary(events)

  return (
    <div className="briefing">
      <div className="briefing__top">
        <span className="briefing__kicker">
          <span className="briefing__dot" />
          오늘의 편향 브리핑
        </span>
        <span className="briefing__count">사건 {s.total}건</span>
      </div>

      <div className="briefing__stats">
        <div className="briefing__stat">
          <div className="briefing__statnum">
            {s.tilted}
            <span className="briefing__statunit">건</span>
          </div>
          <div className="briefing__statlabel">한쪽으로 쏠려 보도</div>
        </div>
        {s.blindspot > 0 && (
          <div className="briefing__stat">
            <div className="briefing__statnum">
              {s.blindspot}
              <span className="briefing__statunit">건</span>
            </div>
            <div className="briefing__statlabel">한쪽 시각이 빠짐</div>
          </div>
        )}
      </div>

      <div className="briefing__bar">
        <div className="briefing__seg briefing__seg--prog" style={{ width: `${s.pct.prog}%` }} />
        <div className="briefing__seg briefing__seg--center" style={{ width: `${s.pct.center}%` }} />
        <div className="briefing__seg briefing__seg--cons" style={{ width: `${s.pct.cons}%` }} />
      </div>
      <div className="briefing__pcts">
        <span className="lean-prog" style={{ width: `${s.pct.prog}%` }}>{s.pct.prog}%</span>
        <span className="lean-center" style={{ width: `${s.pct.center}%` }}>{s.pct.center}%</span>
        <span className="lean-cons" style={{ width: `${s.pct.cons}%` }}>{s.pct.cons}%</span>
      </div>
      <div className="briefing__legend">
        <span>진보 · 중도 · 보수 보도량 기준</span>
        <span className="briefing__hint">성향 분류는 참고용</span>
      </div>

      <div className="briefing__divider" />
      <button className="briefing__cta" onClick={onOpenBiasFeed}>
        쏠린 사건만 모아보기 <span className="briefing__cta-arrow">›</span>
      </button>
    </div>
  )
}
