import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import type { IssueExplain } from '../types'
import { fetchIssues } from '../lib/issues'
import { splitSentences } from '../lib/text'
import Thumbnail from '../components/Thumbnail'
import { IconBulb, IconHome, IconNews, IconPieces, IconSearch, IconTarget, IconWatch } from '../components/icons'

interface Props {
  openIdx: number | null // 열려 있는 해설(브라우저 기록이 관리 → 폰 뒤로가기 정상 동작)
  onOpenIssue: (idx: number) => void
  onBack: () => void
  onOpenEvent: (id: string) => void
}

// 이슈 해설 — 뉴스가 '무슨 일'만 알려준다면, 여기선 '무슨 뜻이고 나한테 무슨 상관인지'를 풀어준다.
export default function IssueScreen({ openIdx, onOpenIssue, onBack, onOpenEvent }: Props) {
  const [issues, setIssues] = useState<IssueExplain[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let alive = true
    fetchIssues().then((d) => {
      if (!alive) return
      setIssues(d.issues)
      setLoading(false)
    })
    return () => { alive = false }
  }, [])

  if (loading) {
    return (
      <div className="screen">
        <div className="placeholder-empty">
          <div className="placeholder-empty__icon"><IconSearch size={40} /></div>
          <div className="placeholder-empty__text">이슈 해설을 불러오는 중…</div>
        </div>
      </div>
    )
  }

  // 상세 보기
  if (openIdx !== null && issues[openIdx]) {
    const it = issues[openIdx]
    return (
      <div className="screen">
        <div className="detail-top">
          <button className="back-btn" onClick={onBack}>
            <span className="back-btn__chev">‹</span> 뒤로
          </button>
          <span className="muted" style={{ fontSize: 13, fontWeight: 700 }}>{it.category}</span>
        </div>

        <Thumbnail src={it.imageUrl} ogUrl={it.imageSourceUrl} className="thumb--hero" />
        <h1 className="issue-title">{it.title}</h1>
        <p className="issue-oneline">{it.oneLine}</p>

        <IssueBlock icon={<IconNews size={16} />} label="무슨 일이 있었나" text={it.whatHappened} />

        {it.terms?.length > 0 && (
          <div className="issue-block issue-block--terms">
            <div className="issue-block__label"><IconBulb size={16} />어려운 말 풀이</div>
            {it.terms.map((t, i) => (
              <div key={i} className="issue-term">
                <b>{t.word}</b>
                <span>{t.desc}</span>
              </div>
            ))}
          </div>
        )}

        <IssueBlock icon={<IconPieces size={16} />} label="이게 무슨 의미냐면" text={it.meaning} />

        {it.intents?.length > 0 && (
          <div className="issue-block">
            <div className="issue-block__label"><IconTarget size={16} />왜 이런 일이 벌어졌나</div>
            {/* 해석이 하나뿐일 땐 '단정할 수 없다'는 안내와 번호가 어색하므로 문구를 바꾼다 */}
            <p className="issue-block__note">
              {it.intents.length === 1
                ? '아래는 가능한 해석입니다. 확정된 사실은 아니에요.'
                : '아래는 가능한 해석입니다. 어느 하나로 단정할 수 없어요.'}
            </p>
            {it.intents.map((v, i) => (
              <div key={i} className="issue-intent">
                <div className="issue-intent__label">
                  {it.intents.length > 1 ? `${i + 1}. ` : ''}{v.label}
                </div>
                <p className="issue-intent__text">{v.text}</p>
              </div>
            ))}
          </div>
        )}

        <IssueBlock icon={<IconHome size={16} />} label="나한테 무슨 상관?" text={it.impact} highlight />
        <IssueBlock icon={<IconWatch size={16} />} label="앞으로 이걸 보면 됩니다" text={it.watch} />

        {it.eventId && (
          <button className="issue-goto" onClick={() => onOpenEvent(it.eventId!)}>
            이 뉴스 원문·진영별 시각 보기 ›
          </button>
        )}
      </div>
    )
  }

  // 목록
  return (
    <div className="screen">
      <div className="page-head">
        <div className="page-head__title">이슈 해설</div>
        <div className="page-head__sub">
          요즘 이슈, 무슨 뜻이고 나한테 무슨 상관인지 쉽게 풀어드려요.
        </div>
      </div>

      {issues.length === 0 ? (
        <div className="placeholder-empty" style={{ height: '40vh' }}>
          <div className="placeholder-empty__icon"><IconSearch size={40} /></div>
          <div className="placeholder-empty__text">아직 해설이 없어요</div>
        </div>
      ) : (
        issues.map((it, i) => (
          <button key={i} className="issue-card" onClick={() => onOpenIssue(i)}>
            <Thumbnail src={it.imageUrl} ogUrl={it.imageSourceUrl} className="thumb--issue" />
            <div className="issue-card__body">
              <div className="issue-card__cat">{it.category}</div>
              <div className="issue-card__title">{it.title}</div>
              <div className="issue-card__one">{it.oneLine}</div>
              <span className="issue-card__more">쉽게 풀어보기 ›</span>
            </div>
          </button>
        ))
      )}
    </div>
  )
}

// 긴 글은 문장 두 개씩 묶어 문단으로 — 한 덩어리로 붙어 있으면 읽기 힘들다
function toParagraphs(text: string): string[] {
  const out: string[] = []
  for (const chunk of text.split(/\n+/)) {
    const ss = splitSentences(chunk)
    for (let i = 0; i < ss.length; i += 2) out.push(ss.slice(i, i + 2).join(' '))
  }
  return out.filter(Boolean)
}

function IssueBlock({ icon, label, text, highlight }: { readonly icon: ReactNode; readonly label: string; readonly text: string; readonly highlight?: boolean }) {
  if (!text) return null
  return (
    <div className={`issue-block ${highlight ? 'issue-block--hl' : ''}`}>
      <div className="issue-block__label">{icon}{label}</div>
      {toParagraphs(text).map((p, i) => (
        <p key={i} className="issue-block__text">{p}</p>
      ))}
    </div>
  )
}
