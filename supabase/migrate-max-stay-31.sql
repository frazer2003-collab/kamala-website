-- Raise maximum stay length from 21 to 31 nights.
-- Run in Supabase SQL editor after deploy.

alter table public.booking_requests
  drop constraint if exists booking_requests_nights_check;

alter table public.booking_requests
  add constraint booking_requests_nights_check
  check (nights between 1 and 31);
