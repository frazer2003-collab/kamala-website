-- Add optional Facebook and TikTok profile URLs for the guest footer,
-- then backfill example contact/social links on the default property row.
alter table public.property_settings
  add column if not exists facebook_url text,
  add column if not exists tiktok_url text;

update public.property_settings
set
  contact_email = coalesce(nullif(trim(contact_email), ''), 'bookings@kamalaguesthouse.com'),
  contact_phone = coalesce(nullif(trim(contact_phone), ''), '+66986494996'),
  line_url = coalesce(nullif(trim(line_url), ''), 'https://line.me/R/ti/p/@kamalaguesthouse'),
  whatsapp_url = coalesce(nullif(trim(whatsapp_url), ''), 'https://wa.me/66986494996'),
  facebook_url = coalesce(nullif(trim(facebook_url), ''), 'https://www.facebook.com/kamalaguesthouse'),
  tiktok_url = coalesce(nullif(trim(tiktok_url), ''), 'https://www.tiktok.com/@kamalaguesthouse'),
  updated_at = now()
where id = 'default';
