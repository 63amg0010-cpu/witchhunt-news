// 새 feed.json을 배포 사이트(Vercel)에 자동 반영한다.
// 코덱스 자동화의 '맨 마지막' 단계로 실행:  node scripts/push-feed.mjs
//
// 참고: Vercel 계정에 GitHub 로그인 연결이 없어 'push→자동배포'가 안 되므로,
//       여기서 Vercel CLI로 직접 배포한다. (GitHub에는 백업용으로 함께 올림)
import { execSync } from 'node:child_process'

const OPT = { cwd: process.cwd(), stdio: 'inherit' }
const quiet = { cwd: process.cwd(), encoding: 'utf8' }

// 1) 변경이 없으면 아무것도 안 함
let changed = ''
try {
  execSync('git add public/feed.json', quiet)
  changed = execSync('git status --porcelain public/feed.json', quiet).trim()
} catch (e) {
  console.warn('git 상태 확인 경고:', e.message)
}
if (!changed) {
  console.log('ℹ️ feed.json 변경 없음 — 배포 생략')
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
