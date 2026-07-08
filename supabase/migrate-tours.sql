-- Guest-facing tour cards editable from Staff → Settings → Tours.
create table if not exists public.tours (
  id uuid primary key default gen_random_uuid(),
  title text not null check (length(trim(title)) > 0),
  summary text not null check (length(trim(summary)) > 0),
  duration_label text,
  price_label text,
  image_url text,
  image_storage_path text,
  link_url text,
  link_label text not null default 'Enquire',
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists tours_sort_order_idx
  on public.tours (sort_order, created_at);

alter table public.tours enable row level security;

drop policy if exists "Anyone can view tours" on public.tours;
create policy "Anyone can view tours"
on public.tours
for select
to anon, authenticated
using (true);

drop policy if exists "Service role can manage tours" on public.tours;
create policy "Service role can manage tours"
on public.tours
for all
to service_role
using (true)
with check (true);

drop trigger if exists tours_set_updated_at on public.tours;
create trigger tours_set_updated_at
before update on public.tours
for each row
execute function public.set_updated_at();
