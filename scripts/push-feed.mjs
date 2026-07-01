// 새 feed.json / debates.json을 배포 사이트(Vercel)에 자동 반영한다.
// 코덱스 자동화의 '맨 마지막' 단계로 실행:  node scripts/push-feed.mjs
//   실행 시 AI 페르소나 토론(public/debates.json)도 새로 생성해서 함께 배포한다.
import { execSync } from 'node:child_process'
import { readFileSync } from 'node:fs'

const cwd = process.cwd()
const OPT = { cwd, stdio: 'inherit' }
const quiet = { cwd, encoding: 'utf8' }

// 0) AI 페르소나 토론 생성 (best-effort — 실패해도 뉴스 배포는 계속한다)
try {
  console.log('AI 토론 생성 중... (scripts/debate-gen.md)')
  const prompt = readFileSync('scripts/debate-gen.md', 'utf8')
  execSync(`codex exec -C "${cwd}"`, {
    cwd,
    input: prompt,
    stdio: ['pipe', 'inherit', 'inherit'],
    timeout: 20 * 60 * 1000,
  })
  console.log('✅ AI 토론 생성 완료')
} catch (e) {
  console.warn('⚠️ AI 토론 생성 건너뜀(뉴스 배포는 계속):', e.message)
}

// 1) 변경이 없으면 아무것도 안 함 (feed.json 또는 debates.json 중 하나라도 바뀌면 배포)
let changed = ''
try {
  execSync('git add public/feed.json public/debates.json', quiet)
  changed = execSync('git status --porcelain public/feed.json public/debates.json', quiet).trim()
} catch (e) {
  console.warn('git 상태 확인 경고:', e.message)
}
if (!changed) {
  console.log('ℹ️ feed.json/debates.json 변경 없음 — 배포 생략')
  process.exit(0)
}

// 2) GitHub에 백업 커밋/푸시 (실패해도 배포는 계속)
try {
  execSync('git commit -m "뉴스 자동 갱신"', quiet)
  execSync('git push origin', quiet)
  console.log('✅ GitHub 백업 완료')
} catch (e) {
  console.warn('⚠️ git push 경고(배포는 계속):', e.message)
}

// 3) Vercel로 실제 배포 (확실하게)
try {
  execSync('npx --yes vercel --prod --yes', OPT)
  console.log('✅ Vercel 배포 완료 — 사이트가 곧 최신 뉴스로 갱신됩니다')
} catch (e) {
  // vercel CLI는 성공해도 비정상 종료코드를 낼 때가 있어, 배포 자체는 됐을 수 있음
  console.warn('⚠️ vercel 명령 종료코드 비정상(배포는 됐을 수 있음):', e.message)
}
