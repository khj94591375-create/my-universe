-- 0005: 맞춤법 검사 "앞으로도 이 표현 유지" — 작품별 사용자 사전
-- 작가가 고르지 않는 한 비어 있다. 기존 표·데이터는 바꾸지 않는다. 여러 번 실행해도 안전하다.

create table if not exists style_terms (
  id uuid primary key default gen_random_uuid(),
  work_id uuid not null references works on delete cascade,
  term text not null check (length(term) between 1 and 100),  -- 유지할 표현(원문 그대로)
  note text,                                                    -- 메모(예: 사투리, 세계관 용어)
  created_at timestamptz not null default now(),
  unique (work_id, term)
);
create index if not exists style_terms_work_idx on style_terms (work_id);

-- 보안 규칙: 예시 작품·내 작품은 읽기, 쓰기는 내 작품만(다른 표와 같은 규칙)
alter table style_terms enable row level security;
drop policy if exists style_terms_read on style_terms;
create policy style_terms_read on style_terms for select using (public.can_read_work(work_id));
drop policy if exists style_terms_write on style_terms;
create policy style_terms_write on style_terms for all to authenticated
  using (public.owns_work(work_id)) with check (public.owns_work(work_id));

grant select on style_terms to anon, authenticated;
grant insert, update, delete on style_terms to authenticated;
