# 작업 인계 문서 (Claude Code용)

> 이 문서는 claude.ai 대화에서 진행하던 작업을 Claude Code로 넘기기 위한 현재 상태 요약이다.
> 기준 문서는 `docs/BUILD_SPEC.md`이고, 작업 규칙은 루트의 `CLAUDE.md`다. 충돌하면 BUILD_SPEC이 우선한다.
> 작성일: 2026-10-28

## 1. 지금 상태 한눈에

| 항목 | 상태 |
|---|---|
| 현재 단계 | **M4 뼈대·M5·M6 완료(Claude·OpenAI 키 대기), M7 점검 완료 → 남은 것: 키 넣고 실제 확인, 작가 3명 테스트** |
| 저장소 | https://github.com/khj94591375-create/my-universe (Public, 기본 브랜치 `main`) |
| 배포 주소 | https://khj94591375-create.github.io/my-universe/ (`main`에 push하면 GitHub Actions가 자동 배포) |
| GitHub Pages | 켜짐(Source: GitHub Actions). 첫 배포 성공 |
| Supabase 프로젝트 | 생성됨. URL `https://fzqbbazuqolefhsinlit.supabase.co`, 리전 서울 |
| 공개 키 | `.env.production`, `.env.example`에 들어 있음(publishable key, 공개용) |
| 구글 로그인 | Google Cloud OAuth 클라이언트(웹 애플리케이션) 생성, Supabase Auth의 Google 공급자에 Client ID·Secret 입력 완료 |
| 데이터베이스 표 | `supabase/migrations/0001_init.sql`, 예시 작품 `supabase/seed/sample_work.sql`. **사용자가 SQL Editor에서 실행해야 반영됨**(3.2) |
| Claude API·OpenAI API | 아직 연결 안 함(M4, M6). OpenAI 크레딧은 이미지에만 쓴다 |

## 2. M0에서 만든 것

- Vite 7 + React 19 + TypeScript 5.9, React Router 7(HashRouter), `base: '/my-universe/'`
- `src/styles/tokens.css`(디자인 토큰), `src/config/copy.ts`(문구), `src/config/nav.ts`(메뉴)
- 공통 부품: `Button`, `Card`, `Tag`, `EmptyState`, `ScreenLayout`(+`Columns`, `Column`), `AppShell`, `BrandMark`
- 화면: 시작(`/#/`), 작품 목록(`/#/works`), 내 설정(`/#/settings`), 작품 화면 7개(`/#/w/:workId/home|upload|forgot|map|bible|episodes|studio`)
  - 홈은 섹션 구조(`src/screens/home/sections/*`)로 만들어 둠. 나머지는 `src/screens/PlaceholderScreens.tsx`의 빈 화면
  - 예시 작품은 임시로 `workId = 'sample'`로 접근(M1에서 DB의 실제 예시 작품 id로 교체)
- `src/lib/supabase.ts`: Supabase 클라이언트(`flowType: 'pkce'`)
- `.github/workflows/deploy.yml`: build → Pages 배포
- "구글로 시작하기", "새 작품 만들기" 버튼은 의도적으로 비활성(M1에서 활성화)

## 2-1. M1에서 만든 것

- DB: BUILD_SPEC 5.1 표 전부, 뷰 `item_stats`·`work_stats`(security_invoker), RLS(`can_read_work`·`owns_work` 함수), Storage 버킷 `images`(비공개, 첫 폴더 = 작품 id인 소유자만)
- 예시 작품 "별의 도서관": 고정 id `00000000-0000-4000-8000-000000000001`(`src/config/sample.ts`), 6화(회차당 약 620~660자), 항목 9개, 별칭, 등장 기록 43개(규칙 7.3 방식, 근거 문장은 원고에 글자 그대로), co_occur 연결선(주인공급 60% 이상 등장 항목 제외) + AI·작가 연결선 예시
  - 다음 회차 7화 기준 gap: 사라진 13번째 서가 5, 반쪽짜리 은열쇠 4, 달빛 서고의 규칙(회수 완료) 3, 검은 망토의 노인·푸른 잉크의 편지(재사용 예정) 2
- 로그인: `src/features/auth/`(SessionProvider·useSession, signInWithGoogle·signOut, RequireAuth). `/works`, `/settings`는 로그인 필요
- 데이터: `src/data/works.ts`(listMyWorks, getSampleWork, getWork, createWork, renameWork, deleteWork), `src/features/works/useWork.ts`(useWork, useCanWrite)
- 부품: `Loading`, `ErrorState`, `ConfirmBar`, `TextField`, `WriteButton`(내 작품일 때만 활성, 예시 작품은 "로그인하면 내 작품에서 쓸 수 있어요")
- 검증: 로컬 Postgres 16에서 마이그레이션·시드 2회 실행, 비로그인/사용자 A/사용자 B로 RLS 확인. Playwright(가짜 Supabase 응답)로 화면 흐름 확인. `npm run build` 통과

## 3. M1에서 한 일과 남은 확인 (데이터베이스와 로그인)

BUILD_SPEC 5장(데이터 모델), 6.1·6.2절(시작·작품 목록), 13장 M1을 따른다.

### 3.1 만들 것
1. `supabase/migrations/0001_init.sql`: BUILD_SPEC 5.1의 표 전부 + 5.2 뷰 + 5.3 RLS 정책 + Storage 버킷 `images`(비공개)
2. `supabase/seed/sample_work.sql`: 예시 작품 "별의 도서관"(BUILD_SPEC 5.4). 원고 6화(회차당 600~1,000자, 새로 작성), 항목 9개, 등장 기록, 연결선
3. 로그인: 시작 화면의 `구글로 시작하기` 활성화(`supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo } })`), 로그인 상태 훅(`useSession`), 로그아웃, 로그인 필요한 화면 보호
   - `redirectTo`: 배포 시 `https://khj94591375-create.github.io/my-universe/`, 로컬에서는 `http://localhost:5173/my-universe/` (`window.location.origin + import.meta.env.BASE_URL`로 계산)
   - HashRouter와 PKCE: 로그인 후 `?code=`가 해시 앞 쿼리로 돌아온다. `detectSessionInUrl`이 처리하는지 확인하고, 처리 후 주소에서 `code`를 지운다
4. 작품 목록: 내 작품 불러오기, 새 작품 만들기(제목·장르), 이름 바꾸기, 삭제(화면 안 확인 막대), 예시 작품 카드(DB의 `is_sample = true`)
5. `src/data/`: 작품 관련 쿼리 함수와 타입. 화면에서 Supabase를 직접 부르지 않고 이 함수를 쓴다
6. AppShell의 작품 이름을 실제 작품 제목으로, 예시 작품이면 "예시 작품 · 읽기 전용" 띠와 쓰기 버튼 비활성
7. 내 설정 화면: 로그인한 구글 이메일, 로그아웃

### 3.2 사용자가 직접 해야 하는 일 (클릭 순서로 안내할 것)
1. **SQL 실행**: Supabase 대시보드 → 왼쪽 **SQL Editor** → **New query** → `0001_init.sql` 내용 붙여 넣기 → **Run**. 이어서 `sample_work.sql`도 같은 방법으로 실행
2. **로그인 후 돌아올 주소 등록**: Supabase → **Authentication** → **URL Configuration**
   - **Site URL**: `https://khj94591375-create.github.io/my-universe/`
   - **Redirect URLs**에 추가: `https://khj94591375-create.github.io/my-universe/`, `http://localhost:5173/my-universe/`
3. **구글 테스트 사용자**: Google Cloud Console → **Google 인증 플랫폼**(또는 OAuth 동의 화면) → **대상**(Audience) → 테스트 사용자에 본인·교수님·테스터 이메일 추가. (앱이 "테스트" 상태면 여기 등록된 사람만 로그인 가능)

### 3.3 완료 기준 (BUILD_SPEC 13장 M1)
- 로그인 없이 예시 작품을 읽을 수 있고, 쓰기 버튼은 막혀 있다
- 구글 로그인 → 작품 목록으로 이동, 새 작품을 만들 수 있다
- 다른 구글 계정으로 로그인하면 앞 계정의 작품이 보이지 않는다(RLS 확인)
- `npm run build` 통과, `main`에 push 후 배포 주소에서 동작

### 3.4 M1 확인 결과
사용자가 SQL 실행, URL Configuration, 테스트 사용자 등록 후 배포 주소에서 로그인·작품 만들기·두 계정 분리까지 확인 완료.
(처음 로그인 때 "연결할 수 없음"은 Site URL이 기본값 localhost:3000이었기 때문. URL Configuration 저장으로 해결)

## 3-2. M2에서 만든 것 (기본 기능, AI 없음)

- 규칙 로직(`src/features/`): `foreshadow/gap.ts`(7.1), `slump.ts`(7.2), `reuse.ts`(7.7), `josa.ts`·`guideTemplate.ts`(7.8), `analysis/detect.ts`(7.3), `cooccur.ts`(7.4), `split.ts`(7.6), `map/layout.ts`(6.7 배치). 단위 테스트 `src/features/__tests__/rules.test.ts`(`npm test`, 20개)
- 데이터: `src/data/workData.ts`(작품 전체 불러오기), `items.ts`(항목·별칭·연결선·합치기), `episodes.ts`(회차·장면·등장). 화면 공용 저장소 `src/features/works/workData.ts`(`useWorkData`, `refreshWorkData`), 저장 공통 처리 `features/works/save.ts`
- 규칙 정리 흐름: `features/analysis/runRules.ts`(붙여 넣기 저장 → 장면 나누기 → 재등장 → 재사용 예정→재사용됨 → 같은 장면 연결선 재계산)
- 화면: 홈(`screens/home`), 잊힌 복선 찾기(`screens/forgot`, 기본 가이드), 우주 지도(`screens/map`, `components/StarMap.tsx`), 설정집(`screens/bible`), 회차 기록(`screens/episodes`), 원고 불러오기 붙여 넣기 탭(`screens/upload`)
- 부품: `Badges.tsx`(GapTag, StatusTag, KindTag, AiBadge, EvidenceQuote, Chip), `Toast.tsx`, `TextField.tsx`(TextArea, SelectField 추가)
- DB 변경: M2 본체는 없음. 이후 연결선 방향 기능으로 `supabase/migrations/0002_link_direction.sql`, 방향별 선 두 개 기능으로 `0003_link_per_direction.sql` 추가(**사용자가 SQL Editor에서 실행 필요**). 실행 전에는 방향 없는 선만 저장되고, 방향을 고르면 "데이터베이스 업데이트가 필요해요" 안내가 뜸
- 검증: 단위 테스트 20개, 예시 작품 데이터로 만든 가짜 Supabase + Playwright로 화면 흐름 전체(읽기 전용, 항목 추가·별칭·붙여 넣기·덮어쓰기 확인·상태 변경·재사용됨 자동 전환·등장 해제·연결 추가·합치기·수정, 400px 폭) 확인

## 3-3. M3에서 만든 것 (원고 자동 읽기, 규칙)

- 파일 읽기 `src/features/manuscript/readFile.ts`: docx(mammoth 브라우저판), pdf(pdfjs-dist, 워커), txt(UTF-8 → 실패 시 EUC-KR), hwp·hwpx 거부. 라이브러리는 필요할 때만 불러옴
- 회차 번호·여러 회차 나누기 `features/manuscript/parse.ts`(7.5): 파일명 → 첫 줄 → "제 N 화" → 없으면 다음 번호 제안(? 표시). "N화" 줄이 2개 이상이면 나눔. 단위 테스트 포함
- 여러 회차 저장 `features/analysis/runRules.ts`의 `saveEpisodes`(진행 표시, 회차별 실패 후 계속, 마지막에 같은 장면 연결선), `reanalyzeAll`
- 화면: 원고 불러오기 "파일 올리기" 탭(`screens/upload/sections/FileUploadSection.tsx`), 검토 화면 `/#/w/:id/review?eps=`(`screens/review`), 회차 기록 "전체 다시 정리"
- 연습용 파일 `public/samples/star-library-1-6.txt`
- DB 변경 없음
- 검증: 단위 테스트 32개. 가짜 Supabase + Playwright로 실제 docx·pdf·txt(6화 묶음)·EUC-KR txt·hwp를 한 번에 올려 6화 저장, 등장 43개·같은 장면 연결선 10개(예시 작품 시드와 동일), 홈 "다음은 7화 차례예요", 덮어쓰기/건너뛰기, 전체 다시 정리, 예시 작품 쓰기 막힘, 400px 확인
- 참고: 규칙 정리는 설정집에 있는 이름·별칭만 찾는다. 새 작품에서 바로 쓰려면 설정집에 항목을 먼저 넣거나, 올린 뒤 "전체 다시 정리"

## 3-4. API 키 없이 만든 것 (M4 뼈대 + 내 설정 + 이미지 시트)

- DB `supabase/migrations/0004_ai_ready.sql`(**사용자 실행 필요**): `item_aliases.source`, `increment_ai_usage()`(service role 전용), `search_chunks()`(pg_trgm word_similarity, service role 전용)
- 서버 `supabase/functions/`:
  - `_shared/`: `verify.ts`(8.3 근거 검증), `context.ts`(8.2 근거 조립: 8장면·12,000자·150항목), `rules.ts`(8.4 거르기, 8.6 draft 제거), `retrieval.ts`(`retrieve(workId, query, itemIds)`), `claude.ts`(SDK + 구조화 출력, 1회 재시도, 키 없으면 `ai_off`), `schemas.ts`(zod), `prompts.ts`, `limits.ts`, `http.ts`, `deps.ts`(버전 고정)
  - 함수: `ai-status`, `analyze-episode`, `guide`, `design-next`, `chat`, `delete-account`
  - 순수 로직 테스트 `_shared/shared.test.ts`(vitest), 함수 전체는 `deno check` 통과, 가짜 Claude 서버로 요청 모양·재시도·키 없음 확인
  - 배포 `.github/workflows/functions.yml`(GitHub 비밀값 `SUPABASE_ACCESS_TOKEN`이 있을 때만)
- 화면: `src/data/ai.ts`(invoke + 오류 코드), `features/ai/aiStatus.ts`(켜짐/꺼짐·이유), 원고 올린 뒤 AI 정리(진행·실패 회차 다시 정리), 검토 화면 AI 추정(별칭·관계·새 항목 맞아요/지우기, 회수 추정 회수 완료/아니에요, 모두 확정), 메뉴 "정리 결과 검토" 숫자, 잊힌 복선 "AI 가이드 받기"(검증 안 된 근거는 숨김), 우주 지도 설계·초안 스위치·대화
- 내 설정 `screens/settings`: 오늘 AI 사용량, 데이터 내보내기(JSON), 내 작품 모두 지우기, 계정 삭제(함수 연결 후)
- 설정집 이미지 시트 직접 올리기(`data/images.ts`, `screens/bible/sections/SheetImage.tsx`)
- 검증: 단위 테스트 41개, 가짜 Supabase + Playwright로 AI 꺼짐(함수 없음)·켜짐(가짜 함수) 두 경우, 내보내기·지우기·이미지 시트, M2·M3 회귀 확인

### 3.6 M4 마무리(사용자가 키를 준비하면)
1. Claude API 키 발급(Claude Console → API Keys), 결제 수단 등록
2. Supabase → Edge Functions → Secrets: `ANTHROPIC_API_KEY`(필수), 필요하면 `CLAUDE_MODEL_MAIN`(기본 claude-sonnet-5-5), `CLAUDE_MODEL_FAST`(기본 claude-haiku-5-5), `DAILY_AI_TEXT_LIMIT`
3. 함수 배포: Supabase → Account → Access Tokens에서 토큰 발급 → GitHub 저장소 Settings → Secrets and variables → Actions → `SUPABASE_ACCESS_TOKEN` → Actions 탭에서 "Deploy Supabase Edge Functions" 실행
4. 확인할 것: 서버 키 이름(`SUPABASE_SERVICE_ROLE_KEY` 또는 `SUPABASE_SECRET_KEYS`)이 함수에서 읽히는지, 실제 원고로 analyze-episode 결과 품질과 근거 검증 통과율, 60초 안에 끝나는지
5. 그다음 M5(채점 도구, 설정 충돌)

## 3-5. M5 (채점과 설정 충돌)

- 채점 도구 `/#/eval`(`screens/eval`, `features/eval/{csv,gold,score}.ts`): 정답 CSV(파일·붙여 넣기), 찾은 비율·맞은 비율(전체·종류별), 회차·회수 판단·관계 정확도, AI 근거 통과율, 맞음/놓침/엉뚱하게 찾음, 표 복사. 예시 정답 `eval/gold/star-library.csv`(화면에서도 내려받기). 내 설정 → 도구에서 이동
- 설정 충돌: 함수 `check-consistency`(7.9·8.8, 두 근거 모두 검증), 설정집 맨 아래 "설정 충돌"(검사 버튼, 무시·수정함·다시 열기), 홈 "설정 충돌" 카드(열린 충돌이 있을 때)
- DB 변경 없음(consistency_issues는 0001에 있음)

## 3-6. M6 (삽화 스튜디오)

- 함수 `generate-image`(8.9): 요청 문장 `_shared/imagePrompt.ts`(look 항상 포함, 표지는 제목 자리 비움), OpenAI `_shared/openai.ts`(이미지 시트·다시 그리기 원본이 있으면 참조 이미지로), 비공개 Storage 저장 + images 행(prompt 저장), 성공했을 때만 사용량 +1
- 화면 `screens/studio`: 용도·등장인물·장소·자동 묘사·장면·화풍·비율·보낼 문장 미리보기·남은 횟수(한도 초과 시 비활성 + 남은 시간), 갤러리(크게 보기·보낸 요청 문장·다시 그리기·이미지 시트로 등록·지우기), 저작권 안내
- `ai-status`에 `imageEnabled` 추가
- 키를 넣을 때: Supabase → Edge Functions → Secrets에 `OPENAI_API_KEY`, 필요하면 `OPENAI_IMAGE_MODEL`(기본 gpt-image-2), `DAILY_IMAGE_LIMIT`(기본 8)

## 3-7. M7 점검 (키 없이 한 것)

- 성능: 회차 50개·항목 100개·등장 2,100여 개 가짜 작품에서 홈 첫 표시 0.8초(개발 서버 기준), 다시 들어가면 0.08초, 우주 지도 100개 별 0.7초, 확대 5번 0.36초
- 접근성: axe-core로 13개 화면 위반 0개(진행 막대 이름, 로고 링크 이름, main 영역, 제목 순서, 경고색 대비 수정)
- 반응형: 400px 폭 가로 넘침 없음(채점 화면의 긴 형식 안내 줄바꿈 수정)
- 시연 시나리오 `docs/DEMO.md`
- 웹 호환성: 빌드 대상 Chrome·Edge 107 / Firefox 104 / Safari 16 고정, lookbehind 정규식 제거, pdf.js legacy 판. 빌드 결과물을 세 대상 기준으로 문법 검사하고 메인 묶음에 최신 API가 없는지 확인. **이 환경에는 Chromium만 있어 Firefox·Safari 실제 실행은 사용자 확인 필요**
- 접근성 추가: 건너뛰기 링크, 화면별 탭 제목, 지도 Esc, 성공색 대비, 키보드만으로 주요 흐름 확인, 320px에서 엄격한 axe 점검 0개
- 남은 것(BUILD_SPEC 13장 M7): 신인 작가 3명 이상 테스트("막혔어요" 뒤 3번 이내 클릭으로 가이드·설계를 받는가), 키를 넣은 뒤 실제 AI 품질 확인

## 3-8. 처음 사용 가이드

- `src/config/guide.ts`(내용), `features/guide/{guideData,guideState}.ts`(기억), `components/GuideTour.tsx`(5장 모달: 로그인 사용자는 작품 목록 첫 방문, 비로그인은 예시 작품 첫 방문), `components/ScreenTip.tsx`(화면별 도움말, `ScreenLayout`의 `tip`)
- 내 설정 "사용 가이드 다시 보기", "화면별 도움말 다시 켜기"

## 3-9. 전자정부 UI·UX 점검표 적용 + Pretendard
- 개인정보처리방침 `/privacy`(시작 화면·내 설정 아래 링크), 계정 메뉴 `components/AccountMenu.tsx`(좁은 화면에서도 보임)
- 업로드 제한(10MB·50개) 안내·적용, 설정집 검색·종류 필터, 선택 메뉴 막대, 도움말·문의 메일, 지도 AI 대화칸 안내 글(`TextField`의 `hint`)
- 본문 글꼴 Pretendard 1.3.9(index.html, 버전 고정). 하드코딩 색은 모두 tokens.css 토큰으로 옮김

## 4. 작업 습관

- 단계가 끝나면 `README.md`의 단계 표를 갱신하고, 중요한 판단은 `docs/DECISIONS.md`에 한 줄 추가한다
- 커밋은 단계 또는 기능 단위로, 한국어 메시지로 쓴다
- `.env`(로컬용)는 커밋하지 않는다. `.env.production`에는 공개 값만 둔다
- API 키(Claude, OpenAI, Supabase secret/service_role)는 저장소에 절대 넣지 않는다. M4부터 `supabase secrets set`으로만 넣는다
- 사용자는 개발 초보다. 설명은 쉬운 한국어로, 사용자가 할 일은 화면의 버튼 이름과 클릭 순서로 안내한다

## 5. 참고 자료(저장소 밖)

- 중간고사 기획서·발표자료: claude.ai 문서/슬라이드로 제출 완료(수정하지 않음)
- 중간 프로토타입(단일 HTML): 화면 배치와 가이드 템플릿 문장의 참고용. BUILD_SPEC 16장에 가져올 것과 버릴 것이 정리돼 있다
- 교수님 피드백: 원고 자동 읽기, 우주 지도·복선 자동 입력, RAG → BUILD_SPEC에 반영 완료
