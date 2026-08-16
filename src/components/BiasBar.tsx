import type { BiasRatio } from '../types'

// 카드용 성향 막대.
// counts(진영별 언론사 수)가 주어지면 "진보 3·중도 8·보수 5"처럼 구체적으로 보여준다.
export default function BiasBar({
  pct,
  counts,
  prominent,
}: {
  pct: BiasRatio
  counts?: { prog: number; center: number; cons: number }
  prominent?: boolean // 큰 카드(대표 사건)에서 막대를 더 두껍고 크게
}) {
  return (
    <div className={`biasbar ${prominent ? 'biasbar--lg' : ''}`}>
      <div className="biasbar__track">
        <div className="biasbar__seg biasbar__seg--prog" style={{ width: `${pct.prog}%` }} />
        <div className="biasbar__seg biasbar__seg--center" style={{ width: `${pct.center}%` }} />
        <div className="biasbar__seg biasbar__seg--cons" style={{ width: `${pct.cons}%` }} />
      </div>
      <div className="biasbar__legend">
        {counts ? (
          <>
            <span className={`lean-prog ${counts.prog === 0 ? 'lean-zero' : ''}`}>진보 {counts.prog}</span>
            <span className={`lean-center ${counts.center === 0 ? 'lean-zero' : ''}`}>중도 {counts.center}</span>
            <span className={`lean-cons ${counts.cons === 0 ? 'lean-zero' : ''}`}>보수 {counts.cons}</span>
            <span className="biasbar__unit">개 언론사</span>
          </>
        ) : (
          <>
            <span className="lean-prog">진보 {pct.prog}%</span>
            <span className="lean-center">중도 {pct.center}%</span>
            <span className="lean-cons">보수 {pct.cons}%</span>
          </>
        )}
      </div>
    </div>
  )
}
