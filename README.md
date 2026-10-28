# My Universe

웹소설 작가의 세계관을 기억하는 AI 작업 공간.
잊힌 복선과 설정을 다시 꺼내 다음 회차로 이어 가도록 돕는다.

- 배포 주소: https://khj94591375-create.github.io/my-universe/
- 제작 기준 문서: [`docs/BUILD_SPEC.md`](docs/BUILD_SPEC.md) (모든 구현은 이 문서를 따른다)
- 결정 기록: [`docs/DECISIONS.md`](docs/DECISIONS.md)

## 진행 단계

| 단계 | 내용 | 상태 |
|---|---|---|
| M0 | 프로젝트 뼈대, 디자인 토큰, 메뉴, 화면 틀, 자동 배포 | 완료 |
| M1 | 데이터베이스, 구글 로그인, 작품 목록, 예시 작품 | 예정 |
| M2 | 기본 기능 이전(설정집, 회차, 홈, 잊힌 복선, 우주 지도) | 예정 |
| M3 | 원고 자동 읽기(규칙) | 예정 |
| M4 | Claude 연결(RAG v1) | 예정 |
| M5 | 채점, 설정 충돌 | 예정 |
| M6 | 삽화 스튜디오 | 예정 |
| M7 | 사용자 테스트, 마무리 | 예정 |

## 로컬에서 실행

```bash
npm install
cp .env.example .env
npm run dev
```
브라우저에서 http://localhost:5173/my-universe/ 를 연다.

## 디자인·문구를 바꾸는 곳

| 바꿀 것 | 파일 |
|---|---|
| 색·글꼴·간격·모서리 | `src/styles/tokens.css` |
| 버튼 이름·안내 문구 | `src/config/copy.ts` |
| 메뉴 순서·이름·아이콘 | `src/config/nav.ts` |
| 화면 안 카드 배치 | `src/screens/<화면>/<화면>Screen.tsx`의 섹션 순서 |

## 보안 규칙

- `.env.production`에는 공개용 값(Supabase URL, publishable key)만 둔다.
- Claude·OpenAI API 키, Supabase secret key는 Supabase Edge Function 비밀값에만 둔다.
- 채점용 실제 원고(`eval/manuscripts/`)는 저장소에 올리지 않는다.
