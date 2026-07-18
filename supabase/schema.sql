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
    700,
    'Sleeps 2',
    '33 m² · king or twin · city view · non-smoking',
    5,
    'A comfortable room a minute from Tha Phae Gate, with blackout curtains, work desk, safe, and a private bathroom with shower and bidet. Flexible king or twin setup for couples or friends.',
    array['Air conditioning', 'Free Wi-Fi', 'Private bathroom', 'King or twin beds', 'Cable TV', 'Safe', 'Desk', 'Breakfast included'],
    'courtyard'
  ),
  (
    'garden',
    'Deluxe Double Room with Balcony',
    'Deluxe',
    950,
    'Sleeps 2',
    '45 m² · king bed · balcony · garden view',
    4,
    'More space for longer stays — 45 m² with a private balcony over the guesthouse garden, seating for two, refrigerator, and en-suite bathroom. Quiet room facing greenery above the old city.',
    array['Air conditioning', 'Free Wi-Fi', 'Private bathroom', 'King bed', 'Private balcony', 'Refrigerator', 'Cable TV', 'Safe', 'Breakfast included'],
    'garden'
  ),
  (
    'veranda',
    'Triple Room with Balcony',
    'Triple',
    900,
    'Sleeps 3',
    '45 m² · queen + single · balcony · garden view',
    4,
    'Ideal for three guests travelling together — queen and single bed configuration, private balcony with seating, and room to spread out after a day around Chiang Mai''s old city.',
    array['Air conditioning', 'Free Wi-Fi', 'Private bathroom', 'Queen and single beds', 'Private balcony', 'Refrigerator', 'Cable TV', 'Safe', 'Breakfast included'],
    'veranda'
  ),
  (
    'loft',
    'Family Room with Balcony',
    'Family',
    1100,
    'Sleeps 4',
    '70 m² · four single beds · balcony · fits families',
    1,
    'The largest room in the house — 70 m² with four single beds, private balcony, and space for a family stay steps from Tha Phae Gate and the Sunday walking street.',
    array['Air conditioning', 'Free Wi-Fi', 'Private bathroom', 'Four single beds', 'Private balcony', 'Refrigerator', 'Cable TV', 'Safe', 'Breakfast included'],
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
  room_unit_id uuid,
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
  calendar_access text not null default 'read_write'
    check (calendar_access in ('read', 'read_write')),
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
  calendar_color_sold_out text not null default '#fdba74',
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
-- Run once for physical room numbers + assignment:
-- See supabase/migrate-room-units.sql
-- See supabase/migrate-room-block-units.sql (OTA / channel stays)

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
