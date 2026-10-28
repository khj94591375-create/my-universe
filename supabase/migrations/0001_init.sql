-- M1: 표, 계산 뷰, 행 단위 보안(RLS), Storage 버킷 (BUILD_SPEC 5장)
-- Supabase 대시보드 → SQL Editor → New query에 붙여 넣고 Run.
-- 여러 번 실행해도 오류가 나지 않도록 if not exists / drop ... if exists를 쓴다.

create extension if not exists pg_trgm with schema extensions;
create extension if not exists vector with schema extensions;   -- RAG v2 대비
set search_path = public, extensions;

-- ───────────────────────── 5.1 표 ─────────────────────────

create table if not exists works (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references auth.users on delete cascade default auth.uid(),  -- 예시 작품은 null
  title text not null,
  genre text,
  is_sample boolean not null default false,
  art_style text default '수채 판타지',      -- 삽화 기본 화풍
  created_at timestamptz default now()
);
create index if not exists works_owner_idx on works (owner_id);

create table if not exists episodes (
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

create table if not exists chunks (           -- 장면(검색·근거 단위)
  id uuid primary key default gen_random_uuid(),
  episode_id uuid not null references episodes on delete cascade,
  work_id uuid not null references works on delete cascade,
  seq int not null,                          -- 회차 안 장면 순서(1부터)
  text text not null,
  embedding vector(1024)                     -- RAG v2용, 지금은 null
);
create index if not exists chunks_text_trgm_idx on chunks using gin (text gin_trgm_ops);
create index if not exists chunks_work_idx on chunks (work_id);

create table if not exists items (
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

create table if not exists item_aliases (
  item_id uuid not null references items on delete cascade,
  alias text not null,
  primary key (item_id, alias)
);

create table if not exists appearances (
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
create index if not exists appearances_episode_idx on appearances (episode_id);

create table if not exists links (
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
create index if not exists links_work_idx on links (work_id);

create table if not exists design_sessions (  -- 다음 회차 설계와 대화
  id uuid primary key default gen_random_uuid(),
  work_id uuid not null references works on delete cascade,
  target_ep int not null,
  selected_item_ids uuid[] not null,
  include_draft boolean default false,
  messages jsonb not null default '[]',      -- [{role, content, evidence[]}]
  created_at timestamptz default now()
);

create table if not exists consistency_issues (  -- 설정 충돌
  id uuid primary key default gen_random_uuid(),
  work_id uuid not null references works on delete cascade,
  item_id uuid references items on delete cascade,
  description text not null,
  evidence_a text not null, episode_a int not null,
  evidence_b text not null, episode_b int not null,
  status text default 'open' check (status in ('open','ignored','fixed')),
  created_at timestamptz default now()
);

create table if not exists images (
  id uuid primary key default gen_random_uuid(),
  work_id uuid not null references works on delete cascade,
  purpose text check (purpose in ('sketch','illustration','cover','sheet')),
  item_ids uuid[],
  prompt text not null,                      -- 실제 보낸 요청(설정집 묘사 포함)
  storage_path text not null,
  created_at timestamptz default now()
);

create table if not exists ai_usage (         -- 사용량 제한
  user_id uuid not null references auth.users on delete cascade,
  day date not null default current_date,
  text_calls int default 0,
  image_calls int default 0,
  primary key (user_id, day)
);

-- ───────────────────────── 5.2 계산 뷰 ─────────────────────────
-- security_invoker = true: 뷰를 읽는 사람의 RLS가 그대로 적용된다(남의 작품 통계가 새지 않음).

create or replace view item_stats with (security_invoker = true) as
select i.id, i.work_id,
  min(e.no) as first_ep,
  max(e.no) as last_ep,
  count(a.id) as mention_count
from items i
left join appearances a on a.item_id = i.id
left join episodes e on e.id = a.episode_id
group by i.id;

-- 작품 목록 카드용: 연재 회차 수, 미회수 복선 수, 마지막 업로드 시각
create or replace view work_stats with (security_invoker = true) as
select w.id as work_id,
  (select count(*) from episodes e where e.work_id = w.id) as episode_count,
  (select count(*) from items i
     where i.work_id = w.id and i.kind = 'foreshadow' and i.status = 'open') as open_foreshadow_count,
  (select max(e.created_at) from episodes e where e.work_id = w.id) as last_upload_at
from works w;

-- ───────────────────────── 5.3 행 단위 보안 ─────────────────────────
-- 읽기: 내 작품 또는 예시 작품. 쓰기: 내 작품만(예시 작품은 owner_id가 null이라 아무도 못 씀).

create or replace function public.can_read_work(wid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from works w
    where w.id = wid and (w.is_sample or w.owner_id = auth.uid())
  );
$$;

create or replace function public.owns_work(wid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from works w
    where w.id = wid and w.owner_id = auth.uid()
  );
$$;

alter table works              enable row level security;
alter table episodes           enable row level security;
alter table chunks             enable row level security;
alter table items              enable row level security;
alter table item_aliases       enable row level security;
alter table appearances        enable row level security;
alter table links              enable row level security;
alter table design_sessions    enable row level security;
alter table consistency_issues enable row level security;
alter table images             enable row level security;
alter table ai_usage           enable row level security;

-- works
drop policy if exists works_read on works;
create policy works_read on works for select
  using (is_sample or owner_id = auth.uid());
drop policy if exists works_insert on works;
create policy works_insert on works for insert to authenticated
  with check (owner_id = auth.uid() and not is_sample);
drop policy if exists works_update on works;
create policy works_update on works for update to authenticated
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid() and not is_sample);
drop policy if exists works_delete on works;
create policy works_delete on works for delete to authenticated
  using (owner_id = auth.uid());

-- work_id를 가진 표: 같은 규칙을 반복해서 만든다.
do $$
declare t text;
begin
  foreach t in array array['episodes','chunks','items','links','design_sessions','consistency_issues','images'] loop
    execute format('drop policy if exists %1$s_read on %1$I', t);
    execute format('create policy %1$s_read on %1$I for select using (public.can_read_work(work_id))', t);
    execute format('drop policy if exists %1$s_write on %1$I', t);
    execute format(
      'create policy %1$s_write on %1$I for all to authenticated
         using (public.owns_work(work_id)) with check (public.owns_work(work_id))', t);
  end loop;
end $$;

-- item_aliases, appearances: 항목(items)을 거쳐 작품을 확인
drop policy if exists item_aliases_read on item_aliases;
create policy item_aliases_read on item_aliases for select
  using (exists (select 1 from items i where i.id = item_id and public.can_read_work(i.work_id)));
drop policy if exists item_aliases_write on item_aliases;
create policy item_aliases_write on item_aliases for all to authenticated
  using (exists (select 1 from items i where i.id = item_id and public.owns_work(i.work_id)))
  with check (exists (select 1 from items i where i.id = item_id and public.owns_work(i.work_id)));

drop policy if exists appearances_read on appearances;
create policy appearances_read on appearances for select
  using (exists (select 1 from items i where i.id = item_id and public.can_read_work(i.work_id)));
drop policy if exists appearances_write on appearances;
create policy appearances_write on appearances for all to authenticated
  using (exists (select 1 from items i where i.id = item_id and public.owns_work(i.work_id)))
  with check (exists (select 1 from items i where i.id = item_id and public.owns_work(i.work_id)));

-- ai_usage: 본인 행만 읽기. 쓰기 정책이 없으므로 Edge Function(service role)만 쓸 수 있다.
drop policy if exists ai_usage_read on ai_usage;
create policy ai_usage_read on ai_usage for select to authenticated
  using (user_id = auth.uid());

-- 화면(anon·authenticated)에서 표에 접근할 권한. 실제로 어떤 행이 보이는지는 위의 RLS가 정한다.
grant usage on schema public to anon, authenticated;
grant select on all tables in schema public to anon, authenticated;
grant insert, update, delete on works, episodes, chunks, items, item_aliases, appearances, links,
  design_sessions, consistency_issues, images to authenticated;
grant execute on function public.can_read_work(uuid), public.owns_work(uuid) to anon, authenticated;

-- ───────────────────────── Storage 버킷 images ─────────────────────────
-- 비공개 버킷. 경로 {work_id}/{image_id}.png. 첫 폴더 이름이 내 작품 id일 때만 읽기·쓰기(서명 URL로 보여 줌).

insert into storage.buckets (id, name, public)
values ('images', 'images', false)
on conflict (id) do nothing;

create or replace function public.owns_storage_path(path text)
returns boolean language plpgsql stable security definer set search_path = public as $$
declare wid uuid;
begin
  begin
    wid := split_part(path, '/', 1)::uuid;
  exception when others then
    return false;                            -- 첫 폴더가 작품 id가 아니면 거부
  end;
  return public.owns_work(wid);
end;
$$;
grant execute on function public.owns_storage_path(text) to authenticated;

drop policy if exists images_owner_read on storage.objects;
create policy images_owner_read on storage.objects for select to authenticated
  using (bucket_id = 'images' and public.owns_storage_path(name));
drop policy if exists images_owner_insert on storage.objects;
create policy images_owner_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'images' and public.owns_storage_path(name));
drop policy if exists images_owner_update on storage.objects;
create policy images_owner_update on storage.objects for update to authenticated
  using (bucket_id = 'images' and public.owns_storage_path(name))
  with check (bucket_id = 'images' and public.owns_storage_path(name));
drop policy if exists images_owner_delete on storage.objects;
create policy images_owner_delete on storage.objects for delete to authenticated
  using (bucket_id = 'images' and public.owns_storage_path(name));
