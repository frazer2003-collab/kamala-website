-- Hide rooms.ical_export_token from anon/authenticated REST clients.
-- Public room listings must not expose calendar export secrets.
-- Service role (staff + /api/ical/[token]) keeps full access.

alter table public.rooms
  add column if not exists ical_export_token uuid;

revoke select on public.rooms from anon, authenticated;

grant select (
  id,
  name,
  short_name,
  rate,
  sleeps,
  outlook,
  available_count,
  summary,
  amenities,
  tone,
  image_url,
  gallery_urls,
  sort_order,
  updated_at
) on public.rooms to anon, authenticated;

grant all on public.rooms to service_role;
