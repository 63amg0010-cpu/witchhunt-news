import type { NewsEvent } from '../types'
import LeanBadge from '../components/LeanBadge'
import Thumbnail from '../components/Thumbnail'
import SummaryBox from '../components/SummaryBox'
import { splitSentences } from '../lib/text'

interface Props {
  event: NewsEvent
  onBack: () => void
  onOpenArticle: (articleId: string) => void
}

// 사건 상세 화면
export default function DetailScreen({ event, onBack, onOpenArticle }: Props) {
  return (
    <div className="screen">
      <div className="detail-top">
        <button className="back-btn" onClick={onBack} aria-label="뒤로">
          <span className="back-btn__chev">‹</span> 뒤로
        </button>
        <span className="muted" style={{ fontSize: 13, fontWeight: 700 }}>{event.category}</span>
      </div>

      {/* 대표 사진 */}
      <Thumbnail src={event.imageUrl} ogUrl={event.imageSourceUrl} className="thumb--hero" />

      {/* 제목 + 보도 언론사 수 · 시간 */}
      <h1 className="detail-title">{event.title}</h1>
      <div className="detail-meta">
        {event.outletCount}개 언론사 보도 · {event.timeAgo}
      </div>

      {/* 큰 성향 분포 막대 — 맨 위로 (막대 안에 퍼센트, 옆에 "참고용") */}
      <div className="biasbar-large">
        <div className="biasbar-large__head">
          <b>성향 분포</b>
          <span className="biasbar__legend" style={{ marginLeft: 'auto' }}>
            <span className="ref">참고용</span>
          </span>
        </div>
        <div className="biasbar-large__track">
          <div className="biasbar-large__seg biasbar-large__seg--prog" style={{ width: `${event.bias.prog}%` }}>
            {event.bias.prog}%
          </div>
          <div className="biasbar-large__seg biasbar-large__seg--center" style={{ width: `${event.bias.center}%` }}>
            {event.bias.center}%
          </div>
          <div className="biasbar-large__seg biasbar-large__seg--cons" style={{ width: `${event.bias.cons}%` }}>
            {event.bias.cons}%
          </div>
        </div>
        <div className="biasbar-large__legend">
          <span className={`lean-prog ${event.bias.prog === 0 ? 'lean-zero' : ''}`}>진보 {event.bias.prog}%</span>
          <span className={`lean-center ${event.bias.center === 0 ? 'lean-zero' : ''}`}>중도 {event.bias.center}%</span>
          <span className={`lean-cons ${event.bias.cons === 0 ? 'lean-zero' : ''}`}>보수 {event.bias.cons}%</span>
        </div>
      </div>

      {/* 사건 간단 요약 (성향분석표 다음) — 원문 설명문이 더 길면 그걸로 */}
      <SummaryBox url={event.imageSourceUrl} fallback={event.summary} />

      {/* 사건 배경 설명 (있을 때만) */}
      {event.background && (
        <div className="article-summary article-summary--bg">
          <div className="article-summary__label">📌 배경 설명</div>
          <div className="article-summary__body">
            {splitSentences(event.background).map((s, i) => (
              <p key={i} className="article-summary__line">{s}</p>
            ))}
          </div>
        </div>
      )}

      {/* 제목으로 보는 프레임 차이 (진보 vs 보수 좌우 비교) */}
      <h2 className="section-title">제목으로 보는 프레임 차이</h2>
      <div className="frame-compare">
        <div className="frame-box frame-box--prog">
          <div className="frame-box__tag frame-box__tag--prog">진보 매체</div>
          <p className="frame-box__quote">{event.frameProg}</p>
        </div>
        <div className="frame-box frame-box--cons">
          <div className="frame-box__tag frame-box__tag--cons">보수 매체</div>
          <p className="frame-box__quote">{event.frameCons}</p>
        </div>
      </div>

      {/* 전체 기사 목록 */}
      <h2 className="section-title">전체 기사 {event.articles.length}건</h2>
      <ul>
        {event.articles.map((a) => (
          <li key={a.id}>
            <button className="article-row" onClick={() => onOpenArticle(a.id)}>
              <span className={`article-row__strip article-row__strip--${a.lean}`} />
              <span className="article-row__body">
                <span className="article-row__head">
                  <span className="article-row__outlet">{a.outlet}</span>
                  <LeanBadge lean={a.lean} />
                </span>
                <span className="article-row__title">{a.title}</span>
              </span>
              <span className="article-row__arrow">›</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
