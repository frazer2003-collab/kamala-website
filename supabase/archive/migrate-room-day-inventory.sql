-- Per-day inventory overrides for staff calendar (rooms to sell).

create table if not exists public.room_day_inventory (
  id uuid primary key default gen_random_uuid(),
  room_id text not null references public.rooms(id) on delete cascade,
  date date not null,
  rooms_to_sell smallint not null check (rooms_to_sell >= 0),
  created_at timestamptz not null default now(),
  unique (room_id, date)
);

create index if not exists room_day_inventory_room_date_idx
  on public.room_day_inventory (room_id, date);

grant all on public.room_day_inventory to service_role;

alter table public.room_day_inventory enable row level security;

drop policy if exists "Service role can manage room day inventory" on public.room_day_inventory;
create policy "Service role can manage room day inventory"
on public.room_day_inventory
for all
to service_role
using (true)
with check (true);
