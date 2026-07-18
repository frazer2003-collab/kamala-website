-- Per room-number (Airbnb) calendar export tokens and import feeds.
-- Room-type export stays for Booking.com-style OTAs; Airbnb uses unit feeds.

alter table public.room_units
  add column if not exists ical_export_token uuid;

update public.room_units
set ical_export_token = gen_random_uuid()
where ical_export_token is null;

alter table public.room_units
  alter column ical_export_token set default gen_random_uuid();

create unique index if not exists room_units_ical_export_token_idx
  on public.room_units (ical_export_token)
  where ical_export_token is not null;

alter table public.room_ical_feeds
  add column if not exists room_unit_id uuid references public.room_units(id) on delete cascade;

create index if not exists room_ical_feeds_room_unit_id_idx
  on public.room_ical_feeds (room_unit_id)
  where room_unit_id is not null;

-- Link existing feeds labeled like airbnb-113 / 113 to door units.
update public.room_ical_feeds f
set room_unit_id = u.id
from public.room_units u
where f.room_unit_id is null
  and (
    lower(trim(f.label)) = lower('airbnb-' || u.number)
    or lower(trim(f.label)) = lower(u.number)
    or lower(trim(f.label)) like lower('%' || u.number)
  );

-- Assign imported channel stays to their feed's room number when missing.
update public.room_blocks b
set room_unit_id = f.room_unit_id
from public.room_ical_feeds f
where b.ical_feed_id = f.id
  and f.room_unit_id is not null
  and b.room_unit_id is null;
