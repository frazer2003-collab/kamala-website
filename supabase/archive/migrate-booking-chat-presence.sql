-- Presence timestamps for booking chat (skip email when the other party is live).
alter table public.booking_requests
  add column if not exists guest_chat_present_at timestamptz;

alter table public.booking_requests
  add column if not exists staff_chat_present_at timestamptz;
