-- Tour pickup clock time (Bangkok local HH:MM) for Home board windowing.
alter table public.desk_tour_sales
  add column if not exists pickup_time text;

comment on column public.desk_tour_sales.pickup_time is
  'Local Bangkok pickup clock time HH:MM on trip_date; used by staff Home tour window.';

-- Deep-clean marker for in-house stays on Home.
alter table public.booking_requests
  add column if not exists housekeeping_cleaned_on date;

comment on column public.booking_requests.housekeeping_cleaned_on is
  'Last day staff marked the room cleaned for this stay; Home shows again after 3 more nights.';
