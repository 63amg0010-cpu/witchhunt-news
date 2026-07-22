// 새 feed.json을 배포 사이트(Vercel)에 자동 반영한다.
// 코덱스 자동화의 '맨 마지막' 단계로 실행:  node scripts/push-feed.mjs
//
// ⚠️ (2026-07-04) AI 토론 자동 생성 제거:
//   자동화(Codex 앱) 자체가 코덱스로 도는데, 그 안에서 push-feed가 또 `codex exec`로 토론을 만드는
//   '코덱스 중첩'이 stall(멈춤)을 일으켜 배포를 방해했다(자동화 로그의 .git/index.lock·타임아웃).
//   토론 자동 갱신은 지금 불필요하므로 이 단계를 뺐다. → push-feed는 '뉴스 배포'만 확실히 한다.
//   ▶ 토론을 수동으로 다시 만들고 싶을 때: `codex exec -C "<프로젝트경로>" < scripts/debate-gen.md`
//     로 public/debates.json을 생성한 뒤, 이 스크립트를 실행하면 함께 배포된다.
import { execSync } from 'node:child_process'

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

// 뉴스(feed)와, (수동으로 새로 만들어진 경우) 토론(debates)을 커밋·푸시한 뒤 배포한다.
// feed가 안 바뀌었어도 배포를 1회 하여, 이전 회차가 배포에 실패해 라이브가 뒤처졌던 것도 자동 복구한다.
commitAndPush('public/feed.json public/debates.json public/issues.json', '뉴스 자동 갱신')
deploy()
