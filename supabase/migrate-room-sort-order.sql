-- Room display order for staff stack and guest catalog.
alter table public.rooms
  add column if not exists sort_order integer not null default 0;

with ordered as (
  select id, row_number() over (order by rate, id) - 1 as position
  from public.rooms
)
update public.rooms r
set sort_order = ordered.position
from ordered
where r.id = ordered.id;

create index if not exists rooms_sort_order_idx on public.rooms (sort_order);
