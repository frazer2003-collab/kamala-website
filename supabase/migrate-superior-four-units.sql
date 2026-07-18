-- Superior (courtyard) physical rooms: 113, 115, 118, 120 only (not 116).

delete from public.room_unit_types rut
using public.room_units u
where rut.room_unit_id = u.id
  and rut.room_id = 'courtyard'
  and u.number not in ('113', '115', '118', '120');

insert into public.room_unit_types (room_unit_id, room_id)
select u.id, 'courtyard'
from public.room_units u
where u.number in ('113', '115', '118', '120')
on conflict do nothing;

update public.rooms
set available_count = 4
where id = 'courtyard';
