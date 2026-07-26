-- iCal import feeds and export tokens for OTA calendar sync.

create table if not exists public.room_ical_feeds (
  id uuid primary key default gen_random_uuid(),
  room_id text not null references public.rooms(id) on delete cascade,
  label text not null check (length(trim(label)) > 0),
  import_url text not null check (length(trim(import_url)) > 0),
  last_synced_at timestamptz,
  last_sync_error text,
  created_at timestamptz not null default now()
);

alter table public.rooms
  add column if not exists ical_export_token uuid default gen_random_uuid();

update public.rooms
set ical_export_token = gen_random_uuid()
where ical_export_token is null;

alter table public.room_blocks
  add column if not exists ical_feed_id uuid,
  add column if not exists ical_uid text;

alter table public.room_blocks
  drop constraint if exists room_blocks_ical_feed_id_fkey;

alter table public.room_blocks
  add constraint room_blocks_ical_feed_id_fkey
  foreign key (ical_feed_id) references public.room_ical_feeds(id) on delete cascade;

create unique index if not exists room_blocks_ical_feed_uid_idx
  on public.room_blocks (ical_feed_id, ical_uid)
  where ical_feed_id is not null and ical_uid is not null;

create index if not exists room_ical_feeds_room_id_idx
  on public.room_ical_feeds (room_id);

grant all on public.room_ical_feeds to service_role;

alter table public.room_ical_feeds enable row level security;

drop policy if exists "Service role can manage room ical feeds" on public.room_ical_feeds;
create policy "Service role can manage room ical feeds"
on public.room_ical_feeds
for all
to service_role
using (true)
with check (true);
