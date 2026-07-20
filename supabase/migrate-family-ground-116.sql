-- Family Room Ground Floor (door 116).
-- New room type `ground` + Airbnb/assignment door 116.

insert into public.rooms (
  id,
  name,
  short_name,
  rate,
  sleeps,
  outlook,
  available_count,
  summary,
  amenities,
  tone,
  image_url,
  gallery_urls,
  sort_order,
  updated_at
)
values (
  'ground',
  'Family Room Ground Floor',
  'Family GF',
  1100,
  'Sleeps 4',
  'Ground floor · family room · private bathroom',
  1,
  'A ground-floor family room with space for four guests, private bathroom, and easy access without stairs — practical for families with young children or guests who prefer not to climb.',
  array[
    'Air conditioning',
    'Free Wi-Fi',
    'Private bathroom',
    'Family bedding',
    'Cable TV',
    'Safe',
    'Breakfast included'
  ],
  'attic',
  null,
  '{}',
  4,
  now()
)
on conflict (id) do update
set
  name = excluded.name,
  short_name = excluded.short_name,
  rate = excluded.rate,
  sleeps = excluded.sleeps,
  outlook = excluded.outlook,
  available_count = excluded.available_count,
  summary = excluded.summary,
  amenities = excluded.amenities,
  tone = excluded.tone,
  sort_order = excluded.sort_order,
  updated_at = now();

insert into public.room_units (number, sort_order)
values ('116', 45)
on conflict (number) do update
set sort_order = excluded.sort_order;

-- 116 is not Superior; strip any leftover courtyard link.
delete from public.room_unit_types rut
using public.room_units u
where rut.room_unit_id = u.id
  and u.number = '116'
  and rut.room_id = 'courtyard';

insert into public.room_unit_types (room_unit_id, room_id)
select u.id, 'ground'
from public.room_units u
where u.number = '116'
on conflict do nothing;

-- Point any Airbnb feed labeled for 116 at this room type.
update public.room_ical_feeds f
set room_id = 'ground'
from public.room_units u
where f.room_unit_id = u.id
  and u.number = '116';
