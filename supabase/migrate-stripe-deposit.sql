-- Stripe 50% deposit fields and pending-payment status.

alter table public.booking_requests add column if not exists deposit_amount integer;
alter table public.booking_requests add column if not exists deposit_paid_at timestamptz;
alter table public.booking_requests add column if not exists stripe_checkout_session_id text;
alter table public.booking_requests add column if not exists stripe_payment_intent_id text;

alter table public.booking_requests drop constraint if exists booking_requests_status_check;
alter table public.booking_requests add constraint booking_requests_status_check check (
  status in ('new', 'pending_payment', 'awaiting', 'confirmed', 'needs-reply', 'declined')
);

drop policy if exists "Guests can create booking requests" on public.booking_requests;
create policy "Guests can create booking requests"
on public.booking_requests
for insert
to anon, authenticated
with check (
  status in ('new', 'pending_payment')
  and length(trim(guest_name)) between 2 and 120
  and guest_email ~* '^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$'
  and length(trim(guest_phone)) between 7 and 30
);
