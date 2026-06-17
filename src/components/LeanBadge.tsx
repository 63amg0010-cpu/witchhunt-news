import type { Lean } from '../types'
import { LEAN_LABEL } from '../types'

// 성향 배지 (진보/중도/보수)
export default function LeanBadge({ lean }: { lean: Lean }) {
  return <span className={`badge badge--${lean}`}>{LEAN_LABEL[lean]}</span>
}
