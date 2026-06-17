import type { Tab } from '../App'

interface Props {
  active: Tab
  onChange: (tab: Tab) => void
}

const ITEMS: { key: Tab; label: string; icon: string }[] = [
  { key: 'home', label: '홈', icon: '🏠' },
  { key: 'bias', label: '편향경고', icon: '⚠️' },
  { key: 'debate', label: '토론', icon: '💬' },
  { key: 'me', label: '내 정보', icon: '👤' },
]

// 하단 고정 네비게이션 (홈 / 편향경고 / 토론 / 내 정보)
export default function BottomNav({ active, onChange }: Props) {
  return (
    <nav className="bottom-nav">
      {ITEMS.map((item) => (
        <button
          key={item.key}
          className={`nav-item ${active === item.key ? 'nav-item--active' : ''}`}
          onClick={() => onChange(item.key)}
        >
          <span className="nav-item__icon">{item.icon}</span>
          <span>{item.label}</span>
        </button>
      ))}
    </nav>
  )
}
