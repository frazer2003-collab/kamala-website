-- Trips & Tours: payment status, trip date, guest fields for confirmation slips.

alter table public.desk_tour_sales
  add column if not exists payment_status text not null default 'unpaid';

alter table public.desk_tour_sales
  drop constraint if exists desk_tour_sales_payment_status_check;

alter table public.desk_tour_sales
  add constraint desk_tour_sales_payment_status_check
  check (payment_status in ('unpaid', 'stripe', 'qr', 'cash'));

alter table public.desk_tour_sales
  add column if not exists trip_date date;

alter table public.desk_tour_sales
  add column if not exists guest_name text;

alter table public.desk_tour_sales
  add column if not exists guest_phone text;

alter table public.desk_tour_sales
  add column if not exists guest_email text;

update public.desk_tour_sales
set trip_date = sale_date
where trip_date is null;

comment on column public.desk_tour_sales.payment_status is
  'How the trip was paid: unpaid | stripe | qr | cash.';
comment on column public.desk_tour_sales.trip_date is
  'Day the trip or tour runs (may differ from sale_date).';
