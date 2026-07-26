-- Update room display names for existing Kamala databases.

update public.rooms
set
  name = 'Superior Double or Twin Room',
  short_name = 'Superior',
  sleeps = 'Sleeps 2',
  outlook = 'Comfortable room with double or twin bed configuration',
  summary = 'A calm room for short stays, with flexible bedding, morning light, and a quiet position in the guesthouse.',
  amenities = array['Double or twin beds', 'Private bath', 'Breakfast included']
where id = 'courtyard';

update public.rooms
set
  name = 'Deluxe Double Room with Balcony',
  short_name = 'Deluxe',
  sleeps = 'Sleeps 2',
  outlook = 'Deluxe double room opening onto a private balcony',
  summary = 'A little more room for longer visits, with balcony seating and a bright outlook over the guesthouse grounds.',
  amenities = array['Double bed', 'Private balcony', 'Private bath', 'Breakfast included']
where id = 'garden';

update public.rooms
set
  name = 'Triple Room with Balcony',
  short_name = 'Triple',
  sleeps = 'Sleeps 3',
  outlook = 'Triple room with balcony seating for small groups',
  summary = 'A practical room for friends or family, with space for three guests and a balcony for evening air.',
  amenities = array['Three beds', 'Private balcony', 'Private bath', 'Breakfast included']
where id = 'veranda';

update public.rooms
set
  name = 'Family Room with Balcony',
  short_name = 'Family',
  sleeps = 'Sleeps 4',
  outlook = 'Spacious family room with balcony and separated sleeping areas',
  summary = 'A spacious room for a family stay, with balcony access and enough space for parents and children.',
  amenities = array['Family bedding', 'Private balcony', 'Bath + shower', 'Breakfast included']
where id = 'loft';

update public.booking_requests
set room_name = 'Superior Double or Twin Room'
where room_id = 'courtyard';

update public.booking_requests
set room_name = 'Deluxe Double Room with Balcony'
where room_id = 'garden';

update public.booking_requests
set room_name = 'Triple Room with Balcony'
where room_id = 'veranda';

update public.booking_requests
set room_name = 'Family Room with Balcony'
where room_id = 'loft';
