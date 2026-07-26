alter table public.tours
  add column if not exists gallery_urls text[] not null default '{}';
