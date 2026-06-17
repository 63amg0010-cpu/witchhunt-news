// 상단 헤더: WitchHunt 로고(아이콘 + 글자) + 우측 프로필 동그라미
export default function Header() {
  return (
    <header className="header">
      <div className="header__brand">
        <img src="/witch-icon.png" alt="" className="header__icon" />
        <img src="/witchhunt-word.png" alt="WitchHunt" className="header__word" />
      </div>
      <div className="header__profile" aria-label="프로필">나</div>
    </header>
  )
}
