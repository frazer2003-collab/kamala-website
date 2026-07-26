-- Deluxe (garden) doors: 112, 114, 117, 119 (assignment / sellable inventory).
-- Airbnb iCal for 112 → Triple (veranda); 114 → Family (loft).

insert into public.room_units (number, sort_order)
values
  ('112', 50),
  ('114', 60),
  ('117', 70),
  ('119', 80)
on conflict (number) do update
set sort_order = excluded.sort_order;

-- Deluxe keeps all four doors.
delete from public.room_unit_types rut
using public.room_units u
where rut.room_unit_id = u.id
  and rut.room_id = 'garden'
  and u.number not in ('112', '114', '117', '119');

insert into public.room_unit_types (room_unit_id, room_id)
select u.id, 'garden'
from public.room_units u
where u.number in ('112', '114', '117', '119')
on conflict do nothing;

-- 112 also belongs to Triple for iCal / channel capacity; 114 to Family.
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

-- iCal feeds + imported stays sync onto Triple / Family (not Deluxe).
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
