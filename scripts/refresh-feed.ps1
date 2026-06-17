# =====================================================================
# 한눈 뉴스 피드 자동 갱신 (1시간마다 예약 실행용)
#   1) 최신 뉴스 수집 + 사건 묶기 + 사진      → public/feed.json
#   2) 각 사건 대표기사 본문 추출             → _articles.json
#   3) 코덱스(AI)가 본문 읽고 요약            → _summaries.json
#   4) 요약을 feed.json에 합치기
# 앱은 public/feed.json만 읽으므로, 이 스크립트가 돌면 화면이 갱신됩니다.
# (개발서버는 켜져 있어야 화면이 보입니다.)
# =====================================================================
$ErrorActionPreference = 'Stop'
$proj = 'C:\Users\UserK\Desktop\클로드\뉴스플랫폼'
Set-Location $proj

Write-Host "[1/4] 뉴스 수집..."
node scripts/build-feed.mjs

Write-Host "[2/4] 기사 본문 추출..."
node scripts/dump-articles.mjs

Write-Host "[3/4] 코덱스 AI 요약..."
$prompt = @'
입력(stdin)은 뉴스 기사 묶음 JSON 배열이다. 각 항목은 id, title, text(사이트 메뉴·광고 잡텍스트가 섞인 기사 본문)를 가진다.
각 id에 대해, 기사의 실제 내용만 바탕으로 사실 위주의 한국어 2~3문장 요약을 작성하라. 메뉴/광고/네비게이션 텍스트는 무시하라.
출력은 오직 {"id":"요약문", ...} 형태의 JSON 객체 하나여야 한다. 마크다운 코드펜스나 다른 설명을 절대 붙이지 마라.
'@
Get-Content _articles.json -Raw | claude -p $prompt | Out-File -Encoding utf8 _summaries.json

Write-Host "[4/4] 요약 합치기..."
node scripts/apply-summaries.mjs

Write-Host "완료: public/feed.json 갱신됨 ($(Get-Date))"
