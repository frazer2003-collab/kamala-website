-- Calendar access for staff notification emails (read vs read & write).
-- Staff can sign in with their email + the shared staff password; access is enforced on calendar writes.

alter table public.staff_notification_emails
  add column if not exists calendar_access text;

update public.staff_notification_emails
set calendar_access = 'read_write'
where calendar_access is null;

alter table public.staff_notification_emails
  alter column calendar_access set default 'read_write';

alter table public.staff_notification_emails
  alter column calendar_access set not null;

alter table public.staff_notification_emails
  drop constraint if exists staff_notification_emails_calendar_access_check;

alter table public.staff_notification_emails
  add constraint staff_notification_emails_calendar_access_check
  check (calendar_access in ('read', 'read_write'));
