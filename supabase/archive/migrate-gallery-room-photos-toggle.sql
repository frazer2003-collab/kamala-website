-- Toggle whether room photos appear on the public gallery page.
-- Run in Supabase SQL editor, then optionally: NOTIFY pgrst, 'reload schema';

alter table public.property_settings
  add column if not exists show_room_photos_on_gallery boolean;

update public.property_settings
set show_room_photos_on_gallery = true
where show_room_photos_on_gallery is null;

alter table public.property_settings
  alter column show_room_photos_on_gallery set default true;

alter table public.property_settings
  alter column show_room_photos_on_gallery set not null;
