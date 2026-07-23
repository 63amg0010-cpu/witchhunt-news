interface Props {
  onOpenOutletBias: () => void
}

export default function MyInfoScreen({ onOpenOutletBias }: Props) {
  return (
    <div className="screen">
      <div className="page-head">
        <div className="page-head__title">정보</div>
      </div>

      <section className="profile-card" aria-labelledby="service-introduction-title">
        <div>
          <div id="service-introduction-title" className="profile-card__name">WitchHunt는 이런 서비스예요</div>
          <div className="profile-card__login">
            같은 사건을 진보·중도·보수 언론이 각각 어떻게 다루는지 비교해 보여줘요. 한쪽 시각만 접하면 놓치는 부분을 줄이는 게 목표예요. 언론사 성향 분류는 절대적 판정이 아니라 참고용이며, 계속 보완하고 있어요.
          </div>
        </div>
      </section>

      <section aria-labelledby="usage-guide-title">
        <div id="usage-guide-title" className="page-head__sub">이용 안내</div>
        <ul className="menu-list">
          <li className="menu-item">홈 — 사건별로 진영 보도 분포를 비교</li>
          <li className="menu-item">이슈 해설 — 어려운 이슈를 쉬운 말로 풀이</li>
          <li className="menu-item">편향경고 — 보도가 한쪽에 쏠린 사건 모음</li>
        </ul>
      </section>

      <ul className="menu-list">
        <li>
          <button className="menu-item" onClick={onOpenOutletBias}>
            언론사 성향 분류
            <span className="menu-item__arrow">›</span>
          </button>
        </li>
      </ul>
    </div>
  )
}
