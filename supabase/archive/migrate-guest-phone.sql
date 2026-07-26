-- Add required guest phone number for booking requests.

alter table public.booking_requests add column if not exists guest_phone text;

update public.booking_requests
set guest_phone = 'Not provided'
where guest_phone is null or trim(guest_phone) = '';

alter table public.booking_requests alter column guest_phone set default '';
alter table public.booking_requests alter column guest_phone set not null;

drop policy if exists "Guests can create booking requests" on public.booking_requests;
create policy "Guests can create booking requests"
on public.booking_requests
for insert
to anon, authenticated
with check (
  status = 'new'
  and length(trim(guest_name)) between 2 and 120
  and guest_email ~* '^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$'
  and length(trim(guest_phone)) between 7 and 30
);
