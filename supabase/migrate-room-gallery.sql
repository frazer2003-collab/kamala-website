-- Additional room photos for the guest detail popup.
alter table public.rooms
  add column if not exists gallery_urls text[] not null default '{}';
