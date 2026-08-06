-- Raise maximum stay length to 60 nights (aligns with staff channel edits).
-- Run in Supabase SQL editor if long bookings fail with booking_requests_nights_check.

alter table public.booking_requests
  drop constraint if exists booking_requests_nights_check;

alter table public.booking_requests
  add constraint booking_requests_nights_check
  check (nights between 1 and 60);
