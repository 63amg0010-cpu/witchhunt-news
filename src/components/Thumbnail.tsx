import { useEffect, useState } from 'react'

interface Props {
  src?: string // 바로 쓸 사진 주소 (샘플 데이터용)
  ogUrl?: string // 기사 주소 — 여기서 실제 대표사진(og:image)을 찾아온다
  className?: string
}

// 썸네일 사진.
// - src에 이미 진짜 사진 주소가 있으면(빌드 때 feed.json에 넣어둔 og:image) 그대로 쓴다. (배포 환경)
// - 진짜 사진이 없고 ogUrl만 있으면 /og 중계로 찾아온다. (개발 서버 전용)
// - 둘 다 없으면 회색 자리표시.
export default function Thumbnail({ src, ogUrl, className }: Props) {
  // picsum(샘플 자리표시)이 아닌 실제 사진 주소면 바로 사용
  const direct = src && !src.includes('picsum') ? src : null
  const [image, setImage] = useState<string | null>(direct ?? (ogUrl ? null : (src ?? null)))
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    if (direct || !ogUrl) return // 이미 실제 사진이 있으면 /og 호출 안 함
    let alive = true
    setImage(null)
    setFailed(false)
    fetch(`/og?url=${encodeURIComponent(ogUrl)}`)
      .then((r) => r.json())
      .then((d: { image?: string }) => {
        if (!alive) return
        if (d.image) setImage(d.image)
        else setFailed(true)
      })
      .catch(() => {
        if (alive) setFailed(true)
      })
    return () => {
      alive = false
    }
  }, [ogUrl, direct])

  const show = image && !failed

  return (
    <div className={`thumb ${className ?? ''}`}>
      {show && (
        <img className="thumb__img" src={image} alt="" loading="lazy" onError={() => setFailed(true)} />
      )}
      <span className="thumb__icon">📰</span>
    </div>
  )
}
