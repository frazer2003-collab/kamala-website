-- Live booking chat: secure guest link + email reply import.
alter table public.booking_requests
  add column if not exists conversation_token text;

update public.booking_requests
set conversation_token = gen_random_uuid()::text
where conversation_token is null;

create unique index if not exists booking_requests_conversation_token_idx
  on public.booking_requests (conversation_token);

alter table public.booking_messages
  add column if not exists source_email_id text;

create unique index if not exists booking_messages_source_email_id_idx
  on public.booking_messages (source_email_id)
  where source_email_id is not null;

create index if not exists booking_messages_booking_created_idx
  on public.booking_messages (booking_request_id, created_at);
