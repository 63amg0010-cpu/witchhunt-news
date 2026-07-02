// 새 feed.json / debates.json을 배포 사이트(Vercel)에 자동 반영한다.
// 코덱스 자동화의 '맨 마지막' 단계로 실행:  node scripts/push-feed.mjs
//
// ⚠️ 순서가 핵심:
//   1) 뉴스(feed)를 '먼저' 커밋·푸시하고 즉시 배포한다 → 라이브가 반드시 최신 뉴스로 갱신됨.
//   2) AI 토론 생성은 코덱스가 오래 걸리므로(수십 분) '그 다음'에 best-effort로 한다.
//   3) 토론이 새로 만들어지면 추가로 커밋·배포한다.
//   이렇게 하면 자동화가 도중에 끊겨도(토론 생성이 느려도) 뉴스는 이미 라이브에 올라간 상태가 된다.
//   (예전 구조는 느린 토론 생성이 앞에 있어, 자동화가 배포 단계 전에 프로세스를 끊어버려 라이브가 갱신 안 됐음)
import { execSync } from 'node:child_process'
import { readFileSync } from 'node:fs'

const cwd = process.cwd()
const OPT = { cwd, stdio: 'inherit' }
const quiet = { cwd, encoding: 'utf8' }

// 지정한 파일들을 커밋·푸시. 바뀐 게 있으면 true, 없으면 false.
function commitAndPush(paths, msg) {
  let changed = ''
  try {
    execSync(`git add ${paths}`, quiet)
    changed = execSync(`git status --porcelain ${paths}`, quiet).trim()
  } catch (e) {
    console.warn('git 상태 확인 경고:', e.message)
  }
  if (!changed) {
    console.log(`ℹ️ 변경 없음(${paths}) — 커밋 생략`)
    return false
  }
  try {
    execSync(`git commit -m "${msg}"`, quiet)
    execSync('git push origin', quiet)
    console.log('✅ GitHub 백업 완료')
  } catch (e) {
    console.warn('⚠️ git push 경고(배포는 계속):', e.message)
  }
  return true
}

// Vercel 프로덕션 배포 (확실하게)
function deploy() {
  try {
    execSync('npx --yes vercel --prod --yes', OPT)
    console.log('✅ Vercel 배포 완료 — 사이트가 곧 갱신됩니다')
  } catch (e) {
    // vercel CLI는 성공해도 비정상 종료코드를 낼 때가 있어, 배포 자체는 됐을 수 있음
    console.warn('⚠️ vercel 명령 종료코드 비정상(배포는 됐을 수 있음):', e.message)
  }
}

// === 1) 뉴스 먼저 배포 (반드시 되어야 하는 부분) ===
// feed가 안 바뀌었어도 배포를 한 번 하여, 이전 회차가 배포에 실패해 라이브가 뒤처졌던 것도 자동 복구한다.
commitAndPush('public/feed.json', '뉴스 자동 갱신')
deploy()

// === 2) AI 페르소나 토론 생성 (best-effort, 느림 — 뉴스는 이미 배포된 뒤라 안전) ===
let debatesGenerated = false
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
  debatesGenerated = true
} catch (e) {
  console.warn('⚠️ AI 토론 생성 건너뜀(뉴스는 이미 배포됨):', e.message)
}

// === 3) 토론이 새로 만들어졌으면 추가로 커밋·배포 ===
if (debatesGenerated) {
  const changed = commitAndPush('public/debates.json', 'AI 토론 자동 갱신')
  if (changed) deploy()
}
