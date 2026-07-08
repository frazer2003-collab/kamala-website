-- Add calendar management fields to existing booking_requests tables.

alter table public.booking_requests add column if not exists staff_note text;
alter table public.booking_requests add column if not exists stay_status text;

update public.booking_requests
set stay_status = 'expected'
where stay_status is null;

alter table public.booking_requests alter column stay_status set default 'expected';
alter table public.booking_requests alter column stay_status set not null;
alter table public.booking_requests drop constraint if exists booking_requests_stay_status_check;
alter table public.booking_requests add constraint booking_requests_stay_status_check check (
  stay_status in ('expected', 'checked-in', 'checked-out')
);
