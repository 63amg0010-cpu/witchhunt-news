import type { NewsEvent } from '../types'
import BiasBar from './BiasBar'
import Thumbnail from './Thumbnail'

interface Props {
  event: NewsEvent
  variant: 'large' | 'small'
  onClick: () => void
}

// 사건 카드 — 대표 사건은 큰 카드(사진+굵은 제목), 나머지는 작은 카드(오른쪽 작은 사진)
export default function EventCard({ event, variant, onClick }: Props) {
  if (variant === 'large') {
    return (
      <button className="card-large" onClick={onClick}>
        <Thumbnail src={event.imageUrl} ogUrl={event.imageSourceUrl} className="thumb--large" />
        <div className="card-large__body">
          <div className="card-large__meta">
            {event.category} · {event.outletCount}개 언론사 보도 · {event.timeAgo}
          </div>
          <h2 className="card-large__title">{event.title}</h2>
          <BiasBar bias={event.bias} />
        </div>
      </button>
    )
  }

  return (
    <button className="card-small" onClick={onClick}>
      <div className="card-small__row">
        <div className="card-small__text">
          <div className="card-small__meta">
            {event.category} · {event.outletCount}개 언론사 보도 · {event.timeAgo}
          </div>
          <h3 className="card-small__title">{event.title}</h3>
        </div>
        <Thumbnail src={event.imageUrl} ogUrl={event.imageSourceUrl} className="thumb--small" />
      </div>
      <BiasBar bias={event.bias} />
    </button>
  )
}
