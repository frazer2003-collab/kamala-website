-- Record why a confirmed stay was removed (cancellation vs no-show).
alter table public.booking_requests
  add column if not exists stay_end_reason text check (
    stay_end_reason is null
    or stay_end_reason in ('cancellation', 'no-show')
  );
