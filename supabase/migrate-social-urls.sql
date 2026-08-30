-- Add optional Facebook and TikTok profile URLs for the guest footer.
alter table public.property_settings
  add column if not exists facebook_url text,
  add column if not exists tiktok_url text;
