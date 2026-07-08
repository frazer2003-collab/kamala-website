-- Guesthouse photo gallery (public homepage + staff uploads).

create table if not exists public.property_gallery_photos (
  id uuid primary key default gen_random_uuid(),
  storage_path text not null unique,
  url text not null,
  caption text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists property_gallery_photos_sort_order_idx
  on public.property_gallery_photos (sort_order, created_at);

alter table public.property_gallery_photos enable row level security;

grant select on public.property_gallery_photos to anon, authenticated;
grant all on public.property_gallery_photos to service_role;

drop policy if exists "Anyone can view property gallery photos" on public.property_gallery_photos;
create policy "Anyone can view property gallery photos"
on public.property_gallery_photos
for select
to anon, authenticated
using (true);

drop policy if exists "Service role can manage property gallery photos" on public.property_gallery_photos;
create policy "Service role can manage property gallery photos"
on public.property_gallery_photos
for all
to service_role
using (true)
with check (true);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'property-gallery',
  'property-gallery',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Public read property gallery photos" on storage.objects;
create policy "Public read property gallery photos"
on storage.objects
for select
to public
using (bucket_id = 'property-gallery');

drop policy if exists "Service role manages property gallery photos" on storage.objects;
create policy "Service role manages property gallery photos"
on storage.objects
for all
to service_role
using (bucket_id = 'property-gallery')
with check (bucket_id = 'property-gallery');
