-- Homepage hero background photo (staff upload, public display).

alter table public.property_settings
  add column if not exists hero_image_url text,
  add column if not exists hero_image_storage_path text;
