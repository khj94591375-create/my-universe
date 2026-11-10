# My Universe

웹소설 작가의 세계관을 기억하는 AI 작업 공간.
잊힌 복선과 설정을 다시 꺼내 다음 회차로 이어 가도록 돕는다.

- 배포 주소: https://khj94591375-create.github.io/my-universe/
- 제작 기준 문서: [`docs/BUILD_SPEC.md`](docs/BUILD_SPEC.md) (모든 구현은 이 문서를 따른다)
- 결정 기록: [`docs/DECISIONS.md`](docs/DECISIONS.md)
- 현재 상태와 다음 작업: [`docs/HANDOFF.md`](docs/HANDOFF.md)
- 발표 시연 순서: [`docs/DEMO.md`](docs/DEMO.md)

## 진행 단계

| 단계 | 내용 | 상태 |
|---|---|---|
| M0 | 프로젝트 뼈대, 디자인 토큰, 메뉴, 화면 틀, 자동 배포 | 완료 |
| M1 | 데이터베이스, 구글 로그인, 작품 목록, 예시 작품 | 완료 |
| M2 | 기본 기능 이전(설정집, 회차, 홈, 잊힌 복선, 우주 지도) | 완료 |
| M3 | 원고 자동 읽기(규칙) | 완료 |
| M4 | Claude 연결(RAG v1) | 완료 · Claude 연결됨(2026-11-10) |
| M5 | 채점, 설정 충돌 | 완료 |
| M6 | 삽화 스튜디오 | 완료 · OpenAI 키 대기 |
| M7 | 사용자 테스트, 마무리 | 진행 중 · 성능·접근성 점검과 시연 시나리오 완료, 작가 테스트 남음 |

## 로컬에서 실행

```bash
npm install
cp .env.example .env
npm run dev
```
브라우저에서 http://localhost:5173/my-universe/ 를 연다.

규칙 로직 단위 테스트: `npm test`

화면 테스트(진짜 Supabase 없이 가짜 서버로, `e2e/`):

```bash
npx playwright install chromium
npm run e2e
```

`main`에 올리면 GitHub Actions가 타입 검사·단위 테스트·화면 테스트를 먼저 돌리고, **모두 통과해야 배포**한다(`.github/workflows/test.yml`, `deploy.yml`).
실제 사이트에서 사람이 확인할 항목은 [`docs/CHECKLIST.md`](docs/CHECKLIST.md).

## 데이터베이스 준비 (처음 한 번)

Supabase 대시보드 → **SQL Editor** → **New query**에 아래 파일 내용을 차례로 붙여 넣고 **Run**.

1. `supabase/migrations/0001_init.sql` — 표, 보안 규칙(RLS), 이미지 보관함
2. `supabase/seed/sample_work.sql` — 예시 작품 "별의 도서관"(여러 번 실행해도 됨)
3. `supabase/migrations/0002_link_direction.sql` — 연결선 방향(화살표). 시드를 다시 실행했다면 이것도 다시 실행
4. `supabase/migrations/0003_link_per_direction.sql` — 같은 두 항목 사이에 방향마다 선 하나씩
5. `supabase/migrations/0004_ai_ready.sql` — AI 연결 준비(별칭 출처, 사용량 +1, 비슷한 장면 찾기)
6. `supabase/migrations/0005_style_terms.sql` — 맞춤법 검사 "앞으로도 이 표현 유지" 작품 사전(새 표 하나, 기존 표는 그대로)

## 지원 브라우저와 접근성

- 지원 브라우저: Chrome·Edge 107 이상, Firefox 104 이상, Safari 16 이상(iOS 16 이상). `vite.config.ts`의 `build.target`에 고정.
  - PDF 원고 읽기는 pdf.js의 legacy 판(옛 브라우저용 보완 코드 포함)을 쓴다.
  - 클립보드 "붙여 넣기" 버튼은 브라우저가 허락할 때만 동작하고, 안 되면 Ctrl+V 안내로 바뀐다.
- 접근성: axe-core 자동 점검(WCAG 2.2 AA + 권장 사항)에서 화면 12개 위반 0개(1280px·320px), 키보드만으로 주요 흐름 사용 가능
  (본문으로 건너뛰기, 우주 지도 Tab·Enter·Esc, 화면 안 확인 막대), 화면마다 탭 제목, 400px·320px에서 가로 넘침 없음.

## 디자인·문구를 바꾸는 곳

| 바꿀 것 | 파일 |
|---|---|
| 색·글꼴·간격·모서리(라이트·다크 두 벌) | `src/styles/tokens.css` |
| 버튼 이름·안내 문구 | `src/config/copy.ts` |
| 메뉴 순서·이름·아이콘 | `src/config/nav.ts`(아이콘 모양은 `src/components/Icon.tsx`) |
| 일러스트(시작 화면·홈 배너·빈 화면·가이드 그림) | `src/config/art.ts`, 그림 파일 `src/assets/art/` |
| 처음 사용 가이드·화면별 도움말 | `src/config/guide.ts` |
| 문의 메일 주소·개인정보처리방침 시행일 | `src/config/site.ts` |
| 업로드 제한(파일 크기·개수) 등 숫자 | `src/config/limits.ts` |
| 화면 안 카드 배치 | `src/screens/<화면>/<화면>Screen.tsx`의 섹션 순서 |

## AI 서버 함수(Supabase Edge Functions)

- 코드: `supabase/functions/`(공용 `_shared/` + `ai-status`, `analyze-episode`, `guide`, `design-next`, `chat`, `check-consistency`, `generate-image`, `delete-account`)
- 배포: `main`에 함수가 바뀌면 GitHub Actions(`functions.yml`)가 올린다. 저장소 비밀값 `SUPABASE_ACCESS_TOKEN`이 없으면 건너뛴다.
- 키(`ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, `OPENAI_IMAGE_MODEL` 등)는 Supabase 대시보드 → Edge Functions → Secrets에만 넣는다. 키가 없으면 AI 버튼은 이유와 함께 꺼져 있고 기본 기능은 그대로 동작한다.

## 보안 규칙

- `.env.production`에는 공개용 값(Supabase URL, publishable key)만 둔다.
- Claude·OpenAI API 키, Supabase secret key는 Supabase Edge Function 비밀값에만 둔다.
- 채점용 실제 원고(`eval/manuscripts/`)는 저장소에 올리지 않는다.
