// 이슈 해설 데이터 불러오기 (public/issues.json)
import type { IssueExplain } from '../types'

export function formatIssueDate(iso?: string): string | null {
  if (!iso) return null

  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return null

  const year = date.getFullYear()
  const month = date.getMonth() + 1
  const day = date.getDate()

  return year === new Date().getFullYear()
    ? `${month}월 ${day}일`
    : `${year}년 ${month}월 ${day}일`
}

export async function fetchIssues(): Promise<{ issues: IssueExplain[]; generatedAt?: string }> {
  try {
    const r = await fetch('/issues.json', { cache: 'no-store' })
    if (!r.ok) return { issues: [] }
    const data = (await r.json()) as { issues?: IssueExplain[]; generatedAt?: string }
    return { issues: data.issues ?? [], generatedAt: data.generatedAt }
  } catch {
    return { issues: [] }
  }
}
