-- Remove Triple Room (veranda). Door 112 stays under Deluxe (garden).
-- Safe to re-run. Reassigns stays / iCal first so cascade deletes do not wipe bookings.

-- Direct bookings: move Triple → Deluxe and refresh the display name.
update public.booking_requests
set
  room_id = 'garden',
  room_name = coalesce(
    (select name from public.rooms where id = 'garden'),
    'Deluxe Double Room with Balcony'
  )
where room_id = 'veranda';

-- Channel blocks + manual closures.
update public.room_blocks
set room_id = 'garden'
where room_id = 'veranda';

-- OTA import feeds (including Airbnb door 112).
update public.room_ical_feeds
set room_id = 'garden'
where room_id = 'veranda';

-- Drop Triple unit links (112 remains linked to garden).
delete from public.room_unit_types
where room_id = 'veranda';

-- Ensure Deluxe still owns door 112.
insert into public.room_unit_types (room_unit_id, room_id)
select u.id, 'garden'
from public.room_units u
where u.number = '112'
on conflict do nothing;

-- Optional day-rate overrides (table may be missing on older installs).
do $$
begin
  if to_regclass('public.room_day_rates') is not null then
    delete from public.room_day_rates where room_id = 'veranda';
  end if;
end $$;

-- Remove the Triple room type row.
-- Cascades type-scoped inventory, promotions, and leftover iCal rows still on veranda.
delete from public.rooms
where id = 'veranda';

-- Deluxe inventory includes 112/114/117/119.
update public.rooms
set available_count = 4
where id = 'garden';
