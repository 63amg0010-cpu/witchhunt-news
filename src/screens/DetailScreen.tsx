import type { Article, Lean, NewsEvent } from '../types'
import LeanBadge from '../components/LeanBadge'
import Thumbnail from '../components/Thumbnail'
import SummaryBox from '../components/SummaryBox'
import { splitSentences } from '../lib/text'
import { leanCounts } from '../lib/bias'

interface Props {
  event: NewsEvent
  onBack: () => void
  onOpenArticle: (articleId: string) => void
}

// 진영별 시각 대비 한 칸 (진보/보수) — 이 앱의 핵심
function ComparePane({
  lean,
  article,
  onOpen,
}: {
  lean: Lean
  article?: Article
  onOpen: (id: string) => void
}) {
  const label = lean === 'prog' ? '진보 매체' : '보수 매체'
  if (!article) {
    return (
      <div className={`vs-pane vs-pane--${lean} vs-pane--empty`}>
        <div className={`vs-pane__tag vs-pane__tag--${lean}`}>{label}</div>
        <p className="vs-pane__empty">이 사건을 다룬 {label} 기사가 없어요</p>
      </div>
    )
  }
  return (
    <button className={`vs-pane vs-pane--${lean}`} onClick={() => onOpen(article.id)}>
      <div className={`vs-pane__tag vs-pane__tag--${lean}`}>
        {label} · {article.outlet}
      </div>
      <p className="vs-pane__quote">{article.title}</p>
      <span className={`vs-pane__more vs-pane__more--${lean}`}>이 기사 보기 ›</span>
    </button>
  )
}

// 사건 상세 화면
export default function DetailScreen({ event, onBack, onOpenArticle }: Props) {
  const counts = leanCounts(event)
  const prog = event.articles.find((a) => a.lean === 'prog')
  const cons = event.articles.find((a) => a.lean === 'cons')

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

      {/* 큰 성향 분포 막대 (막대 안에 퍼센트, 아래에 언론사 수) */}
      <div className="biasbar-large">
        <div className="biasbar-large__head">
          <b>진영별 보도 분포</b>
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
          <span className={`lean-prog ${counts.prog === 0 ? 'lean-zero' : ''}`}>진보 {counts.prog}</span>
          <span className={`lean-center ${counts.center === 0 ? 'lean-zero' : ''}`}>중도 {counts.center}</span>
          <span className={`lean-cons ${counts.cons === 0 ? 'lean-zero' : ''}`}>보수 {counts.cons}</span>
          <span className="biasbar__unit">개 언론사</span>
        </div>
      </div>

      {/* ★ 같은 사건, 진영별 시각 — 이 앱의 핵심 */}
      <h2 className="compare__title">같은 사건, 진영별 시각</h2>
      <p className="compare__sub">진보·보수 매체가 같은 사건을 어떻게 다르게 전하는지 비교해 보세요.</p>
      <div className="compare__pair">
        <ComparePane lean="prog" article={prog} onOpen={onOpenArticle} />
        <ComparePane lean="cons" article={cons} onOpen={onOpenArticle} />
      </div>

      {/* 사건 간단 요약 */}
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
