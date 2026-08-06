-- Record why a confirmed stay was removed (cancellation vs no-show).
-- Run once in Supabase SQL editor if Cancel stay fails or stay_end_reason is missing.

alter table public.booking_requests
  add column if not exists stay_end_reason text;

alter table public.booking_requests
  drop constraint if exists booking_requests_stay_end_reason_check;

alter table public.booking_requests
  add constraint booking_requests_stay_end_reason_check check (
    stay_end_reason is null
    or stay_end_reason in ('cancellation', 'no-show')
  );
