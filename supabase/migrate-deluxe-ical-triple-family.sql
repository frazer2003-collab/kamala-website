-- If migrate-deluxe-four-units.sql was applied while iCal pointed at Deluxe,
-- this restores Airbnb sync for doors 112 → Triple and 114 → Family.
-- Safe to re-run. Deluxe keeps 112/114 as assignable doors.

insert into public.room_unit_types (room_unit_id, room_id)
select u.id, 'garden'
from public.room_units u
where u.number in ('112', '114', '117', '119')
on conflict do nothing;

insert into public.room_unit_types (room_unit_id, room_id)
select u.id, 'veranda'
from public.room_units u
where u.number = '112'
on conflict do nothing;

insert into public.room_unit_types (room_unit_id, room_id)
select u.id, 'loft'
from public.room_units u
where u.number = '114'
on conflict do nothing;

update public.room_ical_feeds f
set room_id = 'veranda'
from public.room_units u
where f.room_unit_id = u.id
  and u.number = '112';

update public.room_ical_feeds f
set room_id = 'loft'
from public.room_units u
where f.room_unit_id = u.id
  and u.number = '114';

update public.room_blocks b
set room_id = 'veranda'
from public.room_units u
where b.room_unit_id = u.id
  and u.number = '112'
  and b.ical_feed_id is not null;

update public.room_blocks b
set room_id = 'loft'
from public.room_units u
where b.room_unit_id = u.id
  and u.number = '114'
  and b.ical_feed_id is not null;

update public.rooms set available_count = 4 where id = 'garden';
update public.rooms set available_count = 1 where id = 'veranda';
update public.rooms set available_count = 1 where id = 'loft';
