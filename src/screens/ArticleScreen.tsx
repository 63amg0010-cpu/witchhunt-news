import type { NewsEvent } from '../types'
import { LEAN_LABEL } from '../types'
import Thumbnail from '../components/Thumbnail'
import LeanBadge from '../components/LeanBadge'
import SummaryBox from '../components/SummaryBox'

interface Props {
  event: NewsEvent
  articleId: string
  onBack: () => void // 사건 상세로 돌아가기
  onOpenArticle: (articleId: string) => void // 다른 기사로 이동
}

// 기사 화면 — 기사 하나를 눌렀을 때 보이는 화면
export default function ArticleScreen({ event, articleId, onBack, onOpenArticle }: Props) {
  const article = event.articles.find((a) => a.id === articleId)
  if (!article) {
    // 혹시 못 찾으면 사건 상세로 돌려보냄
    return (
      <div className="screen">
        <div className="detail-top">
          <button className="back-btn" onClick={onBack} aria-label="뒤로">
          <span className="back-btn__chev">‹</span> 뒤로
        </button>
        </div>
        <div className="placeholder-empty" style={{ height: '50vh' }}>
          <div className="placeholder-empty__text">기사를 찾을 수 없어요</div>
        </div>
      </div>
    )
  }

  // "이 사건의 다른 시각" — 지금 기사 빼고, 성향이 다른 기사를 먼저 보여줌
  const others = event.articles
    .filter((a) => a.id !== article.id)
    .sort((a, b) => {
      const aDiff = a.lean !== article.lean ? 0 : 1
      const bDiff = b.lean !== article.lean ? 0 : 1
      return aDiff - bDiff
    })

  return (
    <div className="screen">
      <div className="detail-top">
        <button className="back-btn" onClick={onBack} aria-label="뒤로">
          <span className="back-btn__chev">‹</span> 뒤로
        </button>
        <span className="muted" style={{ fontSize: 13, fontWeight: 700 }}>{event.category}</span>
      </div>

      {/* 이 기사의 대표 사진 */}
      <Thumbnail src={event.imageUrl} ogUrl={article.url} className="thumb--hero" />

      {/* 언론사 + 성향 */}
      <div className="article-outlet">
        <span className={`article-outlet__dot lean-bg-${article.lean}`} />
        <span className="article-outlet__name">{article.outlet}</span>
        <LeanBadge lean={article.lean} />
      </div>

      {/* 제목 + 시간 */}
      <h1 className="detail-title">{article.title}</h1>
      <div className="detail-meta">{article.outlet} · {article.timeAgo ?? event.timeAgo}</div>

      {/* 간단 요약 — 원문 설명문이 더 길면 그걸로 */}
      <SummaryBox url={article.url} fallback={article.summary} />

      {/* 성향 안내 */}
      <div className={`article-note article-note--${article.lean}`}>
        이 기사는 <b>{article.outlet}</b>의 보도예요. WitchHunt는 이 언론사를{' '}
        <b className={`lean-${article.lean}`}>{LEAN_LABEL[article.lean]}</b> 성향으로 분류합니다.
        <span className="ref" style={{ marginLeft: 6 }}>참고용</span>
      </div>

      {/* 원문 보기 버튼 */}
      <a className="read-original" href={article.url} target="_blank" rel="noreferrer">
        원문 보기 <span className="read-original__arrow">↗</span>
      </a>
      <p className="read-original__hint">원문은 {article.outlet} 사이트(새 탭)에서 열립니다.</p>

      {/* 이 사건의 다른 시각 */}
      {others.length > 0 && (
        <>
          <h2 className="section-title">이 사건의 다른 시각</h2>
          <ul>
            {others.map((a) => (
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
        </>
      )}
    </div>
  )
}
