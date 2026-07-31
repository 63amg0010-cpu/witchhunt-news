// 새 feed.json을 배포 사이트(Vercel)에 자동 반영한다.
// 코덱스 자동화의 '맨 마지막' 단계로 실행:  node scripts/push-feed.mjs
//
// ⚠️ (2026-07-04) AI 토론 자동 생성 제거:
//   자동화(Codex 앱) 자체가 코덱스로 도는데, 그 안에서 push-feed가 또 `codex exec`로 토론을 만드는
//   '코덱스 중첩'이 stall(멈춤)을 일으켜 배포를 방해했다(자동화 로그의 .git/index.lock·타임아웃).
//   토론 자동 갱신은 지금 불필요하므로 이 단계를 뺐다. → push-feed는 '뉴스 배포'만 확실히 한다.
//   ▶ 토론을 수동으로 다시 만들고 싶을 때: `codex exec -C "<프로젝트경로>" < scripts/debate-gen.md`
//     로 public/debates.json을 생성한 뒤, 이 스크립트를 실행하면 함께 배포된다.
import { execSync, spawn } from 'node:child_process'
import { existsSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs'
import { isPublishable } from './lib-quality.mjs'

const cwd = process.cwd()
const quiet = { cwd, encoding: 'utf8' }
const LIVE_FEED_URL = 'https://witchhunt-news.vercel.app/feed.json'
const DEPLOY_FAILURE_MARKER = '_deploy_failed.json'

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

// Vercel 프로덕션 배포. CLI 출력은 그대로 보여주되, 실패 원인 판별을 위해 함께 모은다.
function deploy() {
  return new Promise((resolve) => {
    let output = ''
    // Windows의 npx.cmd도 실행되도록 shell을 쓴다. 종료코드는 참고만 하고 라이브 반영으로 최종 판정한다.
    const child = spawn('npx --yes vercel --prod --yes', { cwd, shell: true, stdio: ['ignore', 'pipe', 'pipe'] })
    const copyOutput = (chunk, stream) => {
      const text = chunk.toString()
      output += text
      stream.write(text)
    }
    child.stdout.on('data', (chunk) => copyOutput(chunk, process.stdout))
    child.stderr.on('data', (chunk) => copyOutput(chunk, process.stderr))
    child.on('error', (error) => {
      const text = `vercel 실행 오류: ${error.message}\n`
      output += text
      console.warn(text.trim())
    })
    child.on('close', (code) => {
      if (code === 0) console.log('ℹ️ Vercel 명령 종료 — 라이브 반영을 확인합니다')
      else console.warn(`⚠️ vercel 명령 종료코드 비정상(${code ?? '알 수 없음'}) — 라이브 반영을 계속 확인합니다`)
      resolve(output)
    })
  })
}

function readGeneratedAt(path) {
  return JSON.parse(readFileSync(path, 'utf8')).generatedAt
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

// Vercel CLI의 종료코드는 신뢰하지 않고, 캐시를 피한 실제 라이브 feed로 최종 확인한다.
async function verifyLiveFeed(expectedGeneratedAt) {
  if (!expectedGeneratedAt) {
    return { ok: false, liveGeneratedAt: null, reason: '배포할 feed.json의 generatedAt을 읽지 못함' }
  }

  let liveGeneratedAt = null
  let reason = ''
  for (let attempt = 1; attempt <= 8; attempt += 1) {
    try {
      const url = `${LIVE_FEED_URL}?t=${Date.now()}-${attempt}`
      const response = await fetch(url, { cache: 'no-store' })
      if (!response.ok) throw new Error(`라이브 feed 요청 실패(HTTP ${response.status})`)
      const liveFeed = await response.json()
      liveGeneratedAt = liveFeed.generatedAt ?? null
      if (liveGeneratedAt === expectedGeneratedAt) return { ok: true, liveGeneratedAt, reason: '' }
      reason = `라이브 generatedAt 불일치 (${attempt}/8회 확인)`
      console.warn(`⏳ 라이브 반영 대기 ${attempt}/8 — 기대: ${expectedGeneratedAt} / 라이브: ${liveGeneratedAt ?? '없음'}`)
    } catch (error) {
      reason = `라이브 feed 확인 실패 (${attempt}/8회): ${error.message}`
      console.warn(`⏳ ${reason}`)
    }
    if (attempt < 8) await wait(15_000)
  }
  return { ok: false, liveGeneratedAt, reason }
}

function recordDeploymentResult(expectedGeneratedAt, verification, deployOutput) {
  if (verification.ok) {
    if (existsSync(DEPLOY_FAILURE_MARKER)) unlinkSync(DEPLOY_FAILURE_MARKER)
    console.log('✅ 배포 확인됨(라이브 반영 일치)')
    return
  }

  const tokenProblem = /token is not valid|vercel login/i.test(deployOutput)
  const reason = tokenProblem ? '토큰 만료 의심' : verification.reason
  writeFileSync(DEPLOY_FAILURE_MARKER, JSON.stringify({
    failedAt: new Date().toISOString(),
    expectedGeneratedAt: expectedGeneratedAt ?? null,
    liveGeneratedAt: verification.liveGeneratedAt,
    reason,
  }, null, 2), 'utf8')
  console.error('\n============================================================')
  console.error('🚨 배포 실패 — 라이브에 반영되지 않았습니다')
  console.error(`   기대: ${expectedGeneratedAt ?? '읽기 실패'} / 라이브: ${verification.liveGeneratedAt ?? '확인 실패'}`)
  console.error('   원인 후보: Vercel 토큰 만료 → 터미널에서 `npx vercel login` 실행 필요')
  console.error('============================================================\n')
}

// ★ 배포 전 안전장치 — AI 요약이 안 된 사건은 내보내지 않는다.
//   codex가 시간 안에 못 끝낸 회차에서 '네이버 원문 조각'이 요약인 채로 라이브에 나가던 문제를 막는다.
//   (그런 사건은 feed에 그대로 남아 다음 회차에 다시 요약을 시도한다. 화면에만 안 보일 뿐이다.)
const FLOOR = 30 // 이 밑으로 줄어들면 걸러내지 않는다(화면이 텅 비는 것 방지)
function hideUnsummarized() {
  const path = 'public/feed.json'
  const feed = JSON.parse(readFileSync(path, 'utf8'))
  const all = feed.events || []
  const ready = all.filter(isPublishable) // 배경 있고 + 요약이 원문 조각이 아닌 사건만
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

// 미요약 사건을 잠시 숨긴 '배포용 feed'의 시각을, 복원하기 전에 반드시 기억한다.
let expectedGeneratedAt = null
try {
  expectedGeneratedAt = readGeneratedAt('public/feed.json')
} catch (error) {
  console.warn('⚠️ 배포용 feed.json generatedAt 읽기 실패:', error.message)
}

// 뉴스(feed)와, (수동으로 새로 만들어진 경우) 토론(debates)을 커밋·푸시한 뒤 배포한다.
// feed가 안 바뀌었어도 배포를 1회 하여, 이전 회차가 배포에 실패해 라이브가 뒤처졌던 것도 자동 복구한다.
commitAndPush('public/feed.json public/debates.json public/issues.json', '뉴스 자동 갱신')
const deployOutput = await deploy()
const verification = await verifyLiveFeed(expectedGeneratedAt)
recordDeploymentResult(expectedGeneratedAt, verification, deployOutput)

// 배포가 끝나면 로컬 feed.json은 '미요약 포함' 원본으로 되돌린다.
// (그래야 다음 회차의 build-feed·dump-articles가 그 사건들을 다시 요약 대상으로 잡는다)
if (existsSync('_feed_pending.json')) {
  writeFileSync('public/feed.json', readFileSync('_feed_pending.json', 'utf8'), 'utf8')
  unlinkSync('_feed_pending.json')
  console.log('↩️ 로컬 feed.json 복원(제외했던 미요약 사건 다음 회차 재시도용)')
}
