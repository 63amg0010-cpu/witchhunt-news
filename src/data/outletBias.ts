import type { Lean } from '../types'

// =====================================================================
// 언론사 성향(진보/중도/보수) 참고 목록
// ---------------------------------------------------------------------
// 중요: 이 표는 "절대적 판정"이 아니라 참고용 분류입니다.
//   - 언론사 성향은 보는 사람·사안에 따라 다르게 평가될 수 있습니다.
//   - 여기 값은 일반적으로 흔히 거론되는 분류를 바탕으로 한 예시이며,
//     언제든지 자유롭게 수정할 수 있습니다. (앱 전체에 "참고용" 표시 유지)
//   - 구글 뉴스가 돌려주는 언론사 이름(<source>)과 똑같이 키를 맞춰야 인식됩니다.
//   - 목록에 없는 언론사는 '미분류'로 처리되어 성향 비율 계산에서 빠집니다.
// =====================================================================

// 'unknown' = 목록에 없는(미분류) 언론사
export type OutletLean = Lean | 'unknown'

const OUTLET_LEAN: Record<string, Lean> = {
  // --- 진보 성향으로 흔히 분류 ---
  한겨레: 'prog',
  경향신문: 'prog',
  오마이뉴스: 'prog',
  프레시안: 'prog',
  미디어오늘: 'prog',
  뉴스타파: 'prog',
  MBC: 'prog',
  민중의소리: 'prog',

  // --- 중도/통신·공영 등으로 흔히 분류 ---
  연합뉴스: 'center',
  연합뉴스TV: 'center',
  뉴스1: 'center',
  뉴시스: 'center',
  KBS: 'center',
  YTN: 'center',
  한국일보: 'center',
  서울신문: 'center',
  국민일보: 'center',
  노컷뉴스: 'center',
  JTBC: 'center',
  머니투데이: 'center',
  아시아경제: 'center',
  헤럴드경제: 'center',
  이데일리: 'center',
  파이낸셜뉴스: 'center',
  중앙일보: 'center',

  // --- 보수 성향으로 흔히 분류 ---
  조선일보: 'cons',
  동아일보: 'cons',
  문화일보: 'cons',
  세계일보: 'cons',
  TV조선: 'cons',
  채널A: 'cons',
  MBN: 'cons',
  한국경제: 'cons',
  매일경제: 'cons',
  서울경제: 'cons',
  디지털타임스: 'cons',
  '데일리안': 'cons',
}

// 언론사 이름으로 성향을 찾는다. 약간의 표기 차이도 흡수.
export function leanOf(outlet: string): OutletLean {
  if (!outlet) return 'unknown'
  const name = outlet.trim()
  if (OUTLET_LEAN[name]) return OUTLET_LEAN[name]
  // 부분 일치(예: "조선일보 PDF", "MBC뉴스" 등) 보조 검색
  for (const key of Object.keys(OUTLET_LEAN)) {
    if (name.includes(key)) return OUTLET_LEAN[key]
  }
  return 'unknown'
}

// =====================================================================
// 기사 주소(도메인) → 언론사 이름 + 성향
// 네이버 검색은 언론사 이름을 안 주고 기사 주소(originallink)를 주므로,
// 주소의 도메인을 보고 어느 언론사인지 알아낸다. (이 표도 자유롭게 수정 가능)
// =====================================================================
const DOMAIN_OUTLET: Record<string, { name: string; lean: Lean }> = {
  // 진보
  'hani.co.kr': { name: '한겨레', lean: 'prog' },
  'khan.co.kr': { name: '경향신문', lean: 'prog' },
  'ohmynews.com': { name: '오마이뉴스', lean: 'prog' },
  'pressian.com': { name: '프레시안', lean: 'prog' },
  'mediatoday.co.kr': { name: '미디어오늘', lean: 'prog' },
  'newstapa.org': { name: '뉴스타파', lean: 'prog' },
  'vop.co.kr': { name: '민중의소리', lean: 'prog' },
  'imbc.com': { name: 'MBC', lean: 'prog' },

  // 중도/통신·공영
  'yna.co.kr': { name: '연합뉴스', lean: 'center' },
  'yonhapnewstv.co.kr': { name: '연합뉴스TV', lean: 'center' },
  'news1.kr': { name: '뉴스1', lean: 'center' },
  'newsis.com': { name: '뉴시스', lean: 'center' },
  'kbs.co.kr': { name: 'KBS', lean: 'center' },
  'ytn.co.kr': { name: 'YTN', lean: 'center' },
  'sbs.co.kr': { name: 'SBS', lean: 'center' },
  'hankookilbo.com': { name: '한국일보', lean: 'center' },
  'seoul.co.kr': { name: '서울신문', lean: 'center' },
  'kmib.co.kr': { name: '국민일보', lean: 'center' },
  'nocutnews.co.kr': { name: '노컷뉴스', lean: 'center' },
  'jtbc.co.kr': { name: 'JTBC', lean: 'center' },
  'mt.co.kr': { name: '머니투데이', lean: 'center' },
  'asiae.co.kr': { name: '아시아경제', lean: 'center' },
  'heraldcorp.com': { name: '헤럴드경제', lean: 'center' },
  'edaily.co.kr': { name: '이데일리', lean: 'center' },
  'fnnews.com': { name: '파이낸셜뉴스', lean: 'center' },
  'joongang.co.kr': { name: '중앙일보', lean: 'center' },
  'joins.com': { name: '중앙일보', lean: 'center' },

  // 보수
  'chosun.com': { name: '조선일보', lean: 'cons' },
  'donga.com': { name: '동아일보', lean: 'cons' },
  'munhwa.com': { name: '문화일보', lean: 'cons' },
  'segye.com': { name: '세계일보', lean: 'cons' },
  'tvchosun.com': { name: 'TV조선', lean: 'cons' },
  'ichannela.com': { name: '채널A', lean: 'cons' },
  'mbn.co.kr': { name: 'MBN', lean: 'cons' },
  'hankyung.com': { name: '한국경제', lean: 'cons' },
  'mk.co.kr': { name: '매일경제', lean: 'cons' },
  'sedaily.com': { name: '서울경제', lean: 'cons' },
  'dt.co.kr': { name: '디지털타임스', lean: 'cons' },
  'dailian.co.kr': { name: '데일리안', lean: 'cons' },
}

// 화면(언론사 성향 분류표)에서 쓰도록, 성향별 언론사 이름 목록을 만들어 둔다.
export const OUTLETS_BY_LEAN: Record<Lean, string[]> = (() => {
  const groups: Record<Lean, Set<string>> = { prog: new Set(), center: new Set(), cons: new Set() }
  for (const { name, lean } of Object.values(DOMAIN_OUTLET)) groups[lean].add(name)
  return {
    prog: [...groups.prog],
    center: [...groups.center],
    cons: [...groups.cons],
  }
})()

// 기사 주소에서 언론사 이름+성향을 찾는다. 못 찾으면 null.
export function outletFromUrl(url: string): { name: string; lean: Lean } | null {
  if (!url) return null
  let host = ''
  try {
    host = new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return null
  }
  // 도메인 뒤쪽 일치로 찾기 (예: news.chosun.com → chosun.com)
  for (const domain of Object.keys(DOMAIN_OUTLET)) {
    if (host === domain || host.endsWith('.' + domain)) return DOMAIN_OUTLET[domain]
  }
  return null
}
