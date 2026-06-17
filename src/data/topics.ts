// =====================================================================
// "관심 이슈 키워드" 목록
// 각 키워드로 실제 뉴스를 검색해 → 하나의 "사건 묶음"으로 만듭니다.
// 키워드는 자유롭게 추가/삭제/수정할 수 있습니다.
// (나중에는 '실시간 인기 검색어'로 자동화할 수도 있습니다.)
// =====================================================================
import type { NewsEvent } from '../types'

export interface Topic {
  id: string
  query: string // 실제로 뉴스에 검색할 말
  category: NewsEvent['category']
}

export const TOPICS: Topic[] = [
  // --- 정치 ---
  { id: 'p1', query: '대통령실', category: '정치' },
  { id: 'p2', query: '국회', category: '정치' },
  { id: 'p3', query: '여야 협상', category: '정치' },
  { id: 'p4', query: '외교 안보', category: '정치' },
  { id: 'p5', query: '특검', category: '정치' },
  { id: 'p6', query: '선거', category: '정치' },

  // --- 경제 ---
  { id: 'e1', query: '기준금리', category: '경제' },
  { id: 'e2', query: '부동산', category: '경제' },
  { id: 'e3', query: '물가', category: '경제' },
  { id: 'e4', query: '환율 증시', category: '경제' },
  { id: 'e5', query: '수출', category: '경제' },
  { id: 'e6', query: '고용 일자리', category: '경제' },

  // --- 사회 ---
  { id: 's1', query: '의대 정원', category: '사회' },
  { id: 's2', query: '검찰 수사', category: '사회' },
  { id: 's3', query: '노동 파업', category: '사회' },
  { id: 's4', query: '교육 정책', category: '사회' },
  { id: 's5', query: '재난 사고', category: '사회' },
  { id: 's6', query: '복지', category: '사회' },

  // --- 국제 ---
  { id: 'i1', query: '북한', category: '국제' },
  { id: 'i2', query: '트럼프 미국', category: '국제' },
  { id: 'i3', query: '중국', category: '국제' },
  { id: 'i4', query: '일본', category: '국제' },
  { id: 'i5', query: '중동 정세', category: '국제' },
  { id: 'i6', query: '우크라이나', category: '국제' },
]
