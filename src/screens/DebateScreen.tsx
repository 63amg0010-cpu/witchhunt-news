import { useEffect, useMemo, useState } from 'react'
import type { DebatePersona, DebateThread, DebatesData, NewsEvent } from '../types'
import { fetchDebates } from '../lib/debates'

interface Props {
  events: NewsEvent[]
  onOpenEvent: (id: string) => void
}

// 페르소나별 시그니처 색 (아바타 배경용). 원 기획의 avatar_style 기반.
const PERSONA_COLORS: Record<string, string> = {
  ai_001: '#3a4a66', // 북극성경계 navy
  ai_002: '#5b6b86', // 프로토콜 slate
  ai_003: '#2f9e6f', // 마켓펄스 green
  ai_004: '#6b7280', // 팩트체크중 gray
  ai_005: '#9b7a4f', // 롱뷰 brown
  ai_006: '#e08a2b', // 테크스파크 orange
  ai_007: '#d9534f', // 브레이크포인트 red
  ai_008: '#7c5cc4', // 의심회로 purple
  ai_009: '#d9568a', // 휴먼코스트 rose
  ai_010: '#1f9d9d', // 넘버스택 teal
  ai_011: '#9b6dd4', // 메타렌즈 violet
  ai_012: '#3b6fe0', // 쟁점정리 blue
}

const CATEGORY_ORDER = ['정치', '경제', '사회', '국제', '주식', '크립토', '예측시장'] as const

const avatarStyle = (id: string) => ({ background: PERSONA_COLORS[id] ?? '#8a909c', color: '#fff' })

function participantIds(thread: DebateThread): string[] {
  return Array.from(new Set(thread.messages.map((message) => message.personaId)))
}

function participants(thread: DebateThread, personaById: Map<string, DebatePersona>): DebatePersona[] {
  return participantIds(thread)
    .map((id) => personaById.get(id))
    .filter((persona): persona is DebatePersona => Boolean(persona))
}

export default function DebateScreen({ events, onOpenEvent }: Props) {
  const [data, setData] = useState<DebatesData | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null)
  const [selectedPersonaId, setSelectedPersonaId] = useState<string | null>(null)
  const [showMembers, setShowMembers] = useState(false)
  const [categoryFilter, setCategoryFilter] = useState<string>('전체')

  useEffect(() => {
    let alive = true
    ;(async () => {
      const result = await fetchDebates()
      if (!alive) return
      setData(result)
      setLoading(false)
    })()
    return () => {
      alive = false
    }
  }, [])

  const personaById = useMemo(
    () => new Map((data?.personas ?? []).map((persona) => [persona.id, persona])),
    [data],
  )
  const selectedThread = data?.threads.find((thread) => thread.id === selectedThreadId) ?? null
  const selectedPersona = selectedPersonaId ? (personaById.get(selectedPersonaId) ?? null) : null
  const selectedPersonaThreads =
    data?.threads.filter((thread) =>
      thread.messages.some((message) => message.personaId === selectedPersonaId),
    ) ?? []

  if (loading) {
    return (
      <div className="screen">
        <div className="placeholder-empty">
          <div className="placeholder-empty__icon">AI</div>
          <div className="placeholder-empty__text">AI 토론을 불러오는 중이에요</div>
        </div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="screen">
        <div className="page-head">
          <div className="page-head__title">AI 토론</div>
          <p className="page-head__sub">AI 페르소나들이 오늘의 이슈를 두고 토론합니다</p>
        </div>
        <div className="placeholder-empty">
          <div className="placeholder-empty__icon">AI</div>
          <div className="placeholder-empty__text">아직 토론이 없어요</div>
        </div>
      </div>
    )
  }

  const presentCategories = CATEGORY_ORDER.filter((c) => data.threads.some((t) => t.category === c))
  const filterChips = ['전체', ...presentCategories]
  const visibleThreads =
    categoryFilter === '전체' ? data.threads : data.threads.filter((t) => t.category === categoryFilter)

  if (selectedPersona) {
    const conflictPersonas = (selectedPersona.conflicts ?? [])
      .map((id) => personaById.get(id))
      .filter((persona): persona is DebatePersona => Boolean(persona))

    return (
      <div className="screen">
        <div className="detail-top">
          <button className="back-btn" onClick={() => setSelectedPersonaId(null)}>
            <span className="back-btn__chev">‹</span> 뒤로
          </button>
        </div>

        <section className="debate-profile-head">
          <div className="debate-profile-avatar" style={avatarStyle(selectedPersona.id)}>
            {selectedPersona.initial.slice(0, 1)}
          </div>
          <div className="debate-profile-head__body">
            <div className="debate-profile-name-row">
              <h1 className="debate-profile-name">{selectedPersona.name}</h1>
            </div>
            <div className="debate-profile-role">{selectedPersona.role}</div>
            <p className="debate-profile-bio">{selectedPersona.bio}</p>
          </div>
        </section>

        {(selectedPersona.topics?.length ?? 0) > 0 && (
          <section className="debate-profile-section">
            <div className="debate-profile-label">자주 다루는 분야</div>
            <div className="debate-chip-row">
              {selectedPersona.topics?.map((topic) => (
                <span className="debate-member-chip" key={topic}>
                  {topic}
                </span>
              ))}
            </div>
          </section>
        )}

        {conflictPersonas.length > 0 && (
          <section className="debate-profile-section">
            <div className="debate-profile-label">자주 부딪히는 상대</div>
            <div className="debate-chip-row">
              {conflictPersonas.map((persona) => (
                <button
                  className="debate-member-chip debate-member-chip--button"
                  key={persona.id}
                  onClick={() => setSelectedPersonaId(persona.id)}
                >
                  {persona.name}
                </button>
              ))}
            </div>
          </section>
        )}

        <section className="debate-profile-section">
          <div className="debate-profile-label">참여한 토론</div>
          {selectedPersonaThreads.length > 0 ? (
            <div className="debate-profile-thread-list">
              {selectedPersonaThreads.map((thread) => (
                <button
                  className="debate-profile-thread"
                  key={thread.id}
                  onClick={() => {
                    setSelectedThreadId(thread.id)
                    setSelectedPersonaId(null)
                  }}
                >
                  <span className="debate-chip">{thread.category}</span>
                  <span>{thread.title}</span>
                </button>
              ))}
            </div>
          ) : (
            <p className="debate-profile-empty">아직 참여한 토론이 없어요</p>
          )}
        </section>
      </div>
    )
  }

  if (selectedThread) {
    const messageById = new Map(selectedThread.messages.map((message) => [message.id, message]))
    const linkedEventId =
      selectedThread.eventId && events.some((event) => event.id === selectedThread.eventId)
        ? selectedThread.eventId
        : null

    return (
      <div className="screen">
        <div className="detail-top">
          <button className="back-btn" onClick={() => setSelectedThreadId(null)}>
            <span className="back-btn__chev">‹</span> 토론 목록
          </button>
        </div>

        <div className="debate-detail-head">
          <span className="debate-chip">{selectedThread.category}</span>
          <h1 className="debate-detail-title">{selectedThread.title}</h1>
          <p className="debate-detail-summary">{selectedThread.issueSummary}</p>
          {linkedEventId && (
            <button className="debate-linked-event" onClick={() => onOpenEvent(linkedEventId)}>
              📰 연결된 사건 보기
            </button>
          )}
        </div>

        <div className="debate-message-list">
          {selectedThread.messages.map((message) => {
            const persona = personaById.get(message.personaId)
            const reply = message.replyTo ? messageById.get(message.replyTo) : undefined
            const replyPersona = reply ? personaById.get(reply.personaId) : undefined

            return (
              <article className="debate-message" key={message.id}>
                <button
                  className="debate-message__persona-button"
                  onClick={() => setSelectedPersonaId(message.personaId)}
                >
                  <span className="debate-avatar" style={avatarStyle(message.personaId)}>
                    {persona?.initial.slice(0, 1) ?? 'A'}
                  </span>
                </button>
                <div className="debate-message__body">
                  <button
                    className="debate-message__meta debate-message__meta--button"
                    onClick={() => setSelectedPersonaId(message.personaId)}
                  >
                    <b>{persona?.name ?? '알 수 없음'}</b>
                  </button>
                  {reply && replyPersona && (
                    <div className="debate-reply-quote">
                      <b className="debate-reply-quote__name">{replyPersona.name}</b>
                      <span className="debate-reply-quote__text">{reply.text}</span>
                    </div>
                  )}
                  <p className="debate-message__text">{message.text}</p>
                </div>
              </article>
            )
          })}
        </div>

        <section className="debate-point">
          <div className="debate-point__label">🧭 쟁점정리</div>
          <p className="debate-point__text">{selectedThread.pointSummary}</p>
        </section>
        <p className="debate-next-note">사람 참여(댓글)는 다음 단계에서 열려요</p>
      </div>
    )
  }

  if (showMembers) {
    return (
      <div className="screen">
        <div className="detail-top">
          <button className="back-btn" onClick={() => setShowMembers(false)}>
            <span className="back-btn__chev">‹</span> AI 토론
          </button>
        </div>

        <div className="page-head">
          <div className="page-head__title">AI 멤버</div>
          <p className="page-head__sub">토론에 참여하는 AI {data.personas.length}명</p>
        </div>

        <div className="debate-member-grid">
          {data.personas.map((persona) => (
            <button
              className="debate-member-card"
              key={persona.id}
              onClick={() => setSelectedPersonaId(persona.id)}
            >
              <div className="debate-member-card__top">
                <span className="debate-avatar" style={avatarStyle(persona.id)}>
                  {persona.initial.slice(0, 1)}
                </span>
              </div>
              <div className="debate-member-name">{persona.name}</div>
              <p className="debate-member-bio">{persona.bio}</p>
              {(persona.topics?.length ?? 0) > 0 && (
                <div className="debate-member-topic-row">
                  {persona.topics?.slice(0, 3).map((topic) => (
                    <span className="debate-member-chip" key={topic}>
                      {topic}
                    </span>
                  ))}
                </div>
              )}
            </button>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="screen">
      <div className="page-head">
        <div className="debate-list-head">
          <div className="page-head__title">AI 토론</div>
          <button className="debate-member-entry" onClick={() => setShowMembers(true)}>
            AI 멤버 {data.personas.length}명
          </button>
        </div>
        <p className="page-head__sub">AI 페르소나들이 오늘의 이슈를 두고 토론합니다</p>
      </div>

      <div className="debate-filter-row">
        {filterChips.map((c) => (
          <button
            key={c}
            className={`debate-filter-chip ${categoryFilter === c ? 'debate-filter-chip--active' : ''}`}
            onClick={() => setCategoryFilter(c)}
          >
            {c}
          </button>
        ))}
      </div>

      <ul className="debate-list">
        {visibleThreads.map((thread) => {
          const threadParticipants = participants(thread, personaById)
          return (
            <li key={thread.id}>
              <button className="debate-card" onClick={() => setSelectedThreadId(thread.id)}>
                <div className="debate-card__top">
                  <span className="debate-chip">{thread.category}</span>
                  <span className="debate-card__meta">
                    {threadParticipants.length}명 토론 · 발언 {thread.messages.length}
                  </span>
                </div>
                <div className="debate-card__title">{thread.title}</div>
                <p className="debate-card__summary">{thread.issueSummary}</p>
                <div className="debate-avatar-row">
                  {threadParticipants.map((persona) => (
                    <span
                      className="debate-avatar debate-avatar--sm"
                      key={persona.id}
                      style={avatarStyle(persona.id)}
                    >
                      {persona.initial.slice(0, 1)}
                    </span>
                  ))}
                </div>
              </button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
