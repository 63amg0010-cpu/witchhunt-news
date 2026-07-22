# =====================================================================
# WitchHunt 뉴스 자동 갱신 — 윈도우 작업 스케줄러가 3시간마다 실행
#   Codex 앱에 의존하지 않고, 노트북만 켜져 있으면 돈다.
#   순서: 수집 → 본문·논조자료 → AI요약/논조(codex gpt-5.5 high) → 합치기 → 배포
#   로그: logs/pipeline-YYYYMMDD.log 에 남는다.
# =====================================================================
$ErrorActionPreference = 'Continue'
$proj = 'C:\Users\UserK\Desktop\클로드\뉴스플랫폼'
Set-Location $proj

# 실행에 필요한 도구들이 스케줄러 환경에서도 잡히도록 PATH 보강
$env:PATH = "C:\Program Files\nodejs;C:\Users\UserK\AppData\Roaming\npm;C:\Program Files\Git\cmd;$env:PATH"
$node  = 'C:\Program Files\nodejs\node.exe'
$codex = 'C:\Users\UserK\AppData\Roaming\npm\codex.cmd'

$logDir = Join-Path $proj 'logs'
if (-not (Test-Path $logDir)) { New-Item -ItemType Directory -Path $logDir | Out-Null }
$log = Join-Path $logDir ("pipeline-" + (Get-Date -Format 'yyyyMMdd') + ".log")
function Log($m) { $line = (Get-Date -Format 'HH:mm:ss') + "  $m"; Write-Output $line; Add-Content -LiteralPath $log -Value $line -Encoding utf8 }

Log "===== 파이프라인 시작 ====="

# 1) 뉴스 수집 (AI 아님, 토큰 0)
Log "[1/6] 뉴스 수집 build-feed"
& $node scripts/build-feed.mjs 2>&1 | ForEach-Object { Add-Content -LiteralPath $log -Value $_ -Encoding utf8 }

# 2) 대표기사 본문 + 진영별 논조 자료 (AI 아님, 토큰 0)
Log "[2/6] 본문·논조자료 dump-articles"
& $node scripts/dump-articles.mjs 2>&1 | ForEach-Object { Add-Content -LiteralPath $log -Value $_ -Encoding utf8 }

# 3) 네티즌 반응 (AI 아님, 토큰 0)
Log "[3/6] 네티즌 반응 fetch-reactions"
& $node scripts/fetch-reactions.mjs 2>&1 | ForEach-Object { Add-Content -LiteralPath $log -Value $_ -Encoding utf8 }

# 4) AI 요약·논조 (codex gpt-5.5 high) — 여기만 토큰을 쓴다
#    오래된 요약이 섞이지 않게 먼저 지운다(병합 방지). codex가 _summaries.json을 새로 만든다.
#    ⚠️ codex는 작업을 다 마쳐도 프로세스가 안 죽고 매달리는 버릇이 있다.
#    → _summaries.json을 다 쓴 뒤이므로, 시간(최대 12분) 주고 안 끝나면 트리째 죽이고(좀비 방지) 넘어간다.
Log "[4/6] AI 요약·논조 codex(gpt-5.5 high)"
$sumFile = Join-Path $proj '_summaries.json'
Remove-Item -LiteralPath $sumFile -ErrorAction SilentlyContinue
$codexLog = Join-Path $logDir 'codex-last.log'
# cmd 경유로 프롬프트를 stdin에 흘려넣고 출력을 파일로 (트리 종료를 위해 PID 확보)
$cmdLine = "type `"$proj\scripts\summarize-prompt.md`" | `"$codex`" exec -C `"$proj`" -m gpt-5.5 -c model_reasoning_effort=high > `"$codexLog`" 2>&1"
$proc = Start-Process -FilePath 'cmd.exe' -ArgumentList '/c', $cmdLine -PassThru -WindowStyle Hidden
if (-not $proc.WaitForExit(12 * 60 * 1000)) {
  Log "  codex 12분 초과 — 트리 종료(요약은 이미 파일에 있음)"
  & taskkill /PID $proc.Id /T /F 2>&1 | Out-Null
}
# codex가 남긴 자식 프로세스(좀비) 한 번 더 정리
Get-CimInstance Win32_Process -Filter "Name='codex.exe' OR Name='node.exe'" -ErrorAction SilentlyContinue |
  Where-Object { $_.CommandLine -match 'summarize-prompt|codex exec' } |
  ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }
if (Test-Path $sumFile) { Log "  _summaries.json 생성됨 ($([math]::Round((Get-Item $sumFile).Length/1KB,1))KB)" }
else { Log "  ⚠️ _summaries.json 없음 — 이번 회차 요약 실패(기존 요약 유지됨)" }

# 5) 요약·논조를 feed.json에 합치기 (링크 자동 치유 포함, AI 아님)
Log "[5/6] 합치기 apply-summaries"
& $node scripts/apply-summaries.mjs 2>&1 | ForEach-Object { Add-Content -LiteralPath $log -Value $_ -Encoding utf8 }

# 5.5) 이슈 해설 — 아직 해설 없는 '큰 이슈'만 1~2건 새로 씀 (없으면 codex 건너뜀)
Log "[5.5] 이슈 해설 대상 고르기 build-issues"
& $node scripts/build-issues.mjs 2>&1 | ForEach-Object { Add-Content -LiteralPath $log -Value $_ -Encoding utf8 }
$issueIn = Join-Path $proj '_issue_in.json'
$needIssue = $false
if (Test-Path $issueIn) {
  try { $needIssue = ((Get-Content -LiteralPath $issueIn -Raw | ConvertFrom-Json) | Measure-Object).Count -gt 0 } catch { $needIssue = $false }
}
if ($needIssue) {
  Log "  새 이슈 있음 → codex로 해설 작성(gpt-5.5 high)"
  Remove-Item -LiteralPath (Join-Path $proj '_issue_out.json') -ErrorAction SilentlyContinue
  $issueLog = Join-Path $logDir 'codex-issue.log'
  $cmd2 = "type `"$proj\scripts\issue-prompt.md`" | `"$codex`" exec -C `"$proj`" -m gpt-5.5 -c model_reasoning_effort=high > `"$issueLog`" 2>&1"
  $p2 = Start-Process -FilePath 'cmd.exe' -ArgumentList '/c', $cmd2 -PassThru -WindowStyle Hidden
  if (-not $p2.WaitForExit(12 * 60 * 1000)) {
    Log "  codex(이슈) 12분 초과 — 트리 종료"
    & taskkill /PID $p2.Id /T /F 2>&1 | Out-Null
  }
  & $node scripts/apply-issues.mjs 2>&1 | ForEach-Object { Add-Content -LiteralPath $log -Value $_ -Encoding utf8 }
} else {
  Log "  새로 해설할 이슈 없음 — 건너뜀(기존 해설 유지)"
}

# 6) 배포 (GitHub + Vercel, AI 아님)
Log "[6/6] 배포 push-feed"
& $node scripts/push-feed.mjs 2>&1 | ForEach-Object { Add-Content -LiteralPath $log -Value $_ -Encoding utf8 }

Log "===== 파이프라인 끝 ====="
