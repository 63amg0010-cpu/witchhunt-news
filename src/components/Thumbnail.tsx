import { useEffect, useState } from 'react'
import { IconNews } from './icons'

interface Props {
  src?: string // 바로 쓸 사진 주소 (feed.json의 실제 og:image, 또는 샘플 사진)
  ogUrl?: string // 기사 주소 — 실제 사진이 없을 때 /og 중계로 찾아온다 (개발 서버 전용)
  className?: string
}

// 썸네일 사진.
// - src에 이미 진짜 사진 주소가 있으면(빌드 때 feed.json에 넣어둔 og:image) 그대로 쓴다. (배포 환경)
// - 진짜 사진이 없고 ogUrl만 있으면 /og 중계로 찾아온다. (개발 서버 전용)
// - 둘 다 없으면 회색 자리표시를 보인다.
export default function Thumbnail({ src, ogUrl, className }: Props) {
  // picsum(샘플 자리표시)이 아닌 실제 사진 주소면 바로 사용
  const direct = src && !src.includes('picsum') ? src : null
  // /og 로 찾아온 사진(개발용)만 상태로 둔다. 실제 사진(direct)은 매 렌더에서 props로 직접 계산해 항상 최신.
  const [fetched, setFetched] = useState<string | null>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    // 사건(props)이 바뀌면 항상 상태를 초기화 — 이전 사건 사진이 남는 문제 방지
    setFetched(null)
    setFailed(false)
    if (direct || !ogUrl) return // 이미 실제 사진이 있으면 /og 호출 안 함
    let alive = true
    fetch(`/og?url=${encodeURIComponent(ogUrl)}`)
      .then((r) => r.json())
      .then((d: { image?: string }) => {
        if (!alive) return
        if (d.image) setFetched(d.image)
        else setFailed(true)
      })
      .catch(() => {
        if (alive) setFailed(true)
      })
    return () => {
      alive = false
    }
  }, [ogUrl, direct])

  // 보여줄 사진: 실제 사진(현재 props) → /og로 찾은 사진 → (ogUrl 없으면) 샘플 src
  const image = direct ?? fetched ?? (ogUrl ? null : (src ?? null))
  const show = !!image && !failed

  return (
    <div className={`thumb ${className ?? ''}`}>
      {show && (
        <img className="thumb__img" src={image} alt="" loading="lazy" onError={() => setFailed(true)} />
      )}
      <span className="thumb__icon"><IconNews size={28} /></span>
    </div>
  )
}
