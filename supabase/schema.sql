create extension if not exists pgcrypto;

create table if not exists public.rooms (
  id text primary key,
  name text not null,
  short_name text not null,
  rate integer not null check (rate >= 0),
  sleeps text not null,
  outlook text not null,
  available_count integer not null default 1 check (available_count >= 0),
  summary text not null,
  amenities text[] not null default '{}',
  tone text not null check (tone in ('courtyard', 'garden', 'veranda', 'attic')),
  image_url text,
  gallery_urls text[] not null default '{}',
  sort_order integer not null default 0,
  updated_at timestamptz not null default now()
);

insert into public.rooms (
  id,
  name,
  short_name,
  rate,
  sleeps,
  outlook,
  available_count,
  summary,
  amenities,
  tone
)
values
  (
    'courtyard',
    'Superior Double or Twin Room',
    'Superior',
    142,
    'Sleeps 2',
    'Comfortable room with double or twin bed configuration',
    2,
    'A calm room for short stays, with flexible bedding, morning light, and a quiet position in the guesthouse.',
    array['Double or twin beds', 'Private bath', 'Breakfast included'],
    'courtyard'
  ),
  (
    'garden',
    'Deluxe Double Room with Balcony',
    'Deluxe',
    168,
    'Sleeps 2',
    'Deluxe double room opening onto a private balcony',
    1,
    'A little more room for longer visits, with balcony seating and a bright outlook over the guesthouse grounds.',
    array['Double bed', 'Private balcony', 'Private bath', 'Breakfast included'],
    'garden'
  ),
  (
    'veranda',
    'Triple Room with Balcony',
    'Triple',
    136,
    'Sleeps 3',
    'Triple room with balcony seating for small groups',
    2,
    'A practical room for friends or family, with space for three guests and a balcony for evening air.',
    array['Three beds', 'Private balcony', 'Private bath', 'Breakfast included'],
    'veranda'
  ),
  (
    'loft',
    'Family Room with Balcony',
    'Family',
    210,
    'Sleeps 4',
    'Spacious family room with balcony and separated sleeping areas',
    0,
    'A spacious room for a family stay, with balcony access and enough space for parents and children.',
    array['Family bedding', 'Private balcony', 'Bath + shower', 'Breakfast included'],
    'attic'
  )
on conflict (id) do update
set
  name = excluded.name,
  short_name = excluded.short_name,
  rate = excluded.rate,
  sleeps = excluded.sleeps,
  outlook = excluded.outlook,
  summary = excluded.summary,
  amenities = excluded.amenities,
  tone = excluded.tone,
  available_count = excluded.available_count;

create table if not exists public.booking_requests (
  id uuid primary key default gen_random_uuid(),
  guest_name text not null,
  guest_email text not null,
  guest_phone text not null,
  room_id text not null,
  room_name text not null,
  arrival_date date not null,
  departure_date date not null,
  nights integer not null check (nights between 1 and 21),
  estimated_total integer not null check (estimated_total >= 0),
  note text,
  staff_note text,
  stay_status text not null default 'expected' check (
    stay_status in ('expected', 'checked-in', 'checked-out')
  ),
  status text not null default 'new' check (
    status in ('new', 'pending_payment', 'awaiting', 'confirmed', 'needs-reply', 'declined')
  ),
  deposit_amount integer check (deposit_amount is null or deposit_amount >= 0),
  deposit_paid_at timestamptz,
  stripe_checkout_session_id text,
  stripe_payment_intent_id text,
  conversation_token text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.booking_messages (
  id uuid primary key default gen_random_uuid(),
  booking_request_id uuid not null references public.booking_requests(id) on delete cascade,
  sender text not null check (sender in ('staff', 'guest')),
  sender_email text,
  body text not null check (length(trim(body)) > 0),
  source_email_id text,
  created_at timestamptz not null default now()
);

create unique index if not exists booking_messages_source_email_id_idx
  on public.booking_messages (source_email_id)
  where source_email_id is not null;

create index if not exists booking_messages_booking_created_idx
  on public.booking_messages (booking_request_id, created_at);
  id uuid primary key default gen_random_uuid(),
  room_id text not null references public.rooms(id) on delete cascade,
  start_date date not null,
  end_date date not null check (end_date > start_date),
  reason text,
  staff_note text,
  created_at timestamptz not null default now()
);

grant select on public.rooms to anon, authenticated;
grant all on public.rooms to service_role;
grant insert on public.booking_requests to anon, authenticated;
grant all on public.booking_requests to service_role;
grant all on public.booking_messages to service_role;
grant all on public.room_blocks to service_role;

alter table public.rooms enable row level security;
alter table public.booking_requests enable row level security;
alter table public.booking_messages enable row level security;
alter table public.room_blocks enable row level security;

drop policy if exists "Anyone can view room availability" on public.rooms;
create policy "Anyone can view room availability"
on public.rooms
for select
to anon, authenticated
using (true);

drop policy if exists "Service role can manage rooms" on public.rooms;
create policy "Service role can manage rooms"
on public.rooms
for all
to service_role
using (true)
with check (true);

drop policy if exists "Guests can create booking requests" on public.booking_requests;
create policy "Guests can create booking requests"
on public.booking_requests
for insert
to anon, authenticated
with check (
  status in ('new', 'pending_payment')
  and length(trim(guest_name)) between 2 and 120
  and guest_email ~* '^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$'
  and length(trim(guest_phone)) between 7 and 30
);

drop policy if exists "Service role can manage booking requests" on public.booking_requests;
create policy "Service role can manage booking requests"
on public.booking_requests
for all
to service_role
using (true)
with check (true);

drop policy if exists "Service role can manage booking messages" on public.booking_messages;
create policy "Service role can manage booking messages"
on public.booking_messages
for all
to service_role
using (true)
with check (true);

drop policy if exists "Service role can manage room blocks" on public.room_blocks;
create policy "Service role can manage room blocks"
on public.room_blocks
for all
to service_role
using (true)
with check (true);

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

create table if not exists public.room_promotions (
  id uuid primary key default gen_random_uuid(),
  room_id text not null references public.rooms(id) on delete cascade,
  start_date date not null,
  end_date date not null,
  percent_off integer not null check (percent_off between 1 and 90),
  label text,
  created_at timestamptz not null default now(),
  constraint room_promotions_date_range check (end_date >= start_date)
);

create index if not exists room_promotions_room_dates_idx
  on public.room_promotions (room_id, start_date, end_date);

alter table public.room_promotions enable row level security;

drop policy if exists "Service role can manage room promotions" on public.room_promotions;
create policy "Service role can manage room promotions"
on public.room_promotions
for all
to service_role
using (true)
with check (true);

create table if not exists public.property_settings (
  id text primary key default 'default',
  property_name text not null default 'Kamala Guesthouse',
  property_tagline text not null default 'Guesthouse',
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

create table if not exists public.tours (
  id uuid primary key default gen_random_uuid(),
  title text not null check (length(trim(title)) > 0),
  summary text not null check (length(trim(summary)) > 0),
  duration_label text,
  price_label text,
  image_url text,
  image_storage_path text,
  gallery_urls text[] not null default '{}',
  link_url text,
  link_label text not null default 'Enquire',
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists tours_sort_order_idx
  on public.tours (sort_order, created_at);

alter table public.tours enable row level security;

drop policy if exists "Anyone can view tours" on public.tours;
create policy "Anyone can view tours"
on public.tours
for select
to anon, authenticated
using (true);

drop policy if exists "Service role can manage tours" on public.tours;
create policy "Service role can manage tours"
on public.tours
for all
to service_role
using (true)
with check (true);

grant select on public.tours to anon, authenticated;
grant all on public.tours to service_role;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists booking_requests_set_updated_at on public.booking_requests;
create trigger booking_requests_set_updated_at
before update on public.booking_requests
for each row
execute function public.set_updated_at();

-- Run once if upgrading from the old status-based rooms table:
-- See supabase/migrate-room-count.sql
-- Run once to add calendar management fields:
-- See supabase/migrate-stay-status.sql

drop trigger if exists rooms_set_updated_at on public.rooms;
create trigger rooms_set_updated_at
before update on public.rooms
for each row
execute function public.set_updated_at();

drop trigger if exists tours_set_updated_at on public.tours;
create trigger tours_set_updated_at
before update on public.tours
for each row
execute function public.set_updated_at();
