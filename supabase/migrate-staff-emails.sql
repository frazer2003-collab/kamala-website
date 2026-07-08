-- Staff notification recipients (managed from /staff/settings).
create table if not exists public.staff_notification_emails (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  label text,
  created_at timestamptz not null default now(),
  constraint staff_notification_emails_email_format
    check (email ~* '^[^@]+@[^@]+\.[^@]+$')
);

alter table public.staff_notification_emails enable row level security;

drop policy if exists "Service role can manage staff notification emails" on public.staff_notification_emails;
create policy "Service role can manage staff notification emails"
on public.staff_notification_emails
for all
to service_role
using (true)
with check (true);
