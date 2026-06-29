// 앱 전체에서 쓰는 데이터 모양(타입) 정의

// 성향: 진보 / 중도 / 보수
export type Lean = 'prog' | 'center' | 'cons'

// 성향 비율(%) — 세 값의 합은 100
export interface BiasRatio {
  prog: number
  center: number
  cons: number
}

// 언론사별 기사 하나
export interface Article {
  id: string
  outlet: string // 언론사명 (가상)
  lean: Lean // 그 언론사의 성향
  title: string // 그 언론사가 뽑은 제목
  url: string // 원문 링크 (1단계에서는 가상)
  timeAgo?: string // 그 기사 보도 시각 ("3시간 전") — 있을 때만
  summary?: string // 기사 간단 요약 (네이버 검색 결과의 설명) — 있을 때만
}

// 사건(이슈) 하나
export interface NewsEvent {
  id: string
  category: '정치' | '경제' | '사회' | '국제' | '주식' | '크립토' | '예측시장'
  title: string
  imageUrl: string // 기본/대체 썸네일 (샘플 데이터용 사진)
  imageSourceUrl?: string // 대표기사 주소 — 여기서 실제 사진(og:image)을 가져옴
  summary?: string // 사건 간단 요약 (대표 기사 요약) — 있을 때만
  background?: string // 사건 배경 설명 (맥락) — 있을 때만
  importance?: number // 코덱스가 매긴 중요도 1~10 (정렬용) — 있을 때만
  publicTake?: string // 네티즌 반응 — 공감 많은 댓글들의 '전체 분위기' 한 줄 — 있을 때만
  outletCount: number // 보도 언론사 수 (보도량 = 정렬 보조)
  timeAgo: string // "3시간 전" 같은 표시
  publishedAt?: string // 대표기사 보도 시각(ISO) — 최신순 정렬·시간 재계산용
  firstSeen?: string // 피드에 처음 등장한 시각(ISO) — 시각 추정 보조
  bias: BiasRatio
  biasWarning: boolean // 한쪽 진영만 집중 보도 중인지
  dominantLean?: Lean // 편향 경고일 때 어느 쪽으로 쏠렸는지
  frameProg: string // 진보 매체 제목 (프레임 차이 비교용)
  frameCons: string // 보수 매체 제목
  articles: Article[]
}

// 성향 한글 이름
export const LEAN_LABEL: Record<Lean, string> = {
  prog: '진보',
  center: '중도',
  cons: '보수',
}

export interface DebatePersona {
  id: string
  name: string
  initial: string
  role: string
  bio: string
}
export interface DebateMessage {
  id: string
  personaId: string
  replyTo: string | null
  text: string
}
export interface DebateThread {
  id: string
  eventId?: string | null
  category: string
  title: string
  issueSummary: string
  messages: DebateMessage[]
  pointSummary: string
}
export interface DebatesData {
  generatedAt?: string
  personas: DebatePersona[]
  threads: DebateThread[]
}
