import { OUTLETS_BY_LEAN } from '../data/outletBias'
import type { Lean } from '../types'
import { LEAN_LABEL } from '../types'

interface Props {
  onBack: () => void
}

const ORDER: Lean[] = ['prog', 'center', 'cons']

// 언론사 성향 분류표 화면
export default function OutletBiasScreen({ onBack }: Props) {
  return (
    <div className="screen">
      <div className="detail-top">
        <button className="back-btn" onClick={onBack} aria-label="뒤로">
          <span className="back-btn__chev">‹</span> 뒤로
        </button>
      </div>

      <div className="page-head">
        <div className="page-head__title">언론사 성향 분류</div>
        <p className="page-head__sub">
          WitchHunt가 기사 성향을 표시할 때 쓰는 분류예요. 절대적 판정이 아니라
          <b> 참고용</b>이며, 보는 사람·사안에 따라 다를 수 있습니다.
        </p>
      </div>

      {ORDER.map((lean) => (
        <div key={lean} className="outlet-group">
          <div className="outlet-group__head">
            <span className={`outlet-group__dot lean-bg-${lean}`} />
            <span className={`outlet-group__title lean-${lean}`}>{LEAN_LABEL[lean]}</span>
            <span className="muted" style={{ fontSize: 12, fontWeight: 600 }}>
              {OUTLETS_BY_LEAN[lean].length}곳
            </span>
          </div>
          <div className="outlet-group__chips">
            {OUTLETS_BY_LEAN[lean].map((name) => (
              <span key={name} className={`outlet-chip outlet-chip--${lean}`}>{name}</span>
            ))}
          </div>
        </div>
      ))}

      <p className="muted" style={{ fontSize: 12, lineHeight: 1.6, margin: '18px 2px 0' }}>
        목록에 없는 언론사는 '미분류'로 처리되어 성향 비율 계산에서 빠집니다.
        분류는 계속 보완해 나갈 예정이에요.
      </p>
    </div>
  )
}
