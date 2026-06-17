import type { NewsEvent } from '../types'
import { LEAN_LABEL } from '../types'

interface Props {
  events: NewsEvent[]
  onOpenEvent: (id: string) => void
}

// 편향 경고 피드 — 한쪽 진영만 집중 보도 중인 사건 목록
export default function BiasFeedScreen({ events, onOpenEvent }: Props) {
  const warned = events.filter((e) => e.biasWarning)

  return (
    <div className="screen">
      <div className="page-head">
        <div className="page-head__title">⚠️ 편향 경고</div>
        <p className="page-head__sub">
          특정 진영의 언론사에 보도가 쏠려 있는 사건들이에요.
          한쪽 시각만 접하지 않도록 참고하세요.
        </p>
      </div>

      {warned.length === 0 ? (
        <div className="placeholder-empty" style={{ height: '50vh' }}>
          <div className="placeholder-empty__icon">✅</div>
          <div className="placeholder-empty__text">지금은 한쪽으로 쏠린 사건이 없어요</div>
        </div>
      ) : (
        <ul>
          {warned.map((e) => {
            const lean = e.dominantLean ?? 'center'
            const pct = e.bias[lean]
            return (
              <li key={e.id}>
                <button className="bias-warn-card" onClick={() => onOpenEvent(e.id)}>
                  <span className={`bias-warn-card__lean lean-${lean}`}>
                    {LEAN_LABEL[lean]} 진영 집중 · {pct}%
                  </span>
                  <div className="bias-warn-card__title">{e.title}</div>
                  <div className="card-small__meta" style={{ marginTop: 8 }}>
                    {e.category} · {e.outletCount}개 언론사 보도 · {e.timeAgo}
                  </div>
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
