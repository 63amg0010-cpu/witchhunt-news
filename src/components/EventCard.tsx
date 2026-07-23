import type { NewsEvent } from '../types'
import BiasBar from './BiasBar'
import Thumbnail from './Thumbnail'
import { biasBadge, displayLeanCounts } from '../lib/bias'
import { IconAlert, IconEye } from './icons'

interface Props {
  event: NewsEvent
  variant: 'large' | 'small'
  onClick: () => void
}

// 한쪽 쏠림/블라인드스팟 뱃지 (편향 비교 강조)
function BiasTag({ event }: { event: NewsEvent }) {
  const b = biasBadge(event)
  if (!b) return null
  const Icon = b.kind === 'tilt' ? IconAlert : IconEye
  return (
    <span className={`ev-badge ev-badge--${b.kind} ev-badge--${b.lean}`}>
      <Icon size={12} className="ev-badge__icon" />
      {b.text}
    </span>
  )
}

// 사건 카드 — 대표 사건은 큰 카드(사진+굵은 제목), 나머지는 작은 카드(오른쪽 작은 사진)
export default function EventCard({ event, variant, onClick }: Props) {
  const counts = displayLeanCounts(event)

  if (variant === 'large') {
    return (
      <button className="card-large" onClick={onClick}>
        <Thumbnail src={event.imageUrl} ogUrl={event.imageSourceUrl} className="thumb--large" />
        <div className="card-large__body">
          <div className="card-large__meta">
            {event.category} · {event.outletCount}개 언론사 보도 · {event.timeAgo}
          </div>
          <h2 className="card-large__title">{event.title}</h2>
          <BiasTag event={event} />
          <BiasBar bias={event.bias} counts={counts} />
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
          <BiasTag event={event} />
        </div>
        <Thumbnail src={event.imageUrl} ogUrl={event.imageSourceUrl} className="thumb--small" />
      </div>
      <BiasBar bias={event.bias} counts={counts} />
    </button>
  )
}
