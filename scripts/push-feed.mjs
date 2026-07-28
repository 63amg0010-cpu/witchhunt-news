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
import { existsSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs'

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

// ★ 배포 전 안전장치 — AI 요약이 안 된 사건은 내보내지 않는다.
//   codex가 시간 안에 못 끝낸 회차에서 '네이버 원문 조각'이 요약인 채로 라이브에 나가던 문제를 막는다.
//   (그런 사건은 feed에 그대로 남아 다음 회차에 다시 요약을 시도한다. 화면에만 안 보일 뿐이다.)
const FLOOR = 30 // 이 밑으로 줄어들면 걸러내지 않는다(화면이 텅 비는 것 방지)
function hideUnsummarized() {
  const path = 'public/feed.json'
  const feed = JSON.parse(readFileSync(path, 'utf8'))
  const all = feed.events || []
  const ready = all.filter((e) => e.background) // 배경 설명이 있으면 AI 요약을 거친 사건
  const hidden = all.length - ready.length
  if (hidden === 0) return
  if (ready.length < FLOOR) {
    console.warn(`⚠️ 미요약 ${hidden}건이지만 남는 사건이 ${ready.length}건뿐이라 그대로 배포`)
    return
  }
  // 화면에는 요약된 사건만 내보내고, 원본(미요약 포함)은 다음 회차를 위해 따로 보관한다.
  writeFileSync('_feed_pending.json', JSON.stringify(feed, null, 1), 'utf8')
  feed.events = ready
  writeFileSync(path, JSON.stringify(feed, null, 1), 'utf8')
  console.log(`🛡️ 미요약 ${hidden}건은 이번 배포에서 제외(다음 회차에 재시도) — ${ready.length}건 배포`)
}
hideUnsummarized()

// 뉴스(feed)와, (수동으로 새로 만들어진 경우) 토론(debates)을 커밋·푸시한 뒤 배포한다.
// feed가 안 바뀌었어도 배포를 1회 하여, 이전 회차가 배포에 실패해 라이브가 뒤처졌던 것도 자동 복구한다.
commitAndPush('public/feed.json public/debates.json public/issues.json', '뉴스 자동 갱신')
deploy()

// 배포가 끝나면 로컬 feed.json은 '미요약 포함' 원본으로 되돌린다.
// (그래야 다음 회차의 build-feed·dump-articles가 그 사건들을 다시 요약 대상으로 잡는다)
if (existsSync('_feed_pending.json')) {
  writeFileSync('public/feed.json', readFileSync('_feed_pending.json', 'utf8'), 'utf8')
  unlinkSync('_feed_pending.json')
  console.log('↩️ 로컬 feed.json 복원(제외했던 미요약 사건 다음 회차 재시도용)')
}
