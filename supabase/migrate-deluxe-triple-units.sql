-- Deluxe (garden): Airbnb / door units 117 and 119 only.
-- Triple (veranda): door unit 112 only.
-- Family (loft) keeps 114; remove shared Deluxe/Triple links from 114.

delete from public.room_unit_types rut
using public.room_units u
where rut.room_unit_id = u.id
  and rut.room_id = 'garden'
  and u.number not in ('117', '119');

delete from public.room_unit_types rut
using public.room_units u
where rut.room_unit_id = u.id
  and rut.room_id = 'veranda'
  and u.number not in ('112');

-- Drop Airbnb import feeds tied to doors that no longer belong to these types.
delete from public.room_ical_feeds f
using public.room_units u
where f.room_unit_id = u.id
  and f.room_id = 'garden'
  and u.number not in ('117', '119');

delete from public.room_ical_feeds f
using public.room_units u
where f.room_unit_id = u.id
  and f.room_id = 'veranda'
  and u.number not in ('112');

insert into public.room_unit_types (room_unit_id, room_id)
select u.id, 'garden'
from public.room_units u
where u.number in ('117', '119')
on conflict do nothing;

insert into public.room_unit_types (room_unit_id, room_id)
select u.id, 'veranda'
from public.room_units u
where u.number = '112'
on conflict do nothing;

-- Keep Family on 114 only (idempotent).
insert into public.room_unit_types (room_unit_id, room_id)
select u.id, 'loft'
from public.room_units u
where u.number = '114'
on conflict do nothing;

update public.rooms set available_count = 2 where id = 'garden';
update public.rooms set available_count = 1 where id = 'veranda';
