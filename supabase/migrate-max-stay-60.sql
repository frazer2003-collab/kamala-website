-- Raise maximum stay length to 60 nights (aligns with app MAX_STAY_NIGHTS).
-- Run once in the Supabase SQL editor if bookings fail with:
--   booking_requests_nights_check

alter table public.booking_requests
  drop constraint if exists booking_requests_nights_check;

alter table public.booking_requests
  add constraint booking_requests_nights_check
  check (nights between 1 and 60);
