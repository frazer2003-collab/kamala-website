-- Desk Trips & Tours sold (counter sales, not website tour catalog).

create table if not exists public.desk_tour_sales (
  id uuid primary key default gen_random_uuid(),
  property_id text not null default 'kamala' check (length(trim(property_id)) > 0),
  name text not null check (length(trim(name)) > 0),
  amount_satang bigint not null check (amount_satang >= 0),
  guests integer not null default 1 check (guests > 0),
  staff_note text,
  sale_date date not null default ((now() at time zone 'Asia/Bangkok')::date),
  acted_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (property_id, id),
  check (staff_note is null or length(trim(staff_note)) > 0)
);

create index if not exists desk_tour_sales_property_date_idx
  on public.desk_tour_sales (property_id, sale_date desc, created_at desc);

alter table public.desk_tour_sales enable row level security;

revoke all on table public.desk_tour_sales from anon, authenticated;
grant all on table public.desk_tour_sales to service_role;

comment on table public.desk_tour_sales is
  'Front-desk record of trips and tours sold (cash/counter), for Other income.';
