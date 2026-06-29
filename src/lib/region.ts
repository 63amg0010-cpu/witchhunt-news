import type { NewsEvent } from '../types'

export const REGIONS = ['전체', '미국', '중국', '일본', '북한', '러시아·우크라이나', '중동', '유럽', '기타'] as const

const REGION_KEYWORDS = [
  { region: '북한', keywords: ['북한', '김정은', '평양', '北', '노동신문', '북·러', '대남'] },
  { region: '러시아·우크라이나', keywords: ['러시아', '우크라', '푸틴', '젤렌스키', '모스크바', '키이우', '나토', '러·'] },
  { region: '중동', keywords: ['이스라엘', '이란', '하마스', '헤즈볼라', '가자', '중동', '호르무즈', '팔레스타인', '시리아', '사우디', '예멘'] },
  { region: '미국', keywords: ['미국', '트럼프', '바이든', '워싱턴', '백악관', '펜타곤', '연준', '美', '미·', '뉴욕증시'] },
  { region: '중국', keywords: ['중국', '시진핑', '베이징', '대만', '中', '중·'] },
  { region: '일본', keywords: ['일본', '도쿄', '이시바', '기시다', '日', '일·'] },
  { region: '유럽', keywords: ['유럽', 'EU', '프랑스', '독일', '영국', '이탈리아', '브뤼셀'] },
] as const

export function eventRegion(ev: NewsEvent): string {
  for (const { region, keywords } of REGION_KEYWORDS) {
    if (keywords.some((keyword) => ev.title.includes(keyword))) return region
  }
  return '기타'
}
