# My Universe 제작 명세서 (Build Spec v2.0)

> 웹소설 작가의 세계관을 기억하는 AI 작업 공간.
> 이 문서는 AI 코딩 도구(Claude Code, Cursor, ChatGPT 등)가 이 문서만 읽고 서비스를 끝까지 만들 수 있도록 쓴 **단일 기준 문서**다.
> 작성일: 2026-10-28 · 작성자: 팀 My Universe 김현준 · 상태: 기말 제작용 확정본(디자인·배치는 변경 가능)

---

## 0. 이 문서를 읽는 AI에게 (반드시 먼저 읽기)

### 0.1 읽는 순서
1. 1장(제품 요약)과 2장(용어집)을 읽고 서비스가 **무엇이 아닌지**까지 이해한다.
2. 13장(단계별 구현 계획)에서 지금 몇 단계인지 확인한다. **한 번에 한 단계만** 만든다.
3. 그 단계에 필요한 장(데이터, 화면, 로직, AI)을 읽고 구현한다.
4. 단계의 "완료 기준"을 모두 통과했는지 스스로 확인하고, 결과를 사람에게 보고한다.

### 0.2 표시 규칙
- **[고정]**: 서비스의 정체성·보안·데이터 무결성에 관련된 규칙. 바꾸려면 반드시 사람에게 먼저 물어본다.
- **[변경 가능]**: 디자인, 문구, 버튼 위치, 화면 배치. 제작 중 사람이 자주 바꿀 예정이다. 바꾸기 쉬운 구조로 만든다(4.5절).
- **[미정]**: 아직 결정하지 않은 것. 임의로 정하지 말고, 기본값을 쓰되 코드에 `TODO(미정): ...` 주석을 남긴다.

### 0.3 절대 원칙 [고정]
1. **AI는 제안하고, 작가가 쓴다.** AI는 작가 대신 본문을 쓰지 않는다. 본문 초안은 작가가 스위치를 켰을 때만 만든다.
2. **근거 없는 AI 결과는 보여 주지 않는다.** AI가 원고에 대해 말하는 모든 사실(등장, 관계, 복선, 회수)에는 원고의 실제 문장(근거 문장)이 붙어야 하고, 그 문장이 원고에 글자 그대로 있는지 코드로 검증한다(8.3절).
3. **AI가 추정한 것은 추정이라고 표시한다.** 확실한 것(규칙으로 찾은 것)과 AI 추정을 화면에서 구분한다.
4. **원고는 작가만 본다.** 모든 데이터는 로그인한 소유자만 읽고 쓸 수 있다(행 단위 보안, RLS). 예시 작품만 예외로 모두가 읽을 수 있다.
5. **API 키는 브라우저에 절대 두지 않는다.** Claude·OpenAI 키는 Supabase Edge Function의 비밀값(secret)에만 둔다.
6. **기본 기능은 AI 없이도 동작한다.** 잊힌 복선 찾기, 우주 지도, 설정집, 회차 기록은 AI가 꺼져 있거나 실패해도 동작해야 한다. AI는 그 위에 얹는다.

---

## 1. 제품 요약

| 항목 | 내용 |
|---|---|
| 서비스명 | My Universe (마이 유니버스) |
| 한 줄 정의 | 신인 웹소설 작가가 자기 세계관을 한곳에 모으고, 잊힌 복선을 다시 꺼내 집필과 출판까지 이어 가도록 돕는 AI 작업 공간 |
| 핵심 메시지 | "당신의 이야기는 이미 충분히 넓다. 잊었던 별을 다시 찾으면 된다." |
| 주요 사용자 | 연재 1년 미만, 판타지·로판·무협처럼 세계관이 넓은 장르의 신인 웹소설 작가 |
| 이용 상황 | PC에서 원고를 쓰다가 막혔을 때, 원고 창 옆에 띄워 두고 쓴다 |
| 서비스 유형 [고정] | **작가 보조형 + 가벼운 붙여 넣기.** 집필은 작가가 쓰던 도구에서 하고, My Universe에는 원고 파일을 올리거나 회차 본문을 붙여 넣는다. 서비스 안에 집필 편집기는 만들지 않는다. |
| 기기 | PC 웹 우선(1280px 이상 최적). 태블릿·휴대폰에서도 깨지지 않고 읽기·간단 조작 가능 |

### 1.1 핵심 사용 흐름 [고정]
```
원고 올리기(파일 여러 개 또는 붙여 넣기)
 → 자동 정리(재등장·연결선은 규칙으로, 새 항목·복선·관계는 AI 추정)
 → 작가가 틀린 것만 고침
 → 홈: "N화 차례" + 오래 잊힌 복선
 → 막혔을 때: "막혔어요" → 잊힌 복선 가이드(근거 문장 포함)
 → 우주 지도에서 설정을 골라 AI와 다음 회차 설계(플롯·장면 3개)
 → 작가가 집필(서비스 밖) → 다시 원고 올리기
 → (출판 준비) 삽화 스튜디오에서 캐릭터 이미지 시트 기반 삽화·표지 시안
```

### 1.2 범위
**포함**: 구글 로그인, 작품 여러 개, 원고 업로드(.docx/.pdf/.txt, 여러 파일 한 번에), 붙여 넣기, 자동 정리와 검토, 설정집(추가·수정·삭제·별칭·이미지 시트), 회차 기록, 잊힌 복선 찾기(4단계 상태, 재사용 가능성), 우주 지도(자동 연결선, 확대·축소, 종류별 보기), 다음 회차 설계와 AI 대화(RAG), 설정 충돌 감지, 삽화 스튜디오, 예시 작품 둘러보기, AI 정확도 채점 도구, 사용량 제한.

**제외 [고정]**: 서비스 내 집필 편집기, 결제, 커뮤니티·게시판, 연재 플랫폼 연동, 한글(HWP) 파일 직접 읽기(PDF로 저장 안내), 모바일 앱.

**향후 확장(이번에 만들지 않음)**: 우주 지도 읽기 전용 공유 링크, 설정집 템플릿 나눔, 임베딩 기반 의미 검색(데이터 구조만 미리 준비).

---

## 2. 용어집 [고정]

코드의 변수·테이블 이름은 오른쪽 영문을 쓴다. 화면 문구는 왼쪽 한국어를 쓴다.

| 화면 용어 | 코드 이름 | 정의 |
|---|---|---|
| 작품 | `work` | 작가의 소설 한 편. 작가는 작품을 여러 개 가질 수 있다. |
| 회차 | `episode` | 연재 한 화. 번호(`no`)는 작품 안에서 유일하다. |
| 장면 | `chunk` | 회차를 검색 단위로 나눈 조각(7.6절). RAG 검색과 근거 문장의 단위. |
| 항목 | `item` | 설정집의 한 줄. 종류는 캐릭터·설정·복선 3가지. |
| 종류 | `item.kind` | `character`(캐릭터) / `setting`(설정: 장소·규칙·물건) / `foreshadow`(복선) |
| 별칭 | `alias` | 같은 항목의 다른 이름. 예: "리안" = "견습생" = "사서님" |
| 등장 | `appearance` | 어떤 항목이 어떤 회차·장면에 나왔다는 기록. 근거 문장을 가진다. |
| 마지막 등장 회차 | `last_ep` | 그 항목이 나온 가장 큰 회차 번호(등장 기록에서 계산). |
| 미등장 회차 수 | `gap` | `다음 회차 번호 − last_ep`. "N화째 미등장"으로 표시. |
| 복선 상태 | `item.status` | `open` 미회수 / `resolved` 회수 완료 / `reuse_planned` 재사용 예정 / `reused` 재사용됨 |
| 재사용 가능성 | `reuse_score` | 회수된 복선을 다시 쓸 만한 정도. 높음·보통·낮음 + 이유 한 줄 |
| 연결선 | `link` | 두 항목 사이의 관계. 출처는 규칙(같은 장면 등장)·AI 추정·작가 직접 3가지 |
| 우주 지도 | `universe map` | 항목을 별, 연결선을 선으로 그린 마인드맵 |
| 근거 문장 | `evidence` | 원고에 글자 그대로 있는 문장. AI 결과의 출처 |
| AI 추정 | `source = 'ai'` | AI가 찾아서 확실하지 않은 정보. 화면에 "AI 추정" 표시 |
| 예시 작품 | `work.is_sample` | 누구나 읽기만 할 수 있는 체험용 작품("별의 도서관") |
| 캐릭터 이미지 시트 | `item.reference_image` | 캐릭터·장소의 기준 이미지와 외모 정보. 삽화 생성 때 참조 |

---

## 3. 기술 구조

### 3.1 스택 [고정, 버전은 구현 시점의 안정판]
| 영역 | 선택 | 이유 |
|---|---|---|
| 화면 | **Vite + React + TypeScript** | AI 코딩 도구가 가장 잘 다루는 조합. 화면 조각(컴포넌트)을 옮기기 쉬워 배치 변경에 유리 |
| 라우팅 | React Router **HashRouter** (`/#/home`) | GitHub Pages는 정적 호스팅이라 새로고침 시 404를 피하려고 해시 주소 사용 |
| 스타일 | CSS 변수(디자인 토큰) + CSS Modules | 색·글꼴·간격을 한 파일에서 바꾸면 전체가 바뀜(4장) |
| 서버·DB | **Supabase** (Postgres, Auth, Storage, Edge Functions) | DB·로그인·파일·키 숨김 서버를 한 곳에서. 무료 플랜으로 시작 |
| 로그인 | Supabase Auth **구글 로그인**, `flowType: 'pkce'` | 버튼 하나, 비밀번호 관리 불필요 |
| 글 AI | **Claude API** (Anthropic Messages API) | 원고 정리·가이드·설계·대화·충돌 감지 |
| 이미지 AI | **OpenAI 이미지 API** | 삽화·표지·이미지 시트만. 크레딧이 적으므로 사용량 제한 필수 |
| 원고 읽기 | 브라우저에서 `mammoth`(docx), `pdfjs-dist`(pdf) | 파일을 서버로 보내기 전에 글자만 뽑음 |
| 검색(RAG v1) | Postgres `pg_trgm` + 이름·별칭 일치 + 회차 요약 | 무료, 한국어 이름 검색에 충분 |
| 검색(RAG v2, 향후) | `pgvector` 임베딩 | 테이블에 칸만 미리 만들어 둠. 임베딩 제공자는 [미정] |
| 배포 | **GitHub Pages**(화면) + Supabase(서버) | 둘 다 무료 |

### 3.2 환경 변수
- 화면(`.env`, 공개돼도 되는 값만):
  - `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY` (`sb_publishable_`로 시작. Supabase의 Connect 화면에 나오는 이름 그대로 사용)
- Edge Function 비밀값(`supabase secrets set`, 절대 화면 코드·GitHub에 넣지 않음) [고정]:
  - `ANTHROPIC_API_KEY`, `CLAUDE_MODEL_MAIN`(기본 `claude-sonnet-5-5`), `CLAUDE_MODEL_FAST`(기본 `claude-haiku-5-5`)
  - `OPENAI_API_KEY`, `OPENAI_IMAGE_MODEL`(구현 시점에 OpenAI 문서에서 이미지 모델명 확인 후 설정)
  - `DAILY_AI_TEXT_LIMIT`(기본 50), `DAILY_IMAGE_LIMIT`(기본 8)

### 3.3 폴더 구조
```
my-universe/
├─ README.md                  # 실행 방법, 배포 방법
├─ docs/
│  ├─ BUILD_SPEC.md           # 이 문서
│  └─ DECISIONS.md            # 결정 기록(15장 형식으로 계속 추가)
├─ src/
│  ├─ main.tsx, App.tsx       # 라우터, 로그인 보호
│  ├─ styles/
│  │  ├─ tokens.css           # [변경 가능] 색·글꼴·간격·모서리 (디자인의 단일 출처)
│  │  └─ base.css             # 리셋, 글꼴 로딩
│  ├─ config/
│  │  ├─ copy.ts              # [변경 가능] 화면 문구 전부(버튼 이름 포함)
│  │  ├─ nav.ts               # [변경 가능] 메뉴 순서·아이콘·이름
│  │  └─ limits.ts            # 화면에서 쓰는 한도 표시값
│  ├─ components/             # 재사용 부품(Button, Card, Tag, StarMap...)
│  ├─ screens/                # 화면(각 화면 = 섹션 조합, 4.5절)
│  │  └─ home/                # HomeScreen.tsx + sections/*.tsx
│  ├─ features/               # 로직(화면과 분리)
│  │  ├─ analysis/            # 재등장 감지, 장면 나누기, 연결선 계산
│  │  ├─ foreshadow/          # gap, 막혔어요 선택, 재사용 가능성
│  │  ├─ manuscript/          # 파일 읽기(docx/pdf/txt), 회차 번호 추출
│  │  └─ eval/                # 채점 도구
│  ├─ data/                   # Supabase 호출(쿼리 함수만), 타입
│  └─ lib/supabase.ts
├─ supabase/
│  ├─ migrations/             # SQL(5장)
│  ├─ seed/sample_work.sql    # 예시 작품 "별의 도서관"
│  └─ functions/              # Edge Functions(8장)
│     ├─ _shared/             # claude.ts, openai.ts, retrieval.ts, verify.ts, limits.ts
│     ├─ analyze-episode/
│     ├─ guide/
│     ├─ design-next/
│     ├─ chat/
│     ├─ check-consistency/
│     └─ generate-image/
└─ eval/
   ├─ gold/                   # 정답 설정집(12장)
   └─ manuscripts/            # 채점용 원고(공개 저장소면 올리지 않음, .gitignore)
```

---

## 4. 디자인 시스템 [변경 가능, 단 4.5의 구조 원칙은 고정]

현재 디자인은 출발점이다. 제작 중 바뀔 것을 전제로, **모든 값은 토큰으로, 모든 문구는 copy.ts로, 모든 배치는 섹션 단위로** 만든다.

### 4.1 브랜드 콘셉트
- 은유: 작가의 세계관 = 우주, 캐릭터·설정·복선 = 별, 오래 잊힌 복선 = 희미한 별, 회수 = 별이 다시 빛남, 연결 = 별자리.
- 인상: 차가운 기술이 아니라 **따뜻한 밤하늘과 종이**. 슬럼프에 빠진 작가에게 자극보다 안정감.
- 금색은 화면마다 가장 중요한 행동 하나(대개 "막혔어요")와 "선택됨" 상태에만 쓴다.

### 4.2 토큰 (`src/styles/tokens.css` 초기값)
```css
:root {
  /* 색 */
  --c-navy: #0B203B;        /* 메뉴, 주요 버튼, 우주 지도 배경 */
  --c-navy-2: #132C4F;      /* 메뉴 안 카드 */
  --c-navy-line: #2A4670;
  --c-gold: #E0B46A;        /* 최우선 행동, 선택된 별 */
  --c-gold-ink: #8A5D14;    /* 밝은 배경 위 금색 글자(대비 확보용) */
  --c-cream: #FBECD0;       /* 선택 칩, 가이드 제목 배경 */
  --c-paper: #F6F3EC;       /* 작업 영역 배경 */
  --c-card: #FFFDF8;
  --c-line: #E3DED2;
  --c-ink: #1B2333;         /* 본문 */
  --c-sub: #5A6172;         /* 보조 글자 */
  --c-on-navy: #C9D5E8;     /* 남색 위 보조 글자 */
  /* 의미 색(강조색과 별개) */
  --c-warn: #B8561C;  --c-warn-bg: #FBEADC;   /* 3화 이상 미등장 */
  --c-ok: #2F7A4B;    --c-ok-bg: #E3F2E8;     /* 회수 완료 */
  --c-info: #3D5A8A;  --c-info-bg: #E6ECF6;   /* 재사용 예정, 새 항목 */
  --c-ai: #6B4FA0;    --c-ai-bg: #EFEAF7;     /* AI 추정 표시 */
  /* 글꼴 */
  --f-display: "Noto Serif KR", serif;        /* 서비스명, 큰 제목 */
  --f-body: "Noto Sans KR", system-ui, sans-serif;
  /* 크기 */
  --fs-xs: 12px; --fs-sm: 13.5px; --fs-md: 15px; --fs-lg: 18px; --fs-xl: 26px;
  /* 간격(8 단위) */
  --sp-1: 4px; --sp-2: 8px; --sp-3: 12px; --sp-4: 16px; --sp-5: 24px; --sp-6: 32px;
  /* 모서리 */
  --r-sm: 8px; --r-md: 14px; --r-pill: 999px;
  /* 레이아웃 */
  --sidebar-w: 232px; --content-max: 1180px;
}
```
- 다크 모드: 이번 범위에서는 단일 테마(위 값). [미정: 필요 시 토큰만 추가]
- 색 대비: 본문 4.5:1 이상. 상태는 색만으로 표현하지 않고 글자도 함께 쓴다("3화째 미등장", "AI 추정").

### 4.3 공통 레이아웃
- 왼쪽 남색 메뉴(작품 선택, 메뉴, 원칙 문구 "AI는 제안하고, 선택과 집필은 작가가 합니다.") + 오른쪽 종이색 작업 영역.
- 860px 이하: 메뉴가 위쪽 가로 띠로 접힌다. 가로 스크롤 금지.
- 메뉴 순서 초기값(`config/nav.ts`): 내 우주 홈 → 원고 불러오기 → 잊힌 복선 찾기 → 우주 지도 → 설정집 → 회차 기록 → 삽화 스튜디오.

### 4.4 공통 부품 (`src/components`)
| 부품 | 변형 | 비고 |
|---|---|---|
| `Button` | `primary`(남색) / `accent`(금색) / `ghost`(테두리) / `danger` | 아이콘 선택, 로딩 상태, 비활성 상태 필수 |
| `Card` | 기본 / 강조(금색 테두리) / 남색 | |
| `Tag` | `neutral` `warn` `ok` `info` `gold` `ai` | 상태 표시는 반드시 Tag로 |
| `GapTag` | | gap으로 문구·색 자동 결정 |
| `StatusTag` | | 복선 상태 4단계 |
| `AiBadge` | | "AI 추정" + 근거 보기 툴팁 |
| `EvidenceQuote` | | 근거 문장 + "N화 장면 M" 링크 |
| `Chip` | 선택 칩(× 버튼) | |
| `Toast` | | 저장·오류 알림 |
| `EmptyState` | | 빈 화면: 무엇이 나타날지 + 첫 행동 버튼 |
| `Loading` / `ErrorState` | | 모든 비동기 화면에 필수 |
| `StarMap` | | 우주 지도(6.7절) |
| `ConfirmBar` | | `confirm()` 대신 화면 안 확인 막대(삭제 등) |

### 4.5 바꾸기 쉬운 구조 원칙 [고정]
제작 중 디자인과 버튼 배치가 자주 바뀐다. 다음을 지킨다.
1. **색·글꼴·간격·모서리는 토큰만 쓴다.** 컴포넌트에 `#0B203B` 같은 값을 직접 쓰지 않는다.
2. **화면 문구는 `config/copy.ts`에만 둔다.** 예: `copy.home.slumpButton = "막혔어요! 하나 골라주세요"`.
3. **화면은 섹션의 조합이다.** 각 화면 파일은 섹션 컴포넌트를 나열만 한다.
   ```tsx
   // screens/home/HomeScreen.tsx  — 순서를 바꾸면 배치가 바뀐다
   export default function HomeScreen() {
     return (
       <ScreenLayout title={...} action={<SlumpButton />}>
         <Columns>
           <Column><ForgottenListSection /><TodaySuggestionSection /></Column>
           <Column><ResolveProgressSection /><RecentUploadsSection /></Column>
         </Columns>
       </ScreenLayout>
     );
   }
   ```
4. **버튼 동작은 화면과 분리한다.** 버튼은 `features/*`의 함수(`pickSlumpItem()`, `markReusePlanned(id)`)를 부른다. 그래서 버튼을 다른 화면으로 옮겨도 그대로 동작한다.
5. **섹션은 자기 데이터를 스스로 가져온다**(작품 id만 받음). 섹션을 다른 화면으로 옮겨도 동작해야 한다.
6. 사람이 "이 버튼을 오른쪽 위로", "이 카드를 위로"라고 하면, 섹션 순서나 `ScreenLayout`의 `action` 자리만 바꾸면 되도록 유지한다.

### 4.6 시각 참고
- 중간 발표 프로토타입(단일 HTML, `my-universe.html`)과 화면 시안 5장이 현재 디자인의 기준이다. 정보 배치는 그대로 가져오되, 이 문서의 기능 명세가 우선한다.

---

## 5. 데이터 모델 (Supabase Postgres)

### 5.1 테이블 [고정: 관계와 보안 / 변경 가능: 부가 칼럼]
```sql
create extension if not exists pg_trgm;
create extension if not exists vector;   -- RAG v2 대비

create table works (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references auth.users on delete cascade,  -- 예시 작품은 null
  title text not null,
  genre text,
  is_sample boolean not null default false,
  art_style text default '수채 판타지',      -- 삽화 기본 화풍
  created_at timestamptz default now()
);

create table episodes (
  id uuid primary key default gen_random_uuid(),
  work_id uuid not null references works on delete cascade,
  no int not null,                           -- 회차 번호
  title text,
  summary text,                              -- 2~3문장 요약(AI 또는 작가)
  body text not null,                        -- 원고 전문
  source_file text,                          -- 올린 파일 이름 또는 '붙여 넣기'
  analyzed_at timestamptz,                   -- 자동 정리 완료 시각
  created_at timestamptz default now(),
  unique (work_id, no)
);

create table chunks (                        -- 장면(검색·근거 단위)
  id uuid primary key default gen_random_uuid(),
  episode_id uuid not null references episodes on delete cascade,
  work_id uuid not null references works on delete cascade,
  seq int not null,                          -- 회차 안 장면 순서(1부터)
  text text not null,
  embedding vector(1024)                     -- RAG v2용, 지금은 null
);
create index on chunks using gin (text gin_trgm_ops);

create table items (
  id uuid primary key default gen_random_uuid(),
  work_id uuid not null references works on delete cascade,
  kind text not null check (kind in ('character','setting','foreshadow')),
  name text not null,
  note text,                                 -- 설명
  look text,                                 -- 외모·모습(이미지 시트, 삽화용)
  status text not null default 'open'
    check (status in ('open','resolved','reuse_planned','reused')),
  source text not null default 'manual' check (source in ('manual','rule','ai')),
  confirmed boolean not null default true,   -- AI 추정을 작가가 확인했는지
  reference_image_path text,                 -- Storage 경로(이미지 시트)
  created_at timestamptz default now(),
  unique (work_id, name)
);

create table item_aliases (
  item_id uuid not null references items on delete cascade,
  alias text not null,
  primary key (item_id, alias)
);

create table appearances (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references items on delete cascade,
  episode_id uuid not null references episodes on delete cascade,
  chunk_id uuid references chunks on delete set null,
  evidence text not null,                    -- 원고에 글자 그대로 있는 문장
  source text not null check (source in ('rule','ai','manual')),
  role text default 'mention' check (role in ('mention','plant','resolve')),
    -- plant: 복선을 심음, resolve: 복선을 회수함(AI 추정 가능)
  unique (item_id, episode_id, chunk_id)
);

create table links (
  id uuid primary key default gen_random_uuid(),
  work_id uuid not null references works on delete cascade,
  a uuid not null references items on delete cascade,
  b uuid not null references items on delete cascade,
  kind text not null check (kind in ('co_occur','ai','manual')),
  label text,                                -- 예: '편지를 쓴 사람' (AI·작가)
  weight int default 1,                      -- 같은 장면 공동 등장 횟수
  evidence text,
  check (a < b),                             -- 중복 방지: 항상 작은 id가 a
  unique (a, b, kind)
);

create table design_sessions (               -- 다음 회차 설계와 대화
  id uuid primary key default gen_random_uuid(),
  work_id uuid not null references works on delete cascade,
  target_ep int not null,
  selected_item_ids uuid[] not null,
  include_draft boolean default false,
  messages jsonb not null default '[]',      -- [{role, content, evidence[]}]
  created_at timestamptz default now()
);

create table consistency_issues (            -- 설정 충돌
  id uuid primary key default gen_random_uuid(),
  work_id uuid not null references works on delete cascade,
  item_id uuid references items on delete cascade,
  description text not null,
  evidence_a text not null, episode_a int not null,
  evidence_b text not null, episode_b int not null,
  status text default 'open' check (status in ('open','ignored','fixed')),
  created_at timestamptz default now()
);

create table images (
  id uuid primary key default gen_random_uuid(),
  work_id uuid not null references works on delete cascade,
  purpose text check (purpose in ('sketch','illustration','cover','sheet')),
  item_ids uuid[],
  prompt text not null,                      -- 실제 보낸 요청(설정집 묘사 포함)
  storage_path text not null,
  created_at timestamptz default now()
);

create table ai_usage (                      -- 사용량 제한
  user_id uuid not null references auth.users on delete cascade,
  day date not null default current_date,
  text_calls int default 0,
  image_calls int default 0,
  primary key (user_id, day)
);
```

### 5.2 계산 값 (저장하지 않고 뷰로 계산)
```sql
create view item_stats as
select i.id, i.work_id,
  min(e.no) as first_ep,
  max(e.no) as last_ep,
  count(a.id) as mention_count
from items i
left join appearances a on a.item_id = i.id
left join episodes e on e.id = a.episode_id
group by i.id;
```
- `next_ep(work) = max(episodes.no) + 1` (회차가 없으면 1)
- `gap = next_ep − last_ep` (등장 기록이 없으면 표시하지 않음)

### 5.3 행 단위 보안(RLS) [고정]
- 모든 테이블 RLS 켜기.
- 읽기: `works.owner_id = auth.uid()` 이거나 `works.is_sample = true`인 작품에 속한 행.
- 쓰기·수정·삭제: `works.owner_id = auth.uid()`인 작품에 속한 행만. 예시 작품은 누구도 쓰기 불가(시드 스크립트만).
- `ai_usage`: 본인 행만 읽기. 쓰기는 Edge Function(service role)만.
- Storage 버킷 `images`: 비공개. 경로 `{work_id}/{image_id}.png`. 작품 소유자만 읽기(서명 URL).

### 5.4 예시 작품 시드
- 제목 "별의 도서관"(판타지, `is_sample = true`, `owner_id = null`), 6화 분량 원고, 항목 9개(중간 프로토타입의 데이터와 동일), 등장 기록, 연결선.
- 원고 본문은 시연용으로 회차당 600~1,000자 분량으로 새로 쓴다(중간 프로토타입에는 줄거리만 있었다).
- 화면 어디에서나 예시 작품에는 "예시 작품 · 읽기 전용" 띠를 표시한다.

---

## 6. 화면 명세

각 화면은 **목적 / 보여 줄 정보 / 행동 / 상태 / 완료 기준**으로 적는다. 배치·문구는 [변경 가능], 기능·완료 기준은 [고정].
라우트는 `/#/` 아래에 둔다. 작품 안 화면은 `/#/w/:workId/...`.

### 6.1 시작 화면 `/#/`
- 목적: 처음 온 사람이 서비스를 이해하고 로그인하거나 예시를 체험한다.
- 정보: 서비스명, 핵심 메시지, 3가지 가치(기록의 수고를 덜어요 / 막힌 순간에 출발점을 줘요 / 집필에서 출판까지).
- 행동: `구글로 시작하기`(로그인 후 작품 목록으로), `예시 작품 둘러보기`(로그인 없이 예시 작품 홈으로).
- 완료 기준: 로그인하지 않아도 예시 작품의 모든 화면을 읽을 수 있고, 쓰기 버튼은 "로그인하면 내 작품에서 쓸 수 있어요" 안내로 바뀐다.

### 6.2 작품 목록 `/#/works`
- 정보: 내 작품 카드(제목, 장르, 연재 회차 수, 미회수 복선 수, 마지막 업로드 날짜), 예시 작품 카드.
- 행동: `새 작품 만들기`(제목·장르 입력), 작품 열기, 작품 이름 바꾸기, 작품 삭제(화면 안 확인 막대).
- 상태: 작품이 없으면 EmptyState("첫 작품을 만들고 원고를 올리면 우주가 만들어져요" + `새 작품 만들기`).
- 완료 기준: 작품 삭제 시 회차·항목·이미지까지 모두 지워진다(cascade, Storage 포함).

### 6.3 내 우주 홈 `/#/w/:id/home`
- 정보: "다음은 N화 차례예요", 오래 잊힌 항목 최대 4개(이름, 종류, GapTag, 설명), 복선 회수 현황(회수 수/전체, 막대, 상태별 개수), 최근 원고 3개, 오늘의 한 줄 제안(잊힌 상위 2개 조합), 열린 설정 충돌 수.
- 행동: `막혔어요! 하나 골라주세요`(최우선, 금색), 항목별 `가이드 보기`, `새 회차 원고 올리기`, `우주 지도에서 이어 설계하기`, 설정 충돌 보기.
- 로직: 막혔어요 선택 규칙 7.2절.
- 상태: 원고가 하나도 없으면 홈 전체가 EmptyState("원고를 올리면 잊힌 별이 여기에 나타나요" + `원고 올리기`).
- 완료 기준: 원고를 저장하면 홈의 N화, 잊힌 목록, 회수 현황이 새로 고침 없이 바뀐다.

### 6.4 원고 불러오기 `/#/w/:id/upload`
- 입력 방식 2가지(탭): **파일 올리기**(.docx/.pdf/.txt, 여러 개, 끌어 놓기) / **붙여 넣기**(회차 번호, 제목, 본문 입력창).
- 처리 순서:
  1. 브라우저에서 글자 추출(7.5절) → 회차 번호 추출(7.5절) → 회차별 미리보기 목록(파일명, 추정 회차 번호, 글자 수, 번호 수정 가능).
  2. `저장하고 정리하기` → 회차 저장 → 장면 나누기(7.6절) → **규칙 정리**(7.3·7.4절: 재등장, 연결선) 즉시 반영 → **AI 정리**(8.4절 `analyze-episode`)를 회차 순서대로 실행, 진행 표시("3/10화 정리 중").
  3. 끝나면 검토 화면(6.5)으로 이동.
- HWP 파일: 거부하고 "한글 파일은 PDF로 저장해서 올려 주세요" 안내.
- 같은 번호 회차가 이미 있으면: 화면 안 확인 막대로 "덮어쓰기 / 건너뛰기" 선택.
- 완료 기준: 10개 파일을 한 번에 올려도 화면이 멈추지 않고, AI 정리 중 실패한 회차는 "다시 정리" 버튼과 함께 표시되며 나머지는 계속 진행된다. AI가 꺼져 있어도 1·2단계(규칙 정리)는 완료된다.

### 6.5 정리 결과 검토 `/#/w/:id/review?eps=7,8`
- 원칙 [고정]: **기본은 자동 입력, 작가는 틀린 것만 고친다.**
  - 규칙으로 찾은 것(재등장, 같은 장면 연결선): 바로 확정(`confirmed = true`).
  - AI 추정(새 항목, 복선 후보, 의미 관계, 회수 추정, 별칭): 바로 반영하되 `confirmed = false`, 화면에 "AI 추정" 배지.
- 정보: 회차별로 그룹. 각 줄 = 이름, 종류, 출처(규칙/AI 추정), 근거 문장, 회차·장면.
- 행동(한 줄마다): `맞아요`(확정), `고치기`(이름·종류·별칭 수정, 기존 항목과 합치기), `지우기`. 상단: `AI 추정 모두 확정`.
- 회수 추정: "「반쪽짜리 은열쇠」가 9화에서 회수된 것 같아요" + 근거 → `회수 완료로 표시` / `아니에요`. 상태는 작가가 눌러야 바뀐다 [고정].
- 완료 기준: 검토하지 않아도 다른 화면은 정상 동작하고(추정 항목은 배지와 함께 보임), 검토하지 않은 AI 추정 수가 메뉴 옆 숫자로 표시된다.

### 6.6 잊힌 복선 찾기 `/#/w/:id/forgot`
- 정보: 상태 필터(전체/미회수/회수 완료/재사용 예정/재사용됨, 개수), 종류 필터, 항목 카드(이름, 종류, 처음·마지막 등장 회차, GapTag, StatusTag, AI 추정 배지), 회수 완료 카드에는 재사용 가능성(7.7절).
- 오른쪽 가이드 패널(선택한 항목):
  - `N화 시작 문장 예시` 1개, 방향 3개(복선: 회수/반전/암시, 캐릭터: 재등장/관계 변화/비밀, 설정: 규칙 활용/규칙 위기/대가).
  - 각 방향에 **근거 문장**(그 항목이 나온 원고 문장, 회차 표시).
  - AI 켜짐: `guide` 함수로 생성(8.5절). AI 꺼짐·실패: 템플릿 문장(7.8절)으로 대체하고 "기본 가이드" 표시.
- 행동: `막혔어요`, 항목 선택, `재사용 예정으로 표시`(회수 완료 항목), `회수 완료로 표시` / `미회수로 되돌리기`, `우주 지도에서 이어 설계하기`, `AI와 이어서 대화`.
- 완료 기준: 재사용 예정 표시 → 홈 회수 현황 즉시 반영. 재사용 예정 항목이 새 원고에 등장하면 자동으로 `reused`.

### 6.7 우주 지도 `/#/w/:id/map`
- 그리기 규칙:
  - 중심 = 작품, 2층 = 종류 3개, 3층 = 항목(별).
  - 별 밝기 = gap이 클수록 희미(최소 투명도 0.35). 선택한 별 = 금색 + 흰 테두리.
  - 선: 종류 연결(실선), `co_occur`(얇은 실선, weight가 클수록 진하게), `ai`(점선, "AI 추정" 툴팁), `manual`(금색 점선).
  - **배치 [변경 가능]**: 항목이 30개 이하면 방사형, 그 이상이면 force 배치(d3-force 등)로 자동 전환. 라벨이 겹치지 않게 조정.
  - 확대·축소·이동(마우스 휠, 끌기, 버튼), 종류별 보기 토글, 이름 검색 → 해당 별로 이동.
  - 키보드: 별에 Tab으로 이동, Enter로 선택.
- 오른쪽 패널: 선택한 별(칩, 1개 이상), 이어 쓸 지점("N화 「제목」 다음 → N+1화"), 스위치 `본문 초안까지 받기`(기본 꺼짐) [고정], `다음 회차 설계하기`, 대화창.
- 별을 클릭하면 작은 정보창: 이름, 설명, 등장 회차, 연결된 항목, `가이드 보기`, `연결 추가`(다른 별 클릭 → 관계 이름 입력 → manual 링크).
- 설계 결과: 장면 3개(각 1~2문장) + 각 장면이 쓴 근거(어느 회차 무엇). 초안 스위치가 켜졌을 때만 본문 초안 300자 이내 추가.
- 완료 기준: 항목 60개에서도 라벨이 읽히고 화면이 끊기지 않는다. AI가 꺼져 있으면 설계 버튼은 비활성 + 이유 표시, 지도는 정상 동작.

### 6.8 설정집 `/#/w/:id/bible`
- 정보: 종류별 목록(이름, 설명, 외모·모습, 별칭, 상태, 등장 회차, 출처, 이미지 시트 썸네일), 설정 충돌 목록(7.9절).
- 행동: 추가, **수정**(모든 칸, 화면 안에서 바로), 별칭 추가·삭제, 두 항목 합치기(등장·연결 기록 이동), 삭제, 상태 변경, 이미지 시트 등록(삽화 스튜디오에서 고른 이미지 또는 직접 업로드), `설정 충돌 검사`(AI).
- 완료 기준: 항목 이름을 바꾸거나 별칭을 추가하면 다음 원고부터 재등장 감지에 반영된다. 합치기 후 지도에서 별이 하나로 합쳐진다.

### 6.9 회차 기록 `/#/w/:id/episodes`
- 정보: 회차 목록(번호, 제목, 요약, 등장 항목 태그, 글자 수, 정리 상태).
- 행동: 회차 열기(원고 전문 읽기, 장면 구분 표시, 등장 항목 강조), 제목·요약 수정, 등장 항목 직접 추가·제거, 회차 다시 정리, 회차 삭제.
- 완료 기준: 등장 항목을 직접 체크·해제하면 gap이 다시 계산된다.

### 6.10 삽화 스튜디오 `/#/w/:id/studio`
- 정보: 용도(장면 스케치 / 출판용 삽화 / 표지 시안 / 캐릭터 이미지 시트), 등장인물 선택, 장소·설정 선택, **설정집에서 자동으로 넣는 묘사**(look 칸) 미리보기, 장면 설명, 화풍, 비율(표지 3:4, 삽화 4:3, 시트 1:1), 오늘 남은 생성 횟수.
- 행동: `만들기`(1회에 1~2장, [미정] 장수), 결과 선택, `저장`, `이 이미지로 다시 그리기`, `설정집에 이미지 시트로 등록`.
- 일관성 [고정]: 이미지 요청에는 선택한 항목의 `look`을 항상 그대로 포함하고, 이미지 시트가 있으면 참조 이미지로 함께 보낸다(모델이 지원하는 경우). 실제 보낸 요청 문장은 `images.prompt`에 저장하고 화면에서 볼 수 있다.
- 저작권 안내 문구 상시 표시: "AI가 만든 이미지는 사람이 기여한 부분만 저작권이 인정돼요. 출판에 쓸 때는 직접 수정한 부분을 기록해 두세요."
- 완료 기준: 하루 한도 초과 시 버튼 비활성 + 남은 시간 안내. 생성 실패 시 크레딧 차감 안 함(사용량은 성공 시에만 증가).

### 6.11 내 설정 `/#/settings`
- 정보: 계정(구글 이메일), 오늘 AI 사용량(글/이미지), 데이터 내보내기(JSON: 작품·회차·항목·연결), 로그아웃, 계정 삭제(모든 데이터 삭제).

---

## 7. 핵심 로직 (AI 없이 동작) [고정]

### 7.1 미등장 회차 수
`gap(item) = next_ep(work) − last_ep(item)`. 등장 기록이 없으면 gap 없음. GapTag: gap ≤ 0 → "이번 화 등장", 1~2 → "N화째 미등장"(중립), 3 이상 → "N화째 미등장"(경고색).

### 7.2 막혔어요 선택
1. 후보 = 상태가 `open` 또는 `reuse_planned`이고 gap이 있는 항목.
2. gap이 가장 큰 값을 가진 항목들 중에서 하나를 무작위로 고른다. 직전에 고른 항목은 한 번 제외(연속 중복 방지).
3. 후보가 없으면 토스트 "잊힌 항목이 없어요. 원고를 올리면 여기에 쌓여요."
4. 잊힌 복선 찾기 화면으로 이동하고 그 항목을 선택, 가이드를 연다.

### 7.3 재등장 감지(규칙)
- 각 장면 텍스트에서 항목의 `name`과 모든 `alias`를 글자 그대로 찾는다.
- 이름이 공백으로 나뉜 경우(예: "반쪽짜리 은열쇠"), 전체 이름 또는 3글자 이상인 마지막 단어("은열쇠")로 찾는다. 2글자 단어 단독 일치는 하지 않는다(오탐 방지).
- 찾으면 `appearances(source='rule')`를 만들고, 근거 문장 = 일치한 단어가 들어 있는 문장(7.6절 문장 나누기).
- 재사용 예정 항목이 등장하면 상태를 `reused`로 바꾼다.

### 7.4 같은 장면 연결선(규칙)
- 한 장면에 함께 나온 항목 쌍마다 `links(kind='co_occur')`의 weight를 1 올린다.
- 지도에는 weight ≥ 2인 co_occur만 기본 표시(작품 전체에서 두 번 이상 함께 나온 쌍). 설정으로 임계값 변경 가능 [변경 가능].
- 주인공처럼 거의 모든 장면에 나오는 항목(전체 장면의 60% 이상 등장)은 co_occur 계산에서 제외해 선이 폭발하지 않게 한다.

### 7.5 원고 읽기와 회차 번호
- docx: `mammoth.extractRawText`. pdf: `pdfjs-dist`로 페이지별 텍스트 결합. txt: UTF-8(실패 시 EUC-KR 시도).
- 회차 번호 추출 순서: 파일명의 `(\d+)\s*화` → 본문 첫 줄의 `(\d+)\s*화` → `제\s*(\d+)\s*화` → 없으면 "다음 회차 번호"를 제안하고 작가가 수정.
- 한 파일에 여러 회차가 있으면(본문에 `^\s*(제\s*)?\d+\s*화` 줄이 2개 이상) 그 줄 기준으로 나눠 여러 회차로 미리보기.
- 제목: 회차 표시 줄에서 번호를 뺀 나머지, 없으면 "N화".

### 7.6 장면 나누기와 문장 나누기
- 장면 구분 기호: 빈 줄 2개 이상, `***`, `* * *`, `◇`, `◆`, `#`, `---` 단독 줄.
- 구분 기호가 없거나 장면이 1,500자를 넘으면 문단 경계에서 약 1,000~1,500자로 나눈다.
- 문장 나누기: `.`, `!`, `?`, `…`, 닫는 따옴표(`”`, `"`, `」`, `』`) 뒤 공백·줄바꿈 기준. 근거 문장은 최대 120자, 넘으면 일치 단어 주변으로 자른다.

### 7.7 재사용 가능성(규칙 1차 + AI 보정)
- 회수 완료 복선에 대해: 연결된 항목 중 최근 2회차 안에 등장한 것이 있으면 "높음"(이유: "연결된 「X」가 최근 회차에 활동 중이에요"), 최근 5회차 안이면 "보통", 아니면 "낮음".
- AI가 켜져 있으면 8.5절 guide 호출 때 한 줄 이유를 보강할 수 있다. 최종 결정은 작가가 체크 [고정].

### 7.8 기본 가이드 템플릿(AI 꺼짐·실패 시)
중간 프로토타입의 템플릿 문장을 쓴다. 한국어 조사는 받침 여부로 고른다(`을/를`, `이/가`, `은/는`, `으로/로`).
- 시작 문장: `“{name}”—그 이름을 다시 떠올린 건 {last_ep}화 이후 처음이었다.`
- 복선 회수: `지금 장면의 문제를 푸는 결정적 단서로 「{name}」{을/를} 다시 꺼내 보세요.` (반전, 암시, 캐릭터·설정용 문장은 프로토타입과 동일)

### 7.9 설정 충돌(AI, 근거 2개 필수)
- `check-consistency` 함수(8.8절)가 같은 항목의 묘사 중 서로 모순되는 두 문장을 찾는다.
- 두 근거 문장 모두 원고에 글자 그대로 있어야 저장한다. 작가는 `무시` 또는 `수정함`으로 닫는다.

---

## 8. AI 기능 (Supabase Edge Functions)

### 8.1 공통 규칙 [고정]
- 모든 AI 호출은 Edge Function을 거친다. 화면은 `supabase.functions.invoke(name, { body })`만 쓴다.
- 함수 시작 시: 로그인 확인 → 작품 소유자 확인(예시 작품이면 쓰기 함수 거부, 읽기용 guide·design은 캐시된 결과만 반환 [미정: 예시 작품 시연용 미리 생성 결과]) → 하루 한도 확인(`ai_usage`).
- 성공했을 때만 사용량 +1.
- 원고 원문을 서버 로그에 남기지 않는다.
- Claude 호출: Messages API, `x-api-key`, `anthropic-version: 2023-06-01`. 출력은 **JSON만** 받도록 지시하고, 받은 JSON을 스키마로 검증(zod 등). 실패하면 1회 재시도, 그래도 실패하면 오류 반환.
- 모델: 원고 정리·충돌 감지는 `CLAUDE_MODEL_FAST`부터 시도 가능 [변경 가능], 가이드·설계·대화는 `CLAUDE_MODEL_MAIN`.
- 시간 초과: 함수당 60초 안에 끝나도록 입력 길이를 제한한다(8.2절).

### 8.2 RAG v1: 근거 찾기 (`_shared/retrieval.ts`)
AI에게 원고 전체를 넣지 않는다. 필요한 것만 찾아 넣는다.
1. **설정집 요약**: 작품의 항목 전부(이름, 종류, 별칭, 설명, 상태, 처음·마지막 회차). 항목 150개 초과 시 선택 항목과 연결된 것 + gap 상위 위주로 줄인다.
2. **회차 요약**: 최근 5개 회차의 summary + 선택 항목이 나온 회차의 summary.
3. **장면 검색**: 선택 항목의 이름·별칭으로 `appearances` → 해당 `chunks` 본문. 부족하면 `pg_trgm` 유사도로 질문 문장과 비슷한 장면 추가. 최대 8개 장면, 합계 약 12,000자.
4. 각 장면에는 `[E{episode_no}-S{seq}]` 꼬리표를 붙여 넣고, AI는 근거를 이 꼬리표와 **원문 그대로의 문장**으로 답한다.
- RAG v2(향후): `chunks.embedding`을 채우고 3번을 의미 검색으로 바꾼다. 다른 코드는 바꾸지 않아도 되도록 `retrieve(workId, query, itemIds)` 함수 하나로 감싼다.

### 8.3 근거 검증 (`_shared/verify.ts`) [고정]
- AI가 준 모든 `evidence` 문장에 대해, 꼬리표의 장면 본문에 그 문장이 포함되는지 확인한다(공백·따옴표 종류 정규화 후 비교).
- 포함되지 않으면: 그 결과 항목을 버리거나(추출 결과) "근거를 찾지 못함"으로 표시(대화). 절대 검증 안 된 문장을 근거로 보여 주지 않는다.

### 8.4 `analyze-episode` (회차 자동 정리)
- 입력: `{ workId, episodeId }`
- 넣는 정보: 그 회차의 장면 전부(꼬리표 포함), 설정집 요약, 이전 회차 요약 3개.
- 지시 요약(시스템 프롬프트 핵심):
  - "너는 웹소설 편집 보조다. 작가의 원고에서 사실만 뽑는다. 추측으로 내용을 만들지 않는다."
  - 새로 등장한 캐릭터·설정(장소·규칙·중요한 물건), 복선으로 보이는 문장(해결되지 않은 의문, 의미심장한 물건·대사), 기존 항목의 새 별칭, 항목 간 관계, 기존 복선의 회수로 보이는 장면, 이 회차 요약 2~3문장.
  - 단순 배경 사물(고양이, 책장 등)은 반복되거나 이야기에 영향이 있을 때만.
- 출력 스키마:
```json
{
  "summary": "2~3문장",
  "new_items": [{ "kind": "character|setting|foreshadow", "name": "", "note": "", "look": "", "evidence": "", "tag": "E7-S2", "confidence": 0.0 }],
  "aliases": [{ "item_name": "기존 항목 이름", "alias": "", "evidence": "", "tag": "" }],
  "relations": [{ "a": "항목 이름", "b": "항목 이름", "label": "관계 설명", "evidence": "", "tag": "" }],
  "resolutions": [{ "item_name": "복선 이름", "evidence": "", "tag": "" }]
}
```
- 저장: confidence 0.5 미만은 버림. 나머지는 `source='ai', confirmed=false`로 저장, 검토 화면(6.5)에 표시. resolutions는 상태를 바꾸지 않고 제안만 저장.

### 8.5 `guide` (잊힌 복선 가이드)
- 입력: `{ workId, itemId }`
- 출력: `{ opening_line, directions: [{ type: "회수|반전|암시|...", text, evidence, tag }], reuse_reason? }`
- 규칙: 각 방향 2문장 이내. 설정집에 없는 사실을 새로 만들지 않고 "제안"의 말투로. 작가의 문체를 흉내 낸 본문을 쓰지 않는다(시작 문장 1개만 예외).

### 8.6 `design-next` (다음 회차 설계)
- 입력: `{ workId, itemIds: [...], targetEp, includeDraft: false }`
- 출력: `{ scenes: [{ no: 1, text, uses: [{ item, evidence, tag }] }], draft?: "300자 이내" }`
- 규칙 [고정]: 선택한 항목을 모두 장면 3개 중 하나 이상에 쓴다. `includeDraft`가 false면 `draft`를 절대 만들지 않는다(서버에서도 응답에서 제거).
- 결과는 `design_sessions`에 저장.

### 8.7 `chat` (설계 다듬기 대화)
- 입력: `{ sessionId, message }` → 같은 세션의 이전 대화 + 선택 항목 근거를 다시 검색해 넣는다.
- 출력: `{ reply, evidence: [{ text, tag }] }`
- 규칙: 원고 근거가 필요한 주장에는 근거를 붙인다. 작가가 "본문 써 줘"라고 하면, 초안 스위치가 꺼져 있을 때는 "본문 초안은 스위치를 켜면 받을 수 있어요"라고 안내하고 플롯 수준으로만 답한다.

### 8.8 `check-consistency` (설정 충돌 감지)
- 입력: `{ workId, itemId? }` (없으면 캐릭터 전체, 한 번에 최대 20개)
- 넣는 정보: 항목별로 그 항목이 나온 장면들의 근거 문장(외모·나이·능력·관계 묘사 위주).
- 출력: `{ issues: [{ item_name, description, a: { evidence, tag }, b: { evidence, tag } }] }`
- 두 근거 모두 검증(8.3) 통과한 것만 저장.

### 8.9 `generate-image` (삽화)
- 입력: `{ workId, purpose, itemIds, scene, style, ratio }`
- 요청 문장 만들기(서버): `[용도] + [화풍] + [장면 설명] + 각 항목 "{name}: {look}" + "글자를 넣지 않는다"(표지는 예외: 제목 자리만 비워 둠)`.
- 이미지 시트가 있으면 참조 이미지로 첨부(모델이 지원할 때). 결과는 Storage 저장 후 서명 URL 반환.
- 하루 한도 `DAILY_IMAGE_LIMIT` [변경 가능]. 실패 시 사용량 차감 없음.

### 8.10 오류 문구 (`config/copy.ts`)
- 한도 초과: "오늘 AI 사용량을 다 썼어요. 내일 다시 쓸 수 있어요. 기본 기능은 계속 쓸 수 있어요."
- AI 실패: "AI가 잠시 응답하지 않아요. 다시 시도해 주세요. 입력한 내용은 그대로 남아 있어요."
- 근거 없음: "원고에서 근거를 찾지 못해 이 제안은 빼 두었어요."

---

## 9. 비용과 사용량 [변경 가능]
- 원고 정리는 회차를 올릴 때 1번만 실행하고 결과를 저장한다(같은 회차를 다시 정리하려면 작가가 버튼을 눌러야 함).
- 회차 요약은 저장해서 재사용한다(RAG 입력 줄이기).
- 이미지는 하루 8장, 글 AI는 하루 50회 기본. 설정 화면에 남은 횟수 표시.
- 개발 중에는 예시 작품과 채점용 원고로만 AI를 돌린다.

---

## 10. 보안·개인정보 [고정]
- API 키: Edge Function secret에만. `.env`에는 Supabase URL과 publishable key만(secret key·service_role 키는 절대 넣지 않음).
- GitHub 저장소가 공개라면: 채점용 실제 원고(`eval/manuscripts/`)를 올리지 않는다(`.gitignore`).
- 로그인 방식: 구글 하나. Google OAuth의 Client Secret은 Supabase 대시보드에만 넣는다.
- 원고는 AI 분석 시 Anthropic·OpenAI 서버로 전송된다는 사실을 시작 화면과 원고 불러오기 화면에 한 줄로 알린다.
- 계정 삭제 시 모든 작품·회차·이미지 삭제.

---

## 11. 품질 기준
- 접근성: 모든 버튼·별에 키보드 접근, 포커스 표시, 이미지 alt, 색만으로 상태 표현 금지.
- 반응형: 400px 폭에서 가로 스크롤 없음.
- 성능: 회차 50개, 항목 100개 작품에서 홈 1초 이내 표시(캐시 사용 가능).
- 모든 비동기 화면에 로딩·빈 상태·오류 상태가 있다.
- 브라우저 `alert/confirm/prompt` 사용 금지(화면 안 확인 막대 사용).

---

## 12. AI 정확도 채점 도구

### 12.1 목적
"작가 본인의 실제 소설로 돌려 보니 AI가 이만큼 맞혔다"를 숫자로 보여 준다(기말 발표용).

### 12.2 정답 설정집 형식 (`eval/gold/{작품}.csv`)
작가가 **AI를 돌리기 전에** 직접 작성한다.
```csv
kind,name,aliases,first_ep,last_ep,status,related,resolved_ep
character,리안,견습생|사서님,1,6,,검은 망토의 노인,
foreshadow,반쪽짜리 은열쇠,은열쇠,1,3,open,금서 구역,
foreshadow,달빛 서고의 규칙,,1,4,resolved,리안,4
```

### 12.3 채점 방법 (`features/eval`, 관리자용 화면 `/#/eval`)
- 같은 원고를 새 작품으로 올리고 자동 정리 → 정답과 비교.
- 이름 일치 기준: 정답의 이름 또는 별칭 중 하나와 AI 결과의 이름·별칭이 같거나 한쪽이 다른 쪽을 포함하면 일치.
- 지표(쉬운 말로 표시):
  - 찾은 비율 = 맞게 찾은 정답 수 / 정답 수 ("작가가 적은 복선 12개 중 10개를 찾았어요")
  - 맞은 비율 = 맞게 찾은 수 / AI가 찾은 수 ("AI가 찾은 14개 중 10개가 맞았어요")
  - 종류별(캐릭터·설정·복선), 회수 판단 정확도, 근거 검증 통과율
- 결과 표: 맞음 / 놓침 / 엉뚱하게 찾음 목록. CSV로 내려받기 대신 화면 표 + 복사 버튼.

---

## 13. 단계별 구현 계획

각 단계는 끝났을 때 **항상 시연 가능한 상태**여야 한다. 단계를 건너뛰지 않는다.

### M0. 프로젝트 준비
- 사람이 할 일: 14장의 GitHub·Supabase 준비.
- 만들 것: Vite+React+TS 프로젝트, 폴더 구조(3.3), 토큰·기본 부품(4장), 메뉴·레이아웃, HashRouter, GitHub Pages 자동 배포(GitHub Actions).
- 완료 기준: 배포 주소에서 빈 화면 7개가 메뉴로 이동되고, 디자인 토큰 하나를 바꾸면 전체 색이 바뀐다.

### M1. 데이터베이스와 로그인
- 만들 것: 5장 마이그레이션 SQL, RLS, 예시 작품 시드, 구글 로그인, 작품 목록, 시작 화면.
- 완료 기준: 로그인 없이 예시 작품을 읽을 수 있고 쓰기는 막힌다. 로그인하면 내 작품을 만들 수 있고, 다른 계정에서는 내 작품이 보이지 않는다(두 계정으로 확인).

### M2. 기본 기능 이전 (AI 없음)
- 만들 것: 설정집(추가·수정·별칭·합치기·삭제), 회차 기록, 홈, 잊힌 복선 찾기(템플릿 가이드), 우주 지도(규칙 연결선, 확대·축소), 붙여 넣기 입력.
- 완료 기준: 중간 프로토타입에서 되던 것이 모두 DB 기반으로 된다. 7.1~7.4, 7.7, 7.8 로직에 단위 테스트가 있다.

### M3. 원고 자동 읽기 (규칙)
- 만들 것: 파일 여러 개 올리기, 회차 번호·여러 회차 나누기, 장면 나누기, 재등장 자동 반영, co_occur 연결선, 검토 화면(규칙 결과만).
- 완료 기준: 예시 작품 원고 6화를 새 작품에 한 번에 올리면 항목 등장과 연결선이 자동으로 채워지고, 홈이 "7화 차례"가 된다.

### M4. Claude 연결 (RAG v1)
- 사람이 할 일: Claude API 결제 또는 Max 크레딧 연결, `ANTHROPIC_API_KEY` 등록.
- 만들 것: `_shared`(claude, retrieval, verify, limits), `analyze-episode`, `guide`, `design-next`, `chat`, 검토 화면의 AI 추정 처리, 사용량 표시.
- 완료 기준: 새 원고를 올리면 AI 추정 항목이 근거 문장과 함께 나타나고, 근거 검증 실패 결과는 보이지 않는다. 설계 결과의 모든 장면에 근거가 붙는다. AI를 끄면(키 제거) 기본 기능은 그대로 동작한다.

### M5. 채점과 설정 충돌
- 사람이 할 일: 본인 소설 5~10화와 정답 설정집 준비.
- 만들 것: 채점 화면(12장), `check-consistency`, 설정 충돌 목록.
- 완료 기준: 채점 화면에서 찾은 비율·맞은 비율이 숫자로 나오고, 놓친 항목 목록을 볼 수 있다.

### M6. 삽화 스튜디오
- 사람이 할 일: `OPENAI_API_KEY`, `OPENAI_IMAGE_MODEL` 등록.
- 만들 것: `generate-image`, 스튜디오 화면, 이미지 시트 등록, Storage, 하루 한도.
- 완료 기준: 같은 캐릭터로 두 번 만들었을 때 설정집 외모가 두 요청에 모두 들어가 있다(images.prompt로 확인).

### M7. 사용자 테스트와 마무리
- 신인 작가 3명 이상 테스트("막혔어요"를 누른 뒤 3번 이내 클릭으로 가이드·설계를 받는가), 수정, 디자인 다듬기, 발표용 시연 시나리오.

---

## 14. 사람이 직접 해야 하는 일 (AI는 대신 못 함)

| 언제 | 할 일 | 메모 |
|---|---|---|
| M0 | GitHub 가입, 저장소 `my-universe` 생성, Pages 켜기(GitHub Actions 방식) | 학교 이메일로 GitHub Education 신청하면 비공개 저장소 Pages도 가능 |
| M1 | Supabase 가입, 프로젝트 생성, URL·anon key 전달 | 무료 프로젝트는 7일 비활성 시 일시정지. 발표 전 대시보드에서 Resume |
| M1 | Google Cloud Console: 프로젝트 생성, OAuth 동의 화면(앱 이름 My Universe), OAuth 클라이언트 ID(웹), 승인된 리디렉션 URI에 Supabase 콜백 주소 붙여 넣기 | 테스트 모드에서는 등록한 테스트 사용자만 로그인 가능 → 교수님·테스터 이메일 추가 |
| M1 | Supabase Auth: Google 켜기, Client ID·Secret 붙여 넣기, Site URL·Redirect URL에 GitHub Pages 주소 등록 | 주소는 복사해서 붙여 넣기(한 글자만 달라도 오류) |
| M4 | Claude API 결제(Console) 또는 Max 구독 크레딧 연결, 키 발급 | 키는 `supabase secrets set`으로만 |
| M5 | 본인 소설 5~10화 + 정답 설정집(AI 돌리기 전에 작성) | 원고가 AI 회사로 전송됨을 알고 결정 |
| M6 | OpenAI 키, 이미지 모델명 확인 | 크레딧 적음 → 한도 낮게 시작 |
| M7 | 테스트 참가 작가 섭외 | |

---

## 15. 결정 기록

| 날짜 | 결정 | 이유 |
|---|---|---|
| 3주차 | 문제를 "슬럼프·소재 고갈"로 좁힘, 복선 재활용 방식 | 기능 나열보다 연재 포기의 직접 원인에 집중 |
| 중간 | 서비스명 My Universe, 출판용 삽화 포함 | 집필에서 출판까지가 경쟁력 |
| 중간 | 원고는 docx·PDF·txt, HWP 제외 | 형식이 공개되지 않아 읽기 어려움. PDF 저장 안내로 대체 |
| 중간 | 다음 회차 설계는 플롯·장면이 기본, 본문은 요청 시만 | 작가의 창작 주도권 |
| 중간 | 복선 상태 4단계 | 실제 연재에서는 회수한 복선도 재사용 |
| 중간 후 | **교수님 피드백: 원고 자동 읽기, 우주 지도·복선 자동 입력, RAG** → "기본 자동 입력, 틀린 것만 수정" + 규칙/AI 추정 구분 | 기록의 수고를 없애면서 AI 오류가 쌓이지 않게 |
| 중간 후 | 글 AI = Claude, 이미지 AI = OpenAI | OpenAI 크레딧은 이미지에 집중 |
| 중간 후 | Supabase(DB·로그인·Storage·키 숨김 서버) | 미정이던 키 보호·저장 위치·검색을 한 번에 해결 |
| 중간 후 | RAG v1은 키워드+요약, 임베딩은 v2 | 무료로 시작, Anthropic은 임베딩 미제공 |
| 중간 후 | 구글 로그인 도입(중간에는 제외) | 원고를 DB에 저장하므로 원고 보호 필요 |
| 중간 후 | 작가 보조형 + 붙여 넣기, 편집기 없음 | 작가는 이미 쓰는 집필 도구가 있음, 편집기는 범위 과다 |
| 중간 후 | 커뮤니티 제외(공유 링크는 향후) | 핵심에서 멀고 원고 공개를 꺼림 |
| 중간 후 | 예시 작품은 "둘러보기·채점·시연"용으로 분리 | 실제 작품은 빈 상태에서 시작 |

### 미정 [미정]
- 삽화 1회 생성 장수(1장 또는 2장)
- 예시 작품의 AI 결과를 미리 생성해 둘지(로그인 없이 AI 체험)
- RAG v2 임베딩 제공자(Voyage AI 등 vs 무료 공개 모델)
- 다크 모드 제공 여부

---

## 16. 중간 프로토타입에서 가져올 것과 버릴 것

| 가져올 것 | 버릴 것 |
|---|---|
| 화면 구성과 정보 배치(시안 5장) | 예시 작품이 기본 데이터로 들어가는 구조 → 예시 작품은 별도(5.4) |
| 가이드 템플릿 문장, 조사 처리 함수 | 원고 분석의 불용어 목록(예시 원고에 맞춘 단어: "열쇠", "반쪽", "사서님" 등) |
| gap 계산, 막혔어요 선택, 재사용 가능성 규칙 | 고정된 AI 예시 답변 문장 |
| 우주 지도 방사형 배치 아이디어 | 고정 좌표 배치(항목이 많아지면 겹침) |
| 브랜드 색·글꼴·문구 톤 | 가짜 원고 기록("어제", "3일 전"), localStorage 저장 |
