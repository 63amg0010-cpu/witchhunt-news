// 새 feed.json을 GitHub에 올려 배포 사이트(Vercel)를 자동 갱신한다.
// 코덱스 자동화의 '맨 마지막' 단계로 실행:  node scripts/push-feed.mjs
import { execSync } from 'node:child_process'

function run(cmd) {
  return execSync(cmd, { cwd: process.cwd(), encoding: 'utf8' })
}

try {
  run('git add public/feed.json')
  const changed = run('git status --porcelain public/feed.json').trim()
  if (!changed) {
    console.log('ℹ️ feed.json 변경 없음 — 올릴 것 없음')
    process.exit(0)
  }
  run('git commit -m "뉴스 자동 갱신"')
  run('git push origin')
  console.log('✅ 사이트 자동 갱신 완료 (Vercel이 1~2분 내 재배포)')
} catch (e) {
  console.error('❌ 자동 갱신(push) 실패:', e.message)
  process.exit(1)
}
