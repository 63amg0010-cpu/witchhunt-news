저장소의 `_issue_in.json`을 읽고 **"이슈 해설"** 글을 써서 `_issue_out.json`에 저장하는 작업이다.
자세한 문체·구성 규칙은 이 저장소의 `AGENTS.md`의 "이슈 해설" 절을 그대로 따른다. 네트워크/웹검색은 쓰지 않는다.

## 할 일
1. `_issue_in.json`을 읽는다. 배열이며 각 항목은
   `{ eventId, category, title, summary, background, outletCount, articleTitles[], mainText, otherText }` 이다.
   (`mainText`/`otherText`는 기사 본문인데 메뉴·광고 잡텍스트가 섞여 있으니 실제 내용만 쓴다.)
   ⚠️ 배열이 비어 있으면 아무것도 하지 말고 그대로 끝낸다.
2. 각 항목마다 `AGENTS.md` 규칙대로 아래를 만든다:
   `title`(쉬운 말 제목), `oneLine`(한 줄), `whatHappened`(무슨 일이 있었나 3~5문장),
   `terms`(어려운 말 풀이 0~3개), `meaning`(이게 무슨 의미냐면 4~6문장),
   `intents`(가능한 해석, 각 label+text — ⚠️ **개수 정해놓고 채우지 말 것.** 근거 있는 것만, 2개면 2개),
   `impact`(나한테 무슨 상관 3~5문장),
   `watch`(앞으로 볼 것 2~4문장)
3. 결과를 **순수 JSON 배열**로 `_issue_out.json`에 저장한다.
   - 형태: `[ { "eventId","category","title","oneLine","whatHappened","terms":[{"word","desc"}],"meaning","intents":[{"label","text"}],"impact","watch" } ]`
   - 입력의 모든 eventId를 포함한다. 코드펜스·설명 문구 금지. `[`로 시작 `]`로 끝나는 JSON만.
   - ⚠️ 반드시 **UTF-8**로 저장하고, 저장 후 다시 읽어 한글이 `?`나 `�`로 깨지지 않았는지 확인한다.
4. 코드 파일은 수정하지 않는다. `_issue_out.json`만 만든다.
