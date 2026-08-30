-- Per-staff sign-in passwords (run in Supabase SQL editor).
alter table public.staff_notification_emails
  add column if not exists password_hash text;

comment on column public.staff_notification_emails.password_hash is
  'scrypt hash for staff sign-in; null means legacy shared STAFF_ADMIN_PASSWORD until set in Settings.';
