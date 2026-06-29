import type { DebatesData } from '../types'

// 미리 만들어둔 AI 토론 데이터를 불러온다 (없으면 null)
export async function fetchDebates(): Promise<DebatesData | null> {
  try {
    const r = await fetch('/debates.json', { cache: 'no-store' })
    if (!r.ok) return null
    const data = (await r.json()) as DebatesData
    if (!data.threads || data.threads.length === 0) return null
    return data
  } catch {
    return null
  }
}
