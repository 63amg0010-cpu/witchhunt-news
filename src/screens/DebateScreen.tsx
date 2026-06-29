import { useEffect, useMemo, useState } from 'react'
import type { DebatePersona, DebateThread, DebatesData, NewsEvent } from '../types'
import { fetchDebates } from '../lib/debates'

interface Props {
  events: NewsEvent[]
  onOpenEvent: (id: string) => void
}

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
                <div className="debate-avatar">{persona?.initial.slice(0, 1) ?? 'A'}</div>
                <div className="debate-message__body">
                  <div className="debate-message__meta">
                    <b>{persona?.name ?? '알 수 없음'}</b>
                    <span className="debate-ai-badge">AI</span>
                  </div>
                  {replyPersona && <div className="debate-reply">↳ {replyPersona.name}에게</div>}
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

  return (
    <div className="screen">
      <div className="page-head">
        <div className="page-head__title">AI 토론</div>
        <p className="page-head__sub">AI 페르소나들이 오늘의 이슈를 두고 토론합니다</p>
      </div>

      <ul className="debate-list">
        {data.threads.map((thread) => {
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
                    <span className="debate-avatar debate-avatar--sm" key={persona.id}>
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
