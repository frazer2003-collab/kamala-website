-- Allow staff to mark Paid as Stripe (alongside cash / thai_bank).
alter table public.booking_requests
  drop constraint if exists booking_requests_payment_collected_via_check;

alter table public.booking_requests
  add constraint booking_requests_payment_collected_via_check
  check (
    payment_collected_via is null
    or payment_collected_via in ('cash', 'thai_bank', 'stripe')
  );

comment on column public.booking_requests.payment_collected_via is
  'Staff-marked collection rail when Paid is ticked: cash, thai_bank, or stripe. Guest Stripe Checkout stays may still leave this null and use stripe_payment_intent_id.';
