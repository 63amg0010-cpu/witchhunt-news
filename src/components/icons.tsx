import type { ReactNode } from 'react'

interface IconProps {
  readonly size?: number
  readonly className?: string
}

function IconFrame({ size = 20, className, children }: IconProps & { readonly children: ReactNode }) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      height={size}
      viewBox="0 0 24 24"
      width={size}
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {children}
    </svg>
  )
}

export function IconHome(props: IconProps) {
  return <IconFrame {...props}><path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1Z" /></IconFrame>
}

export function IconSearch(props: IconProps) {
  return <IconFrame {...props}><circle cx="11" cy="11" r="6.5" /><path d="m16 16 4.5 4.5" /></IconFrame>
}

export function IconAlert(props: IconProps) {
  return <IconFrame {...props}><path d="M10.3 3.7 2.9 17a2 2 0 0 0 1.7 3h14.8a2 2 0 0 0 1.7-3L13.7 3.7a2 2 0 0 0-3.4 0Z" /><path d="M12 9v4" /><path d="M12 16.5h.01" /></IconFrame>
}

export function IconInfo(props: IconProps) {
  return <IconFrame {...props}><circle cx="12" cy="12" r="8.5" /><path d="M12 11v5" /><path d="M12 8h.01" /></IconFrame>
}

export function IconNews(props: IconProps) {
  return <IconFrame {...props}><rect x="3" y="5" width="18" height="14" rx="1.5" /><path d="M7 9h6M7 13h10M7 16h7M16.5 9h.01" /></IconFrame>
}

export function IconEye(props: IconProps) {
  return <IconFrame {...props}><path d="M2.5 12s3.5-5.5 9.5-5.5 9.5 5.5 9.5 5.5-3.5 5.5-9.5 5.5S2.5 12 2.5 12Z" /><circle cx="12" cy="12" r="2.5" /></IconFrame>
}

export function IconBulb(props: IconProps) {
  return <IconFrame {...props}><path d="M8.5 15.5c-1.2-1-2-2.5-2-4.3a5.5 5.5 0 1 1 11 0c0 1.8-.8 3.3-2 4.3-.7.6-1 1.3-1.1 2H9.6c-.1-.7-.4-1.4-1.1-2Z" /><path d="M10 21h4M9.7 18.5h4.6" /></IconFrame>
}

export function IconTarget(props: IconProps) {
  return <IconFrame {...props}><circle cx="12" cy="12" r="8.5" /><circle cx="12" cy="12" r="4" /><path d="M12 3v2M21 12h-2M12 21v-2M3 12h2" /></IconFrame>
}

export function IconWatch(props: IconProps) {
  return <IconFrame {...props}><path d="M3.5 12s3.2-5.5 8.5-5.5 8.5 5.5 8.5 5.5-3.2 5.5-8.5 5.5S3.5 12 3.5 12Z" /><circle cx="12" cy="12" r="2.5" /></IconFrame>
}

export function IconPieces(props: IconProps) {
  return <IconFrame {...props}><path d="M9.5 4.5a2 2 0 1 1 3 1.7V9h2.8a2 2 0 1 1 1.7 3H12.5v2.8a2 2 0 1 1-3 1.7H5V12H3.2a2 2 0 1 1 1.7-3H9.5Z" /><path d="M5 16.5v3h11v-3" /></IconFrame>
}

export function IconCheck(props: IconProps) {
  return <IconFrame {...props}><circle cx="12" cy="12" r="8.5" /><path d="m8.2 12.1 2.5 2.5 5.3-5.3" /></IconFrame>
}
