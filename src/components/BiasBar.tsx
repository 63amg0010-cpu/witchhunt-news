import type { BiasRatio } from '../types'

// 카드용 작은 성향 막대 (진보/중도/보수 비율 + 퍼센트, 옆에 "참고용" 표시)
export default function BiasBar({ bias }: { bias: BiasRatio }) {
  return (
    <div className="biasbar">
      <div className="biasbar__track">
        <div className="biasbar__seg biasbar__seg--prog" style={{ width: `${bias.prog}%` }} />
        <div className="biasbar__seg biasbar__seg--center" style={{ width: `${bias.center}%` }} />
        <div className="biasbar__seg biasbar__seg--cons" style={{ width: `${bias.cons}%` }} />
      </div>
      <div className="biasbar__legend">
        <span className="lean-prog">진보 {bias.prog}%</span>
        <span className="lean-center">중도 {bias.center}%</span>
        <span className="lean-cons">보수 {bias.cons}%</span>
        <span className="ref">참고용</span>
      </div>
    </div>
  )
}
