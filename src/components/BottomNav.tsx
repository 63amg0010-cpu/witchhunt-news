import type { Tab } from '../App'
import type { ComponentType } from 'react'
import { IconAlert, IconHome, IconInfo, IconSearch } from './icons'

interface Props {
  active: Tab
  onChange: (tab: Tab) => void
}

type NavIcon = ComponentType<{ readonly size?: number; readonly className?: string }>

const ITEMS = [
  { key: 'home', label: '홈', icon: IconHome },
  { key: 'issue', label: '이슈 해설', icon: IconSearch },
  { key: 'bias', label: '편향경고', icon: IconAlert },
  { key: 'me', label: '정보', icon: IconInfo },
] as const satisfies readonly { readonly key: Tab; readonly label: string; readonly icon: NavIcon }[]

// 하단 고정 네비게이션 (홈 / 이슈 해설 / 편향경고 / 정보)
export default function BottomNav({ active, onChange }: Props) {
  return (
    <nav className="bottom-nav">
      {ITEMS.map((item) => {
        const Icon = item.icon
        return (
          <button
            key={item.key}
            className={`nav-item ${active === item.key ? 'nav-item--active' : ''}`}
            onClick={() => onChange(item.key)}
          >
            <span className="nav-item__icon"><Icon size={22} /></span>
            <span>{item.label}</span>
          </button>
        )
      })}
    </nav>
  )
}
