-- Align property identity with Kamala's Boutique Guesthouse in Chiang Mai.
update public.property_settings
set
  property_name = 'Kamala''s Boutique Guesthouse',
  property_tagline = 'Chiang Mai Old City',
  updated_at = now()
where id = 'default';
