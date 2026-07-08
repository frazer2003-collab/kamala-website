-- Optional guest details staff can attach to OTA/channel reservations.
-- These are never overwritten by iCal sync, so manually entered guest
-- information is preserved across future calendar refreshes.

alter table public.room_blocks
  add column if not exists guest_name text,
  add column if not exists guest_email text,
  add column if not exists guest_phone text;
