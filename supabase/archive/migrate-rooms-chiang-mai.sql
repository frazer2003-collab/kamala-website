-- Room catalog aligned with OTA listings (Agoda / Booking.com / Trip.com).
-- Rates are baseline THB nightly — adjust in Staff → Settings → Rooms as needed.

update public.rooms
set
  name = 'Superior Double or Twin Room',
  short_name = 'Superior',
  rate = 700,
  sleeps = 'Sleeps 2',
  outlook = '33 m² · king or twin · city view · non-smoking',
  available_count = 3,
  summary = 'A comfortable room a minute from Tha Phae Gate, with blackout curtains, work desk, safe, and a private bathroom with shower and bidet. Flexible king or twin setup for couples or friends.',
  amenities = array[
    'Air conditioning',
    'Free Wi-Fi',
    'Private bathroom',
    'King or twin beds',
    'Cable TV',
    'Safe',
    'Desk',
    'Breakfast included'
  ],
  image_url = 'https://i.travelapi.com/lodging/8000000/7120000/7116200/7116200/197c4b39_z.jpg',
  sort_order = 0,
  updated_at = now()
where id = 'courtyard';

update public.rooms
set
  name = 'Deluxe Double Room with Balcony',
  short_name = 'Deluxe',
  rate = 950,
  sleeps = 'Sleeps 2',
  outlook = '45 m² · king bed · balcony · garden view',
  available_count = 2,
  summary = 'More space for longer stays — 45 m² with a private balcony over the guesthouse garden, seating for two, refrigerator, and en-suite bathroom. Quiet room facing greenery above the old city.',
  amenities = array[
    'Air conditioning',
    'Free Wi-Fi',
    'Private bathroom',
    'King bed',
    'Private balcony',
    'Refrigerator',
    'Cable TV',
    'Safe',
    'Breakfast included'
  ],
  image_url = 'https://i.travelapi.com/lodging/8000000/7120000/7116200/7116200/397ae2a3_z.jpg',
  sort_order = 1,
  updated_at = now()
where id = 'garden';

update public.rooms
set
  name = 'Triple Room with Balcony',
  short_name = 'Triple',
  rate = 900,
  sleeps = 'Sleeps 3',
  outlook = '45 m² · queen + single · balcony · garden view',
  available_count = 2,
  summary = 'Ideal for three guests travelling together — queen and single bed configuration, private balcony with seating, and room to spread out after a day around Chiang Mai''s old city.',
  amenities = array[
    'Air conditioning',
    'Free Wi-Fi',
    'Private bathroom',
    'Queen and single beds',
    'Private balcony',
    'Refrigerator',
    'Cable TV',
    'Safe',
    'Breakfast included'
  ],
  image_url = null,
  sort_order = 2,
  updated_at = now()
where id = 'veranda';

update public.rooms
set
  name = 'Family Room with Balcony',
  short_name = 'Family',
  rate = 1100,
  sleeps = 'Sleeps 4',
  outlook = '70 m² · four single beds · balcony · fits families',
  available_count = 2,
  summary = 'The largest room in the house — 70 m² with four single beds, private balcony, and space for a family stay steps from Tha Phae Gate and the Sunday walking street.',
  amenities = array[
    'Air conditioning',
    'Free Wi-Fi',
    'Private bathroom',
    'Four single beds',
    'Private balcony',
    'Refrigerator',
    'Cable TV',
    'Safe',
    'Breakfast included'
  ],
  image_url = null,
  sort_order = 3,
  updated_at = now()
where id = 'loft';
