-- Door 114 is Family (loft) only — remove any leftover Deluxe (garden) link.

delete from public.room_unit_types rut
using public.room_units u
where rut.room_unit_id = u.id
  and rut.room_id = 'garden'
  and u.number = '114';

-- Keep Family on 114 (idempotent).
insert into public.room_unit_types (room_unit_id, room_id)
select u.id, 'loft'
from public.room_units u
where u.number = '114'
on conflict do nothing;
