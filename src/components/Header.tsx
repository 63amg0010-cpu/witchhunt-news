// 상단 헤더: WitchHunt 로고(아이콘 + 글자) + 오른쪽에 오늘 날짜·업데이트 시각
const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토']

// 오늘 날짜 "7월 2일 (목)"
function todayLabel(): string {
  const d = new Date()
  return `${d.getMonth() + 1}월 ${d.getDate()}일 (${WEEKDAYS[d.getDay()]})`
}

// 피드 갱신 시각 → "방금 업데이트" / "N시간 전 업데이트" / "N일 전 업데이트"
function updatedLabel(iso?: string): string | null {
  if (!iso) return null
  const t = Date.parse(iso)
  if (Number.isNaN(t)) return null
  const min = Math.floor((Date.now() - t) / 60000)
  if (min < 60) return '방금 업데이트'
  const hr = Math.floor(min / 60)
  if (hr < 24) return `${hr}시간 전 업데이트`
  const day = Math.floor(hr / 24)
  return `${day}일 전 업데이트`
}

export default function Header({ updatedAt }: { updatedAt?: string }) {
  const updated = updatedLabel(updatedAt)
  return (
    <header className="header">
      <div className="header__brand">
        <img src="/witch-icon.png" alt="" className="header__icon" />
        <img src="/witchhunt-word.png" alt="WitchHunt" className="header__word" />
      </div>
      <div className="header__meta">
        <span className="header__date">{todayLabel()}</span>
        {updated && <span className="header__updated">{updated}</span>}
      </div>
    </header>
  )
}
