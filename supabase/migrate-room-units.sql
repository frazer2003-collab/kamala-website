-- Physical room numbers (door units) and assignment on confirmed stays.
-- Deluxe (garden) and Triple (veranda) share 112/117/119/114; Family (loft) can use 114.

create table if not exists public.room_units (
  id uuid primary key default gen_random_uuid(),
  number text not null unique,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.room_unit_types (
  room_unit_id uuid not null references public.room_units(id) on delete cascade,
  room_id text not null references public.rooms(id) on delete cascade,
  primary key (room_unit_id, room_id)
);

create index if not exists room_unit_types_room_id_idx
  on public.room_unit_types (room_id);

alter table public.booking_requests
  add column if not exists room_unit_id uuid references public.room_units(id) on delete set null;

create index if not exists booking_requests_room_unit_id_idx
  on public.booking_requests (room_unit_id)
  where room_unit_id is not null;

grant all on public.room_units to service_role;
grant all on public.room_unit_types to service_role;

alter table public.room_units enable row level security;
alter table public.room_unit_types enable row level security;

drop policy if exists "Service role can manage room units" on public.room_units;
create policy "Service role can manage room units"
on public.room_units
for all
to service_role
using (true)
with check (true);

drop policy if exists "Service role can manage room unit types" on public.room_unit_types;
create policy "Service role can manage room unit types"
on public.room_unit_types
for all
to service_role
using (true)
with check (true);

-- Seed physical rooms (idempotent by number).
insert into public.room_units (number, sort_order)
values
  ('113', 10),
  ('115', 20),
  ('118', 30),
  ('120', 40),
  ('112', 50),
  ('114', 60),
  ('117', 70),
  ('119', 80)
on conflict (number) do update
set sort_order = excluded.sort_order;

-- Superior only: 113, 115, 118, 120
insert into public.room_unit_types (room_unit_id, room_id)
select u.id, 'courtyard'
from public.room_units u
where u.number in ('113', '115', '118', '120')
on conflict do nothing;

-- Deluxe + Triple shared pool
insert into public.room_unit_types (room_unit_id, room_id)
select u.id, t.room_id
from public.room_units u
cross join (values ('garden'), ('veranda')) as t(room_id)
where u.number in ('112', '114', '117', '119')
on conflict do nothing;

-- Family can use 114
insert into public.room_unit_types (room_unit_id, room_id)
select u.id, 'loft'
from public.room_units u
where u.number = '114'
on conflict do nothing;

-- Align default sellable counts with physical units for each type.
update public.rooms set available_count = 4 where id = 'courtyard';
update public.rooms set available_count = 4 where id = 'garden';
update public.rooms set available_count = 4 where id = 'veranda';
update public.rooms set available_count = 1 where id = 'loft';

-- OTA / channel reservations can also be assigned a door number.
alter table public.room_blocks
  add column if not exists room_unit_id uuid references public.room_units(id) on delete set null;

create index if not exists room_blocks_room_unit_id_idx
  on public.room_blocks (room_unit_id)
  where room_unit_id is not null;

NOTIFY pgrst, 'reload schema';
