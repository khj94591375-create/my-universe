-- AI 연결 준비(M4). Supabase 대시보드 → SQL Editor → New query에 붙여 넣고 Run. 여러 번 실행해도 된다.

-- 1) 별칭에도 출처를 둔다: AI가 찾은 별칭은 "AI 추정"으로 보여 주고 작가가 확정한다
alter table item_aliases add column if not exists source text not null default 'manual';
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'item_aliases_source_check') then
    alter table item_aliases add constraint item_aliases_source_check check (source in ('manual', 'rule', 'ai'));
  end if;
end $$;

-- 2) 하루 AI 사용량 +1 (Edge Function이 성공했을 때만 부른다). 화면에서는 부를 수 없다.
create or replace function public.increment_ai_usage(uid uuid, kind text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if kind not in ('text', 'image') then
    raise exception 'unknown kind %', kind;
  end if;
  insert into ai_usage (user_id, day, text_calls, image_calls)
  values (uid, current_date, case when kind = 'text' then 1 else 0 end, case when kind = 'image' then 1 else 0 end)
  on conflict (user_id, day) do update
    set text_calls = ai_usage.text_calls + excluded.text_calls,
        image_calls = ai_usage.image_calls + excluded.image_calls;
end;
$$;
revoke all on function public.increment_ai_usage(uuid, text) from public;
do $$
begin
  if exists (select 1 from pg_roles where rolname = 'service_role') then
    grant execute on function public.increment_ai_usage(uuid, text) to service_role;
  end if;
end $$;

-- 3) 질문과 비슷한 장면 찾기(RAG v1, pg_trgm 유사도). Edge Function(service role)만 부른다.
create or replace function public.search_chunks(wid uuid, q text, lim int default 8)
returns table (id uuid, episode_id uuid, seq int, text text, score real)
language sql stable security definer set search_path = public, extensions as $$
  -- word_similarity: 짧은 질문이 긴 장면 안 어딘가와 얼마나 비슷한지
  select c.id, c.episode_id, c.seq, c.text, word_similarity(q, c.text) as score
  from chunks c
  where c.work_id = wid and word_similarity(q, c.text) > 0.2
  order by score desc
  limit lim;
$$;
revoke all on function public.search_chunks(uuid, text, int) from public;
do $$
begin
  if exists (select 1 from pg_roles where rolname = 'service_role') then
    grant execute on function public.search_chunks(uuid, text, int) to service_role;
  end if;
end $$;
