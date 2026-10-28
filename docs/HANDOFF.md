# 작업 인계 문서 (Claude Code용)

> 이 문서는 claude.ai 대화에서 진행하던 작업을 Claude Code로 넘기기 위한 현재 상태 요약이다.
> 기준 문서는 `docs/BUILD_SPEC.md`이고, 작업 규칙은 루트의 `CLAUDE.md`다. 충돌하면 BUILD_SPEC이 우선한다.
> 작성일: 2026-10-28

## 1. 지금 상태 한눈에

| 항목 | 상태 |
|---|---|
| 현재 단계 | **M2 완료 → 다음은 M3** |
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
- DB 변경 없음(새 SQL 실행 필요 없음)
- 검증: 단위 테스트 20개, 예시 작품 데이터로 만든 가짜 Supabase + Playwright로 화면 흐름 전체(읽기 전용, 항목 추가·별칭·붙여 넣기·덮어쓰기 확인·상태 변경·재사용됨 자동 전환·등장 해제·연결 추가·합치기·수정, 400px 폭) 확인

### 3.5 다음 작업: M3 (원고 자동 읽기, 규칙)
BUILD_SPEC 13장 M3. 파일 여러 개 올리기(docx·pdf·txt), 회차 번호·여러 회차 나누기(7.5), 검토 화면(규칙 결과). 규칙 정리는 `runRules.ts`를 그대로 쓴다. 쓰기 버튼은 `WriteButton`.

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
