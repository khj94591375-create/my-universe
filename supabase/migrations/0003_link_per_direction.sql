-- 같은 두 항목 사이에도 방향마다 연결선을 하나씩 둘 수 있게 한다(예: 노인 → 세린 "스승", 세린 → 노인 "제자").
-- Supabase 대시보드 → SQL Editor → New query에 붙여 넣고 Run. 여러 번 실행해도 된다.

-- 0002를 건너뛰었어도 동작하도록 방향 칸을 먼저 확인한다
alter table links add column if not exists direction text not null default 'none';
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'links_direction_check') then
    alter table links add constraint links_direction_check check (direction in ('none', 'forward', 'backward'));
  end if;
end $$;

-- (a, b, kind) 하나만 허용하던 제약을 (a, b, kind, direction)으로 바꾼다
alter table links drop constraint if exists links_a_b_kind_key;
create unique index if not exists links_a_b_kind_direction_key on links (a, b, kind, direction);
