-- 연결선 방향(화살표). Supabase 대시보드 → SQL Editor → New query에 붙여 넣고 Run. 여러 번 실행해도 된다.
-- links는 a < b로 정렬해 저장하므로 방향은 따로 적는다: forward = a → b, backward = b → a, none = 방향 없음(서로).

alter table links add column if not exists direction text not null default 'none';

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'links_direction_check') then
    alter table links add constraint links_direction_check check (direction in ('none', 'forward', 'backward'));
  end if;
end $$;

-- 예시 작품 "별의 도서관"의 연결선에 방향 넣기(시드를 다시 실행했다면 이 파일도 다시 실행)
update links set direction = 'forward'   -- 검은 망토의 노인 → 푸른 잉크의 편지
where a = '00000000-0000-4000-8001-000000000002' and b = '00000000-0000-4000-8001-000000000009' and kind = 'ai';
update links set direction = 'forward'   -- 세린 → 달빛 서고의 규칙
where a = '00000000-0000-4000-8001-000000000003' and b = '00000000-0000-4000-8001-000000000007' and kind = 'manual';
update links set direction = 'forward'   -- 검은 망토의 노인 → 세린(스승과 제자)
where a = '00000000-0000-4000-8001-000000000002' and b = '00000000-0000-4000-8001-000000000003' and kind = 'ai';
