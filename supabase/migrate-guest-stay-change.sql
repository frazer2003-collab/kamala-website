-- Guest stay changes from the confirmation email.
-- pending_* holds a move that waits on a Thai bank top-up staff must confirm.
-- refund_due is money staff still owe after a cheaper change paid by bank transfer.
-- Run once in Supabase SQL editor before guests can change their stay.

alter table public.booking_requests
  add column if not exists pending_room_id text references public.rooms(id) on delete set null,
  add column if not exists pending_arrival_date date,
  add column if not exists pending_departure_date date,
  add column if not exists pending_balance integer,
  add column if not exists refund_due integer not null default 0;

alter table public.booking_requests
  drop constraint if exists booking_requests_refund_due_check;

alter table public.booking_requests
  add constraint booking_requests_refund_due_check check (refund_due >= 0);
