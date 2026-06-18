import type { Article, Lean, NewsEvent } from '../types'
import LeanBadge from '../components/LeanBadge'
import Thumbnail from '../components/Thumbnail'
import SummaryBox from '../components/SummaryBox'
import { splitSentences } from '../lib/text'
import { leanCounts, LEAN_KO } from '../lib/bias'

interface Props {
  event: NewsEvent
  onBack: () => void
  onOpenArticle: (articleId: string) => void
}

// 시각 비교 한 칸 — 실제 보도한 매체(진보/중도/보수)의 헤드라인
function ComparePane({ article, onOpen }: { article: Article; onOpen: (id: string) => void }) {
  const lean = article.lean
  return (
    <button className={`vs-pane vs-pane--${lean}`} onClick={() => onOpen(article.id)}>
      <div className={`vs-pane__tag vs-pane__tag--${lean}`}>
        {LEAN_KO[lean]} 매체 · {article.outlet}
      </div>
      <p className="vs-pane__quote">{article.title}</p>
      <span className={`vs-pane__more vs-pane__more--${lean}`}>이 기사 보기 ›</span>
    </button>
  )
}

// 그 사건을 실제로 보도한 매체 중 '가장 양극단' 두 시각을 고른다.
// (진보가 없으면 중도 vs 보수처럼, 있는 시각 중 가장 벌어진 둘)
function pickContrast(event: NewsEvent): { left?: Article; right?: Article } {
  const order: Lean[] = ['prog', 'center', 'cons']
  const repByLean: Partial<Record<Lean, Article>> = {}
  for (const a of event.articles) if (!repByLean[a.lean]) repByLean[a.lean] = a
  const present = order.filter((l) => repByLean[l])
  if (present.length === 0) return {}
  if (present.length === 1) return { left: repByLean[present[0]] }
  return { left: repByLean[present[0]], right: repByLean[present[present.length - 1]] }
}

// 사건 상세 화면
export default function DetailScreen({ event, onBack, onOpenArticle }: Props) {
  const counts = leanCounts(event)
  const { left, right } = pickContrast(event)
  const noProg = counts.prog === 0 && event.articles.length > 0

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

      {/* ★ 같은 사건, 시각 비교 — 이 앱의 핵심 */}
      <h2 className="compare__title">같은 사건, 시각 비교</h2>
      <p className="compare__sub">이 사건을 보도한 매체 중 시각이 가장 다른 둘을 골라 비교했어요.</p>
      <div className="compare__pair">
        {left && <ComparePane article={left} onOpen={onOpenArticle} />}
        {right && <ComparePane article={right} onOpen={onOpenArticle} />}
        {!right && <p className="compare__note">아직 비교할 만큼 다양한 매체가 이 사건을 다루지 않았어요.</p>}
      </div>
      {noProg && <p className="compare__blindspot">👁 이 사건은 진보 매체 보도가 없어요.</p>}

      {/* 🗣 대중의 시각 — 진영별 커뮤니티 반응 (있을 때만) */}
      {(event.publicTake?.prog || event.publicTake?.cons) && (
        <>
          <h2 className="compare__title">🗣 대중의 시각</h2>
          <p className="compare__sub">
            커뮤니티·SNS 반응을 AI가 진영별로 정리했어요. 일부 의견이라 전체 여론을 대표하지 않습니다.
          </p>
          <div className="compare__pair">
            {event.publicTake.prog && (
              <div className="vs-pane vs-pane--prog">
                <div className="vs-pane__tag vs-pane__tag--prog">진보 성향 커뮤니티</div>
                <p className="vs-pane__take">{event.publicTake.prog}</p>
              </div>
            )}
            {event.publicTake.cons && (
              <div className="vs-pane vs-pane--cons">
                <div className="vs-pane__tag vs-pane__tag--cons">보수 성향 커뮤니티</div>
                <p className="vs-pane__take">{event.publicTake.cons}</p>
              </div>
            )}
          </div>
        </>
      )}

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
