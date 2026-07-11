-- Property-wide settings (single row) and room photos.
alter table public.rooms
  add column if not exists image_url text;

create table if not exists public.property_settings (
  id text primary key default 'default',
  property_name text not null default 'Kamala''s Boutique Guesthouse',
  property_tagline text not null default 'Boutique Guesthouse',
  contact_email text,
  contact_phone text,
  address_line text,
  check_in_from text not null default '3:00 pm',
  check_in_until text not null default '8:00 pm',
  quiet_hours text not null default '10:00 pm',
  currency text not null default 'thb' check (currency in ('thb', 'usd')),
  allow_pay_on_arrival boolean not null default false,
  house_rules text[] not null default array[
    'Check-in is from 3 pm to 8 pm. Later arrivals are arranged by reply.',
    'Breakfast is included for every confirmed booking request.',
    'Quiet hours begin at 10 pm so early guests and families can rest.'
  ],
  cancellation_policy text not null default 'Cancel at least 7 days before arrival for a full deposit refund. Later cancellations are reviewed case by case.',
  privacy_policy text not null default 'We use your contact details only to manage your booking and stay. We do not sell guest data.',
  terms_summary text not null default 'A 50% deposit reserves your room. The remaining balance is due before check-in unless staff confirm another arrangement.',
  line_url text,
  whatsapp_url text,
  calendar_color_available text not null default '#bbf7d0',
  calendar_color_closed text not null default '#fecaca',
  calendar_color_booking text not null default '#fef08a',
  updated_at timestamptz not null default now()
);

insert into public.property_settings (id)
values ('default')
on conflict (id) do nothing;

alter table public.property_settings enable row level security;

drop policy if exists "Service role can manage property settings" on public.property_settings;
create policy "Service role can manage property settings"
on public.property_settings
for all
to service_role
using (true)
with check (true);
