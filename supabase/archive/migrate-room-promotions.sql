-- Percentage discounts by room and date range.
create table if not exists public.room_promotions (
  id uuid primary key default gen_random_uuid(),
  room_id text not null references public.rooms(id) on delete cascade,
  start_date date not null,
  end_date date not null,
  percent_off integer not null check (percent_off between 1 and 90),
  label text,
  created_at timestamptz not null default now(),
  constraint room_promotions_date_range check (end_date >= start_date)
);

create index if not exists room_promotions_room_dates_idx
  on public.room_promotions (room_id, start_date, end_date);

alter table public.room_promotions enable row level security;

drop policy if exists "Service role can manage room promotions" on public.room_promotions;
create policy "Service role can manage room promotions"
on public.room_promotions
for all
to service_role
using (true)
with check (true);
