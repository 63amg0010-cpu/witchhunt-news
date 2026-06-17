import type { BiasRatio } from '../types'

// 카드용 성향 막대.
// counts(진영별 언론사 수)가 주어지면 "진보 3·중도 8·보수 5"처럼 구체적으로 보여준다.
export default function BiasBar({
  bias,
  counts,
}: {
  bias: BiasRatio
  counts?: { prog: number; center: number; cons: number }
}) {
  return (
    <div className="biasbar">
      <div className="biasbar__track">
        <div className="biasbar__seg biasbar__seg--prog" style={{ width: `${bias.prog}%` }} />
        <div className="biasbar__seg biasbar__seg--center" style={{ width: `${bias.center}%` }} />
        <div className="biasbar__seg biasbar__seg--cons" style={{ width: `${bias.cons}%` }} />
      </div>
      <div className="biasbar__legend">
        {counts ? (
          <>
            <span className="lean-prog">진보 {counts.prog}</span>
            <span className="lean-center">중도 {counts.center}</span>
            <span className="lean-cons">보수 {counts.cons}</span>
            <span className="biasbar__unit">개 언론사</span>
          </>
        ) : (
          <>
            <span className="lean-prog">진보 {bias.prog}%</span>
            <span className="lean-center">중도 {bias.center}%</span>
            <span className="lean-cons">보수 {bias.cons}%</span>
          </>
        )}
        <span className="ref">참고용</span>
      </div>
    </div>
  )
}
