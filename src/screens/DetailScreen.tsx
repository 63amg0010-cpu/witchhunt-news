import type { Article, Lean, NewsEvent, ViewTake } from '../types'
import LeanBadge from '../components/LeanBadge'
import Thumbnail from '../components/Thumbnail'
import SummaryBox from '../components/SummaryBox'
import { splitSentences } from '../lib/text'
import { displayLeanCounts, LEAN_KO } from '../lib/bias'

interface Props {
  event: NewsEvent
  onBack: () => void
  onOpenArticle: (articleId: string) => void
}

// ★ 진영 주장 한 칸 — "이 진영은 이 사건을 두고 무엇을 주장하는가"
function ViewPane({ view, onOpen }: { view: ViewTake; onOpen: (id: string) => void }) {
  const lean = view.lean
  return (
    <button className={`vs-pane vs-pane--${lean}`} onClick={() => onOpen(view.articleId)}>
      <div className={`vs-pane__tag vs-pane__tag--${lean}`}>
        {LEAN_KO[lean]} 진영
      </div>
      <p className="vs-pane__take">{view.text}</p>
      <span className={`vs-pane__more vs-pane__more--${lean}`}>근거 기사 보기 · {view.outlet} ›</span>
    </button>
  )
}

// (구버전 대비) 논조가 아직 없는 사건은 헤드라인 비교로 대신 보여준다
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

const T_STOP = new Set(['있다', '없다', '대한', '위해', '관련', '이번', '오늘', '지난', '종합', '속보', '단독', '기자', '뉴스', '대통령', '정부', '오전', '오후'])
function titleToks(s: string): string[] {
  return [...new Set(String(s).replace(/[^가-힣a-zA-Z0-9]+/g, ' ').split(' ').filter((w) => w.length >= 2 && !T_STOP.has(w) && !/^\d+$/.test(w)))]
}
// 두 단어가 사실상 같은 말인가 — 어미·조사만 다른 경우(폐지/폐지로, 위원장/위원장은)도 같게 본다.
function sameWord(x: string, y: string): boolean {
  if (x === y) return true
  const m = Math.min(x.length, y.length)
  return m >= 2 && (x.startsWith(y) || y.startsWith(x)) // 한쪽이 다른 쪽으로 시작하면 같은 말
}
// 두 제목이 '시각 차이'라 부를 만큼 다른가. 거의 같은 헤드라인(통신사·보수가 같은 사실 보도)이면 false → 비교 숨김.
function titlesDiffer(a: string, b: string): boolean {
  const ta = titleToks(a)
  const tb = titleToks(b)
  if (!ta.length || !tb.length) return true
  let shared = 0
  for (const x of ta) {
    if (tb.some((y) => sameWord(x, y))) shared++
  }
  // 짧은 쪽 제목의 절반 이상이 겹치면 '같은 프레임'으로 보고 비교를 숨긴다(기준 0.6→0.5).
  return shared / Math.min(ta.length, tb.length) < 0.5
}

// 사건 상세 화면
export default function DetailScreen({ event, onBack, onOpenArticle }: Props) {
  const counts = displayLeanCounts(event)
  const { left, right } = pickContrast(event)
  // 좌·우 제목이 충분히 다를 때만 '시각 비교'를 보여준다 (거의 같은 제목 두 개는 비교가 아님)
  const showContrast = !!(left && right && titlesDiffer(left.title, right.title))
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

      {/* ★ 진영별 논조 — 각 진영이 이 사건을 어떻게 보는지(주장) */}
      {event.views ? (
        <>
          <h2 className="compare__title">진영별로 이렇게 봅니다</h2>
          {event.views.issue
            ? <p className="compare__issue"><b>쟁점</b> {event.views.issue}</p>
            : <p className="compare__sub">같은 사건을 두고 각 진영이 무엇을 주장하는지 정리했어요.</p>}
          <div className="compare__pair">
            <ViewPane view={event.views.left} onOpen={onOpenArticle} />
            <ViewPane view={event.views.right} onOpen={onOpenArticle} />
          </div>
          {noProg && <p className="compare__blindspot">👁 이 사건은 진보 매체 보도가 없어요.</p>}
        </>
      ) : (
        showContrast && (
          <>
            <h2 className="compare__title">같은 사건, 시각 비교</h2>
            <p className="compare__sub">이 사건을 보도한 매체 중 시각이 가장 다른 둘을 골라 비교했어요.</p>
            <div className="compare__pair">
              <ComparePane article={left!} onOpen={onOpenArticle} />
              <ComparePane article={right!} onOpen={onOpenArticle} />
            </div>
            {noProg && <p className="compare__blindspot">👁 이 사건은 진보 매체 보도가 없어요.</p>}
          </>
        )
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

      {/* 🗣 네티즌 반응 — 공감 많은 댓글들의 '전체 분위기' 한 줄 (배경 설명 아래, 있을 때만) */}
      {typeof event.publicTake === 'string' && event.publicTake && (
        <div className="article-summary netizen">
          <div className="article-summary__label">🗣 네티즌 반응</div>
          <p className="netizen__mood">{event.publicTake}</p>
          <div className="netizen__src">네이버 뉴스 댓글의 전체 분위기 · 보수 성향이 강한 편 · 참고용</div>
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
