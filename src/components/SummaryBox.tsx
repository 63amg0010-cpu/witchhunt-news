import { useEffect, useRef, useState } from 'react'
import { splitSentences } from '../lib/text'

interface Props {
  url?: string // 기사 주소 — 여기서 AI 요약 / 원문 설명문을 가져온다
  fallback?: string // 네이버가 준 짧은 요약 (먼저 보여줄 기본값)
}

// 간단 요약 박스. 더 좋은 요약이 오면 그걸로 교체한다.
// 우선순위(등급): 네이버 요약(1) < 원문 설명문(2) < AI 요약(3)
export default function SummaryBox({ url, fallback }: Props) {
  // 이미 충실한 요약(미리 만든 피드의 AI 요약 등)이면 높은 등급으로 시작 → 덮어쓰지 않음
  const startRank = (s?: string) => (s ? (s.length >= 40 ? 3 : 1) : 0)

  const [text, setText] = useState(fallback ?? '')
  const [label, setLabel] = useState('간단 요약')
  const rank = useRef(startRank(fallback))

  useEffect(() => {
    setText(fallback ?? '')
    setLabel('간단 요약')
    rank.current = startRank(fallback)
    if (!url) return
    let alive = true

    // 더 높은 등급의 요약일 때만 교체 (늦게 와도 등급으로 판단해 꼬임 방지)
    const apply = (newText: string, newRank: number, newLabel: string) => {
      if (!alive) return
      const t = newText.trim()
      if (!t || newRank < rank.current) return
      rank.current = newRank
      setText(t)
      setLabel(newLabel)
    }

    fetch(`/og?url=${encodeURIComponent(url)}`)
      .then((r) => r.json())
      .then((d: { description?: string }) => {
        const desc = (d.description ?? '').trim()
        if (desc.length >= 20) apply(desc, 2, '간단 요약')
      })
      .catch(() => {})

    fetch(`/summarize?url=${encodeURIComponent(url)}`)
      .then((r) => r.json())
      .then((d: { summary?: string }) => apply(d.summary ?? '', 3, 'AI 요약'))
      .catch(() => {})

    return () => {
      alive = false
    }
  }, [url, fallback])

  if (!text) return null
  return (
    <div className="article-summary">
      <div className="article-summary__label">{label}</div>
      <div className="article-summary__body">
        {splitSentences(text).map((s, i) => (
          <p key={i} className="article-summary__line">{s}</p>
        ))}
      </div>
    </div>
  )
}
