-- Public bucket for guesthouse room photos (uploaded by staff via server).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'room-photos',
  'room-photos',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Public read room photos" on storage.objects;
create policy "Public read room photos"
on storage.objects
for select
to public
using (bucket_id = 'room-photos');

drop policy if exists "Service role manages room photos" on storage.objects;
create policy "Service role manages room photos"
on storage.objects
for all
to service_role
using (bucket_id = 'room-photos')
with check (bucket_id = 'room-photos');
