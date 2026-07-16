저장소 안의 `_articles.json`을 읽고, AI 요약을 만들어 `_summaries.json`에 저장하는 작업이다.
자세한 작성 규칙은 이 저장소의 `AGENTS.md`를 그대로 따른다. 네트워크/웹검색은 쓰지 않는다.

## 할 일
1. `_articles.json`을 읽는다. `[{ id, title, text, (일부)views }]` 배열이다.
2. 각 `id`마다 `AGENTS.md`의 규칙대로 다음을 만든다:
   - `summary` (완결 문장, 원문조각 금지)
   - `background`
   - `importance` (1~10 정수)
   - `category` (정치·경제·사회·국제·주식·크립토·예측시장 중 하나)
   - `views`가 있는 항목만 추가로 `viewLeft`, `viewRight` (진영별 논조 — AGENTS.md 규칙)
3. 결과를 **오직 하나의 JSON 객체**로 `_summaries.json`에 저장한다.
   - 형태: `{ "id": { "summary","background","importance","category", (해당시)"viewLeft","viewRight" }, ... }`
   - ⚠️ 기존 `_summaries.json`이 있어도 **무시하고, 이번 `_articles.json`의 id들만 담은 새 객체로 덮어쓴다**(병합 금지).
   - 코드펜스·설명 문구 금지. `{`로 시작 `}`로 끝나는 순수 JSON만.
   - ⚠️ 반드시 **UTF-8**로 저장하고, 저장 후 다시 읽어 한글이 `?`나 `�`로 깨지지 않았는지 확인한다.
4. 코드 파일은 수정하지 않는다. `_summaries.json`만 만든다.
