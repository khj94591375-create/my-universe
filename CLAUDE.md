# 이 저장소에서 작업하는 AI에게

0. 처음이면 `docs/HANDOFF.md`로 현재 상태와 다음 작업을 확인한다.
1. 모든 구현은 `docs/BUILD_SPEC.md`를 따른다. 먼저 0장(읽는 순서, 절대 원칙)을 읽는다.
2. 한 번에 한 단계(M0~M7)만 만든다. 현재 단계는 `README.md`의 표를 본다. 단계를 끝내면 표를 갱신한다.
3. 색·글꼴·간격은 `src/styles/tokens.css`, 문구는 `src/config/copy.ts`, 메뉴는 `src/config/nav.ts`에서만 바꾼다. 컴포넌트에 색상값·문구를 직접 쓰지 않는다.
4. 화면은 섹션 컴포넌트의 조합으로 만든다. 섹션은 `workId`만 받아 스스로 데이터를 가져온다.
5. API 키(Claude, OpenAI, Supabase secret)는 절대 화면 코드나 저장소에 넣지 않는다.
6. 중요한 판단은 `docs/DECISIONS.md`에 한 줄로 남긴다.
7. 사용자는 개발 초보다. 결과 보고는 쉬운 한국어로, 사용자가 직접 해야 할 일은 클릭 순서로 안내한다.
