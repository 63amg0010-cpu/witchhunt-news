// 진단용: 네이버가 키워드별로 주는 '가공 전' 원본 기사의 성향 분포를 센다.
// (진보 기사가 적은 게 '공급'문제인지 '처리'문제인지 구분하려고)
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const env = {}
for (const line of readFileSync(join(ROOT, '.env'), 'utf8').split('\n')) {
  const m = line.match(/^\s*([A-Z_]+)\s*=\s*(.*)\s*$/)
  if (m) env[m[1]] = m[2].trim()
}
const DOMAIN_OUTLET = {
  'hani.co.kr': 'prog', 'khan.co.kr': 'prog', 'ohmynews.com': 'prog', 'pressian.com': 'prog',
  'mediatoday.co.kr': 'prog', 'newstapa.org': 'prog', 'vop.co.kr': 'prog', 'imbc.com': 'prog',
  'yna.co.kr': 'center', 'yonhapnewstv.co.kr': 'center', 'news1.kr': 'center', 'newsis.com': 'center',
  'kbs.co.kr': 'center', 'ytn.co.kr': 'center', 'sbs.co.kr': 'center', 'hankookilbo.com': 'center',
  'seoul.co.kr': 'center', 'kmib.co.kr': 'center', 'nocutnews.co.kr': 'center', 'jtbc.co.kr': 'center',
  'mt.co.kr': 'center', 'asiae.co.kr': 'center', 'heraldcorp.com': 'center', 'edaily.co.kr': 'center',
  'fnnews.com': 'center', 'joongang.co.kr': 'center', 'joins.com': 'center',
  'chosun.com': 'cons', 'donga.com': 'cons', 'munhwa.com': 'cons', 'segye.com': 'cons',
  'tvchosun.com': 'cons', 'ichannela.com': 'cons', 'mbn.co.kr': 'cons', 'hankyung.com': 'cons',
  'mk.co.kr': 'cons', 'sedaily.com': 'cons', 'dt.co.kr': 'cons', 'dailian.co.kr': 'cons',
}
function leanOf(url) {
  try {
    const host = new URL(url).hostname.replace(/^www\./, '')
    for (const d of Object.keys(DOMAIN_OUTLET)) if (host === d || host.endsWith('.' + d)) return DOMAIN_OUTLET[d]
  } catch {}
  return 'unknown'
}
const unknownHosts = {}
async function fetchNaver(query) {
  const url = `https://openapi.naver.com/v1/search/news.json?query=${encodeURIComponent(query)}&display=100&sort=date`
  const res = await fetch(url, { headers: { 'X-Naver-Client-Id': env.NAVER_CLIENT_ID, 'X-Naver-Client-Secret': env.NAVER_CLIENT_SECRET } })
  if (!res.ok) throw new Error(`naver ${res.status}`)
  return ((await res.json()).items ?? []).map((it) => {
    const link = it.originallink || it.link
    const lean = leanOf(link)
    if (lean === 'unknown') {
      try { const h = new URL(link).hostname.replace(/^www\./, ''); unknownHosts[h] = (unknownHosts[h] || 0) + 1 } catch {}
    }
    return lean
  })
}

const KEYWORDS = ['특검', '코스피', '의대 정원', '북한', '검찰 수사', '국회']
const total = { prog: 0, center: 0, cons: 0, unknown: 0 }
for (const q of KEYWORDS) {
  const leans = await fetchNaver(q)
  const c = { prog: 0, center: 0, cons: 0, unknown: 0 }
  for (const l of leans) c[l]++
  for (const k in c) total[k] += c[k]
  console.log(`[${q}] 진보 ${c.prog} / 중도 ${c.center} / 보수 ${c.cons} / 미분류 ${c.unknown}  (총 ${leans.length})`)
}
console.log(`\n합계 → 진보 ${total.prog} / 중도 ${total.center} / 보수 ${total.cons} / 미분류 ${total.unknown}`)
console.log(`\n=== 미분류 도메인 상위 25 (보강 후보) ===`)
Object.entries(unknownHosts).sort((a, b) => b[1] - a[1]).slice(0, 25).forEach(([h, n]) => console.log(`  ${n}\t${h}`))
