-- How staff collected payment when they mark a stay Paid (not Stripe).
alter table public.booking_requests
  add column if not exists payment_collected_via text;

alter table public.booking_requests
  drop constraint if exists booking_requests_payment_collected_via_check;

alter table public.booking_requests
  add constraint booking_requests_payment_collected_via_check
  check (
    payment_collected_via is null
    or payment_collected_via in ('cash', 'thai_bank')
  );

comment on column public.booking_requests.payment_collected_via is
  'Staff-marked collection rail when Paid is ticked: cash or thai_bank. Stripe card stays leave this null.';
