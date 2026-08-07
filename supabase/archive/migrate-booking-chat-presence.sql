-- Obsolete: chat presence email-skip was replaced by notify-once-until-reply
-- (see lib/chat-notify.ts). Safe to leave these columns if already applied;
-- new installs omit them from schema.sql.
--
-- Optional cleanup on an existing project:
--   alter table public.booking_requests drop column if exists guest_chat_present_at;
--   alter table public.booking_requests drop column if exists staff_chat_present_at;

alter table public.booking_requests
  add column if not exists guest_chat_present_at timestamptz;

alter table public.booking_requests
  add column if not exists staff_chat_present_at timestamptz;
