-- Seed Chiang Mai tours for the guest /tours page.
-- Safe to re-run: replaces rows that match these titles, then inserts any missing ones.
-- Run in the Supabase SQL editor after migrate-tours.sql (and migrate-tour-gallery.sql).

delete from public.tours
where title in (
  'Island hopping',
  'Old town walking tour',
  'Sunset cruise'
);

insert into public.tours (
  title,
  summary,
  duration_label,
  price_label,
  image_url,
  link_label,
  sort_order
)
select *
from (
  values
    (
      'Doi Suthep temple & city views',
      'Climb the naga staircase to Wat Phra That Doi Suthep, Chiang Mai’s landmark mountain temple, then take in the city from the viewpoint. A calm half-day that fits easily around check-in.',
      'Half day',
      'From THB 800',
      '/tours/doi-suthep.jpg',
      'Arrange at the front desk',
      0
    ),
    (
      'Old City temples walk',
      'A guided walk through the moated Old City — Wat Chedi Luang, Wat Phra Singh, and quiet lanes — with time for coffee and local stories near Tha Phae Gate.',
      '3 hours',
      'From THB 650',
      '/tours/old-city.jpg',
      'Arrange at the front desk',
      1
    ),
    (
      'Thai cooking class',
      'Market stop for herbs and spices, then cook classic northern and central dishes at a local kitchen. Vegetarian options are easy to arrange — tell us when you book.',
      'Half day',
      'From THB 1,200',
      '/tours/cooking.jpg',
      'Arrange at the front desk',
      2
    ),
    (
      'Ethical elephant sanctuary',
      'A no-riding visit focused on observation and care: prepare food, learn from mahouts, and spend time with the herd in a forest setting outside the city.',
      'Full day',
      'From THB 1,800',
      '/tours/elephant.jpg',
      'Arrange at the front desk',
      3
    ),
    (
      'Doi Inthanon national park',
      'Thailand’s highest peak, twin royal pagodas, a short forest trail, and cooler mountain air. Lunch and park entry are usually included on group tours.',
      'Full day',
      'From THB 1,800',
      '/tours/doi-inthanon.jpg',
      'Arrange at the front desk',
      4
    ),
    (
      'Sticky Waterfalls day trip',
      'Climb the limestone cascades at Bua Thong (Sticky Waterfalls), swim in clear pools, and stop at nearby hot springs on the way back to Chiang Mai.',
      'Full day',
      'From THB 1,500',
      '/tours/sticky-waterfalls.jpg',
      'Arrange at the front desk',
      5
    ),
    (
      'Night market food walk',
      'Taste northern Thai street food around the Night Bazaar or Sunday Walking Street — khao soi, sai ua, and sweets — with a local host who knows what to order.',
      '2–3 hours',
      'From THB 900',
      '/tours/night-market.jpg',
      'Arrange at the front desk',
      6
    ),
    (
      'Chiang Rai temples day trip',
      'White Temple (Wat Rong Khun), Blue Temple, and a stop at the Black House museum — a full day north of Chiang Mai with hotel pickup common on group tours.',
      'Full day',
      'From THB 1,600',
      '/tours/chiang-rai.jpg',
      'Arrange at the front desk',
      7
    )
) as seed(title, summary, duration_label, price_label, image_url, link_label, sort_order)
where not exists (
  select 1 from public.tours existing where existing.title = seed.title
);

-- Attach bundled cover photos to existing Chiang Mai seed rows (safe to re-run).
update public.tours set image_url = '/tours/doi-suthep.jpg'
where title = 'Doi Suthep temple & city views'
  and (image_url is null or image_url = '');
update public.tours set image_url = '/tours/old-city.jpg'
where title = 'Old City temples walk'
  and (image_url is null or image_url = '');
update public.tours set image_url = '/tours/cooking.jpg'
where title = 'Thai cooking class'
  and (image_url is null or image_url = '');
update public.tours set image_url = '/tours/elephant.jpg'
where title = 'Ethical elephant sanctuary'
  and (image_url is null or image_url = '');
update public.tours set image_url = '/tours/doi-inthanon.jpg'
where title = 'Doi Inthanon national park'
  and (image_url is null or image_url = '');
update public.tours set image_url = '/tours/sticky-waterfalls.jpg'
where title = 'Sticky Waterfalls day trip'
  and (image_url is null or image_url = '');
update public.tours set image_url = '/tours/night-market.jpg'
where title = 'Night market food walk'
  and (image_url is null or image_url = '');
update public.tours set image_url = '/tours/chiang-rai.jpg'
where title = 'Chiang Rai temples day trip'
  and (image_url is null or image_url = '');
