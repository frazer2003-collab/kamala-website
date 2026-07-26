-- Date-specific room closures for staff calendar management.

create table if not exists public.room_blocks (
  id uuid primary key default gen_random_uuid(),
  room_id text not null references public.rooms(id) on delete cascade,
  start_date date not null,
  end_date date not null check (end_date > start_date),
  reason text,
  staff_note text,
  created_at timestamptz not null default now()
);

grant all on public.room_blocks to service_role;

alter table public.room_blocks enable row level security;

drop policy if exists "Service role can manage room blocks" on public.room_blocks;
create policy "Service role can manage room blocks"
on public.room_blocks
for all
to service_role
using (true)
with check (true);
