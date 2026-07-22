// 이슈 해설 데이터 불러오기 (public/issues.json)
import type { IssueExplain } from '../types'

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
