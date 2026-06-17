interface Props {
  onOpenOutletBias: () => void
}

// 내 정보 화면 (간단히) — 로그인 안내 + 설정 메뉴
// '언론사 성향 분류'만 실제 동작, 나머지는 아직 자리만.
const PLACEHOLDER_MENU = ['관심 카테고리 설정', '알림 설정', '공지사항', '앱 정보']

export default function MyInfoScreen({ onOpenOutletBias }: Props) {
  return (
    <div className="screen">
      <div className="page-head">
        <div className="page-head__title">내 정보</div>
      </div>

      {/* 로그인 안내 */}
      <div className="profile-card">
        <div className="profile-card__avatar">👤</div>
        <div>
          <div className="profile-card__name">게스트</div>
          <div className="profile-card__login">로그인하고 관심 뉴스를 저장해 보세요</div>
        </div>
        <button className="login-btn">로그인</button>
      </div>

      {/* 설정 메뉴 */}
      <ul className="menu-list">
        <li>
          <button className="menu-item" onClick={onOpenOutletBias}>
            언론사 성향 분류
            <span className="menu-item__arrow">›</span>
          </button>
        </li>
        {PLACEHOLDER_MENU.map((m) => (
          <li key={m}>
            <button className="menu-item">
              {m}
              <span className="menu-item__arrow">›</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
