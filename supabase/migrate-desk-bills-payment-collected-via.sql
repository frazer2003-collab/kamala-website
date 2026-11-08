-- Payment rail on cleared desk bills (Cash / Thai bank / Stripe), mirrors stays.
-- App requires a rail on new clears; older cleared rows may stay null (untagged).
alter table public.desk_bills
  add column if not exists payment_collected_via text;

alter table public.desk_bills
  drop constraint if exists desk_bills_payment_collected_via_check;

alter table public.desk_bills
  add constraint desk_bills_payment_collected_via_check
  check (
    payment_collected_via is null
    or payment_collected_via in ('cash', 'thai_bank', 'stripe')
  );

comment on column public.desk_bills.payment_collected_via is
  'How the guest paid when the bill was cleared: cash, thai_bank, or stripe. Null only on older clears before this column existed.';
