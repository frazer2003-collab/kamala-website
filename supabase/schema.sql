-- Kamala greenfield schema (complete current product).
-- Fresh install: run this file once in the Supabase SQL editor.
-- Historical one-off upgrades live in supabase/archive/.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Rooms
-- ---------------------------------------------------------------------------

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
  ical_export_token uuid not null default gen_random_uuid(),
  updated_at timestamptz not null default now()
);

create index if not exists rooms_sort_order_idx
  on public.rooms (sort_order, id);

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
  tone,
  sort_order
)
values
  (
    'courtyard',
    'Superior Double or Twin Room',
    'Superior',
    700,
    'Sleeps 2',
    '33 m² · king or twin · city view · non-smoking',
    4,
    'A comfortable room a minute from Tha Phae Gate, with blackout curtains, work desk, safe, and a private bathroom with shower and bidet. Flexible king or twin setup for couples or friends.',
    array['Air conditioning', 'Free Wi-Fi', 'Private bathroom', 'King or twin beds', 'Cable TV', 'Safe', 'Desk', 'Breakfast included'],
    'courtyard',
    10
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
    'garden',
    20
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
    'attic',
    30
  ),
  (
    'ground',
    'Family Room Ground Floor',
    'Family GF',
    1100,
    'Sleeps 4',
    'Ground floor · family room · private bathroom',
    1,
    'A ground-floor family room with space for four guests, private bathroom, and easy access without stairs — practical for families with young children or guests who prefer not to climb.',
    array['Air conditioning', 'Free Wi-Fi', 'Private bathroom', 'Family bedding', 'Cable TV', 'Safe', 'Breakfast included'],
    'attic',
    40
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
  available_count = excluded.available_count,
  sort_order = excluded.sort_order;

-- ---------------------------------------------------------------------------
-- Door numbers (physical units)
-- ---------------------------------------------------------------------------

create table if not exists public.room_units (
  id uuid primary key default gen_random_uuid(),
  number text not null unique,
  sort_order integer not null default 0,
  ical_export_token uuid not null default gen_random_uuid(),
  created_at timestamptz not null default now()
);

create unique index if not exists room_units_ical_export_token_idx
  on public.room_units (ical_export_token)
  where ical_export_token is not null;

create table if not exists public.room_unit_types (
  room_unit_id uuid not null references public.room_units(id) on delete cascade,
  room_id text not null references public.rooms(id) on delete cascade,
  primary key (room_unit_id, room_id)
);

create index if not exists room_unit_types_room_id_idx
  on public.room_unit_types (room_id);

insert into public.room_units (number, sort_order)
values
  ('116', 10),
  ('113', 20),
  ('120', 30),
  ('115', 40),
  ('118', 50),
  ('112', 60),
  ('117', 70),
  ('119', 80),
  ('114', 90)
on conflict (number) do update
set sort_order = excluded.sort_order;

-- Superior
insert into public.room_unit_types (room_unit_id, room_id)
select u.id, 'courtyard'
from public.room_units u
where u.number in ('113', '115', '118', '120')
on conflict do nothing;

-- Deluxe (door 114 is Family only — not shared with Deluxe)
insert into public.room_unit_types (room_unit_id, room_id)
select u.id, 'garden'
from public.room_units u
where u.number in ('112', '117', '119')
on conflict do nothing;

-- Family (Airbnb door 114)
insert into public.room_unit_types (room_unit_id, room_id)
select u.id, 'loft'
from public.room_units u
where u.number = '114'
on conflict do nothing;

-- Family Ground Floor (door 116)
insert into public.room_unit_types (room_unit_id, room_id)
select u.id, 'ground'
from public.room_units u
where u.number = '116'
on conflict do nothing;

-- ---------------------------------------------------------------------------
-- Bookings
-- ---------------------------------------------------------------------------

create table if not exists public.booking_requests (
  id uuid primary key default gen_random_uuid(),
  guest_name text not null,
  guest_email text not null,
  guest_phone text not null default '',
  room_id text not null,
  room_name text not null,
  arrival_date date not null,
  departure_date date not null,
  nights integer not null check (nights between 1 and 60),
  estimated_total integer not null check (estimated_total >= 0),
  note text,
  staff_note text,
  stay_status text not null default 'expected' check (
    stay_status in ('expected', 'checked-in', 'checked-out')
  ),
  status text not null default 'new' check (
    status in ('new', 'pending_payment', 'awaiting', 'confirmed', 'needs-reply', 'declined')
  ),
  stay_end_reason text check (
    stay_end_reason is null
    or stay_end_reason in ('cancellation', 'no-show')
  ),
  deposit_amount integer check (deposit_amount is null or deposit_amount >= 0),
  deposit_paid_at timestamptz,
  booking_source text check (
    booking_source is null
    or booking_source in ('walk-in', 'airbnb', 'expedia', 'booking')
  ),
  stripe_checkout_session_id text,
  stripe_payment_intent_id text,
  bank_transfer_claimed_at timestamptz,
  conversation_token text unique,
  room_unit_id uuid references public.room_units(id) on delete set null,
  bed_setup text check (bed_setup is null or bed_setup in ('double', 'twin')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists booking_requests_room_unit_id_idx
  on public.booking_requests (room_unit_id)
  where room_unit_id is not null;

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

-- ---------------------------------------------------------------------------
-- Calendar: iCal feeds, blocks, day inventory / rates
-- ---------------------------------------------------------------------------

create table if not exists public.room_ical_feeds (
  id uuid primary key default gen_random_uuid(),
  room_id text not null references public.rooms(id) on delete cascade,
  room_unit_id uuid references public.room_units(id) on delete cascade,
  label text not null check (length(trim(label)) > 0),
  import_url text not null check (length(trim(import_url)) > 0),
  last_synced_at timestamptz,
  last_sync_error text,
  created_at timestamptz not null default now()
);

create index if not exists room_ical_feeds_room_id_idx
  on public.room_ical_feeds (room_id);

create index if not exists room_ical_feeds_room_unit_id_idx
  on public.room_ical_feeds (room_unit_id)
  where room_unit_id is not null;

create table if not exists public.room_blocks (
  id uuid primary key default gen_random_uuid(),
  room_id text not null references public.rooms(id) on delete cascade,
  start_date date not null,
  end_date date not null check (end_date > start_date),
  reason text,
  staff_note text,
  guest_name text,
  guest_email text,
  guest_phone text,
  staff_booking_source text check (
    staff_booking_source is null
    or staff_booking_source in ('walk-in', 'airbnb', 'expedia', 'booking')
  ),
  ical_feed_id uuid references public.room_ical_feeds(id) on delete cascade,
  ical_uid text,
  room_unit_id uuid references public.room_units(id) on delete set null,
  created_at timestamptz not null default now()
);

create unique index if not exists room_blocks_ical_feed_uid_idx
  on public.room_blocks (ical_feed_id, ical_uid)
  where ical_feed_id is not null and ical_uid is not null;

create index if not exists room_blocks_room_unit_id_idx
  on public.room_blocks (room_unit_id)
  where room_unit_id is not null;

create table if not exists public.room_day_inventory (
  id uuid primary key default gen_random_uuid(),
  room_id text not null references public.rooms(id) on delete cascade,
  date date not null,
  rooms_to_sell smallint not null check (rooms_to_sell >= 0),
  created_at timestamptz not null default now(),
  unique (room_id, date)
);

create index if not exists room_day_inventory_room_date_idx
  on public.room_day_inventory (room_id, date);

create table if not exists public.room_day_rates (
  id uuid primary key default gen_random_uuid(),
  room_id text not null references public.rooms(id) on delete cascade,
  date date not null,
  nightly_rate integer not null check (nightly_rate >= 0),
  created_at timestamptz not null default now(),
  unique (room_id, date)
);

create index if not exists room_day_rates_room_date_idx
  on public.room_day_rates (room_id, date);

-- ---------------------------------------------------------------------------
-- Staff / property / promotions / gallery / tours
-- ---------------------------------------------------------------------------

create table if not exists public.staff_notification_emails (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  label text,
  calendar_access text not null default 'read_write'
    check (calendar_access in ('read', 'read_write')),
  password_hash text,
  created_at timestamptz not null default now(),
  constraint staff_notification_emails_email_format
    check (email ~* '^[^@]+@[^@]+\.[^@]+$')
);

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

create table if not exists public.discount_codes (
  id uuid primary key default gen_random_uuid(),
  code text not null check (length(trim(code)) between 3 and 32),
  percent_off integer not null check (percent_off between 1 and 90),
  room_id text references public.rooms(id) on delete cascade,
  valid_until date,
  max_uses integer check (max_uses is null or max_uses > 0),
  uses_count integer not null default 0 check (uses_count >= 0),
  label text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  constraint discount_codes_uses_within_max check (
    max_uses is null or uses_count <= max_uses
  )
);

create unique index if not exists discount_codes_code_lower_idx
  on public.discount_codes (lower(code));

create index if not exists discount_codes_active_idx
  on public.discount_codes (active, valid_until);

alter table public.booking_requests
  add column if not exists discount_code_id uuid references public.discount_codes(id) on delete set null,
  add column if not exists discount_code_text text;

create table if not exists public.property_settings (
  id text primary key default 'default',
  property_name text not null default 'Kamala''s Boutique Guesthouse',
  property_tagline text not null default 'Chiang Mai Old City',
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
  cancellation_policy text not null default 'Cancel more than 3 days before check-in for a full refund of your payment. Bank and card processing fees are deducted from the refunded amount. Within 3 days of check-in, the first night is non-refundable.',
  privacy_policy text not null default 'We use your contact details only to manage your booking and stay. We do not sell guest data.',
  terms_summary text not null default 'A 50% deposit reserves your room. The remaining balance is due before check-in unless staff confirm another arrangement.',
  line_url text,
  whatsapp_url text,
  promptpay_id text,
  bank_name text,
  account_name text,
  account_number text,
  calendar_color_available text not null default '#bbf7d0',
  calendar_color_closed text not null default '#fecaca',
  calendar_color_booking text not null default '#fef08a',
  calendar_color_sold_out text not null default '#fdba74',
  show_room_photos_on_gallery boolean not null default true,
  hero_image_url text,
  hero_image_storage_path text,
  updated_at timestamptz not null default now()
);

insert into public.property_settings (id)
values ('default')
on conflict (id) do nothing;

create table if not exists public.property_gallery_photos (
  id uuid primary key default gen_random_uuid(),
  storage_path text not null unique,
  url text not null,
  caption text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists property_gallery_photos_sort_order_idx
  on public.property_gallery_photos (sort_order, created_at);

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

-- ---------------------------------------------------------------------------
-- Triggers
-- ---------------------------------------------------------------------------

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

-- ---------------------------------------------------------------------------
-- RPCs
-- ---------------------------------------------------------------------------

create or replace function public.create_guest_booking_if_capacity(
  p_guest_name text,
  p_guest_email text,
  p_guest_phone text,
  p_room_id text,
  p_room_name text,
  p_arrival_date date,
  p_departure_date date,
  p_nights integer,
  p_estimated_total integer,
  p_deposit_amount integer,
  p_note text,
  p_conversation_token text,
  p_available_count integer,
  p_bed_setup text default null,
  p_discount_code_id uuid default null,
  p_discount_code_text text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_night date;
  v_net integer;
  v_rooms_to_sell integer;
  v_closed boolean;
  v_booking public.booking_requests%rowtype;
  v_bed_setup text;
  v_code public.discount_codes%rowtype;
begin
  v_bed_setup := nullif(trim(lower(coalesce(p_bed_setup, ''))), '');
  if v_bed_setup is not null and v_bed_setup not in ('double', 'twin') then
    return jsonb_build_object('ok', false, 'reason', 'unavailable');
  end if;

  -- Only Superior (courtyard) keeps a bed preference.
  if p_room_id is distinct from 'courtyard' then
    v_bed_setup := null;
  end if;

  if p_arrival_date is null
     or p_departure_date is null
     or p_departure_date <= p_arrival_date
     or p_nights < 1
     or p_available_count is null
     or p_available_count < 0 then
    return jsonb_build_object('ok', false, 'reason', 'unavailable');
  end if;

  if p_discount_code_id is not null then
    select *
    into v_code
    from public.discount_codes
    where id = p_discount_code_id
    for update;

    if not found
       or v_code.active is not true
       or (v_code.valid_until is not null and v_code.valid_until < current_date)
       or (v_code.max_uses is not null and v_code.uses_count >= v_code.max_uses)
       or (v_code.room_id is not null and v_code.room_id <> p_room_id) then
      return jsonb_build_object('ok', false, 'reason', 'code_unavailable');
    end if;

    update public.discount_codes
    set uses_count = uses_count + 1
    where id = p_discount_code_id;
  end if;

  perform pg_advisory_xact_lock(hashtext(p_room_id));

  v_night := p_arrival_date;
  while v_night < p_departure_date loop
    v_closed := exists (
      select 1
      from public.room_blocks b
      where b.room_id = p_room_id
        and b.ical_feed_id is null
        and b.start_date <= v_night
        and b.end_date > v_night
    );

    if v_closed then
      if p_discount_code_id is not null then
        update public.discount_codes
        set uses_count = greatest(0, uses_count - 1)
        where id = p_discount_code_id;
      end if;
      return jsonb_build_object('ok', false, 'reason', 'unavailable');
    end if;

    select coalesce(
      (
        select i.rooms_to_sell
        from public.room_day_inventory i
        where i.room_id = p_room_id
          and i.date = v_night
        limit 1
      ),
      p_available_count
    )
    into v_rooms_to_sell;

    select
      (
        select count(*)::integer
        from public.booking_requests br
        where br.room_id = p_room_id
          and br.arrival_date <= v_night
          and br.departure_date > v_night
          and br.status <> 'declined'
          and (
            br.status = 'confirmed'
            or br.deposit_paid_at is not null
            or br.bank_transfer_claimed_at is not null
          )
      )
      +
      (
        select count(*)::integer
        from public.room_blocks b
        where b.room_id = p_room_id
          and b.ical_feed_id is not null
          and b.start_date <= v_night
          and b.end_date > v_night
      )
    into v_net;

    if v_net >= v_rooms_to_sell then
      if p_discount_code_id is not null then
        update public.discount_codes
        set uses_count = greatest(0, uses_count - 1)
        where id = p_discount_code_id;
      end if;
      return jsonb_build_object('ok', false, 'reason', 'unavailable');
    end if;

    v_night := v_night + 1;
  end loop;

  insert into public.booking_requests (
    guest_name,
    guest_email,
    guest_phone,
    room_id,
    room_name,
    arrival_date,
    departure_date,
    nights,
    estimated_total,
    deposit_amount,
    note,
    status,
    conversation_token,
    bed_setup,
    discount_code_id,
    discount_code_text
  )
  values (
    p_guest_name,
    p_guest_email,
    p_guest_phone,
    p_room_id,
    p_room_name,
    p_arrival_date,
    p_departure_date,
    p_nights,
    p_estimated_total,
    p_deposit_amount,
    nullif(trim(p_note), ''),
    'pending_payment',
    p_conversation_token,
    v_bed_setup,
    p_discount_code_id,
    nullif(trim(p_discount_code_text), '')
  )
  returning * into v_booking;

  return jsonb_build_object(
    'ok', true,
    'booking', to_jsonb(v_booking)
  );
exception
  when others then
    if p_discount_code_id is not null then
      update public.discount_codes
      set uses_count = greatest(0, uses_count - 1)
      where id = p_discount_code_id;
    end if;
    return jsonb_build_object(
      'ok', false,
      'reason', 'verify-failed',
      'message', sqlerrm
    );
end;
$$;

create or replace function public.staff_update_channel_reservation(
  p_block_id uuid,
  p_guest_name text,
  p_guest_email text,
  p_guest_phone text,
  p_start_date date,
  p_end_date date,
  p_staff_note text,
  p_room_unit_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_room_unit_id is not null and not exists (
    select 1 from public.room_units where id = p_room_unit_id
  ) then
    raise exception 'room_unit_not_found';
  end if;

  update public.room_blocks
  set
    guest_name = nullif(trim(p_guest_name), ''),
    guest_email = nullif(trim(p_guest_email), ''),
    guest_phone = nullif(trim(p_guest_phone), ''),
    start_date = p_start_date,
    end_date = p_end_date,
    staff_note = nullif(trim(p_staff_note), ''),
    room_unit_id = p_room_unit_id
  where id = p_block_id
    and ical_feed_id is not null;

  if not found then
    raise exception 'channel_block_not_found';
  end if;
end;
$$;

create or replace function public.staff_set_booking_room_unit(
  p_booking_id uuid,
  p_room_unit_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_room_unit_id is not null and not exists (
    select 1 from public.room_units where id = p_room_unit_id
  ) then
    raise exception 'room_unit_not_found';
  end if;

  update public.booking_requests
  set room_unit_id = p_room_unit_id
  where id = p_booking_id
    and (
      status = 'confirmed'
      or (
        deposit_paid_at is not null
        and status in ('awaiting', 'needs-reply')
      )
    );

  if not found then
    raise exception 'booking_not_found';
  end if;
end;
$$;

create or replace function public.staff_room_block_unit_map()
returns table (id uuid, room_unit_id uuid)
language sql
security definer
stable
set search_path = public
as $$
  select b.id, b.room_unit_id
  from public.room_blocks b
  where b.room_unit_id is not null;
$$;

create or replace function public.staff_booking_room_unit_map()
returns table (id uuid, room_unit_id uuid)
language sql
security definer
stable
set search_path = public
as $$
  select r.id, r.room_unit_id
  from public.booking_requests r
  where r.room_unit_id is not null;
$$;

revoke all on function public.create_guest_booking_if_capacity(
  text, text, text, text, text, date, date, integer, integer, integer, text, text, integer, text, uuid, text
) from public;
revoke all on function public.staff_update_channel_reservation(uuid, text, text, text, date, date, text, uuid) from public;
revoke all on function public.staff_set_booking_room_unit(uuid, uuid) from public;
revoke all on function public.staff_room_block_unit_map() from public;
revoke all on function public.staff_booking_room_unit_map() from public;

grant execute on function public.create_guest_booking_if_capacity(
  text, text, text, text, text, date, date, integer, integer, integer, text, text, integer, text, uuid, text
) to service_role;
grant execute on function public.staff_update_channel_reservation(uuid, text, text, text, date, date, text, uuid) to service_role;
grant execute on function public.staff_set_booking_room_unit(uuid, uuid) to service_role;
grant execute on function public.staff_room_block_unit_map() to service_role;
grant execute on function public.staff_booking_room_unit_map() to service_role;

-- ---------------------------------------------------------------------------
-- Grants + RLS
-- ---------------------------------------------------------------------------

-- Public clients may read room catalog fields, but not ical_export_token.
grant select (
  id,
  name,
  short_name,
  rate,
  sleeps,
  outlook,
  available_count,
  summary,
  amenities,
  tone,
  image_url,
  gallery_urls,
  sort_order,
  updated_at
) on public.rooms to anon, authenticated;
grant all on public.rooms to service_role;
grant insert on public.booking_requests to anon, authenticated;
grant all on public.booking_requests to service_role;
grant all on public.booking_messages to service_role;
grant all on public.room_blocks to service_role;
grant all on public.room_units to service_role;
grant all on public.room_unit_types to service_role;
grant all on public.room_ical_feeds to service_role;
grant all on public.room_day_inventory to service_role;
grant all on public.room_day_rates to service_role;
grant all on public.staff_notification_emails to service_role;
grant all on public.room_promotions to service_role;
grant all on public.discount_codes to service_role;
grant all on public.property_settings to service_role;
grant select on public.property_gallery_photos to anon, authenticated;
grant all on public.property_gallery_photos to service_role;
grant select on public.tours to anon, authenticated;
grant all on public.tours to service_role;

alter table public.rooms enable row level security;
alter table public.booking_requests enable row level security;
alter table public.booking_messages enable row level security;
alter table public.room_blocks enable row level security;
alter table public.room_units enable row level security;
alter table public.room_unit_types enable row level security;
alter table public.room_ical_feeds enable row level security;
alter table public.room_day_inventory enable row level security;
alter table public.room_day_rates enable row level security;
alter table public.staff_notification_emails enable row level security;
alter table public.room_promotions enable row level security;
alter table public.discount_codes enable row level security;
alter table public.property_settings enable row level security;
alter table public.property_gallery_photos enable row level security;
alter table public.tours enable row level security;

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
  and (
    length(trim(guest_phone)) = 0
    or length(trim(guest_phone)) between 7 and 30
  )
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

drop policy if exists "Service role can manage room units" on public.room_units;
create policy "Service role can manage room units"
on public.room_units
for all
to service_role
using (true)
with check (true);

drop policy if exists "Service role can manage room unit types" on public.room_unit_types;
create policy "Service role can manage room unit types"
on public.room_unit_types
for all
to service_role
using (true)
with check (true);

drop policy if exists "Service role can manage room ical feeds" on public.room_ical_feeds;
create policy "Service role can manage room ical feeds"
on public.room_ical_feeds
for all
to service_role
using (true)
with check (true);

drop policy if exists "Service role can manage room day inventory" on public.room_day_inventory;
create policy "Service role can manage room day inventory"
on public.room_day_inventory
for all
to service_role
using (true)
with check (true);

drop policy if exists "Service role can manage room day rates" on public.room_day_rates;
create policy "Service role can manage room day rates"
on public.room_day_rates
for all
to service_role
using (true)
with check (true);

drop policy if exists "Service role can manage staff notification emails" on public.staff_notification_emails;
create policy "Service role can manage staff notification emails"
on public.staff_notification_emails
for all
to service_role
using (true)
with check (true);

drop policy if exists "Service role can manage room promotions" on public.room_promotions;
create policy "Service role can manage room promotions"
on public.room_promotions
for all
to service_role
using (true)
with check (true);

drop policy if exists "Service role can manage discount codes" on public.discount_codes;
create policy "Service role can manage discount codes"
on public.discount_codes
for all
to service_role
using (true)
with check (true);

drop policy if exists "Service role can manage property settings" on public.property_settings;
create policy "Service role can manage property settings"
on public.property_settings
for all
to service_role
using (true)
with check (true);

drop policy if exists "Anyone can view property gallery photos" on public.property_gallery_photos;
create policy "Anyone can view property gallery photos"
on public.property_gallery_photos
for select
to anon, authenticated
using (true);

drop policy if exists "Service role can manage property gallery photos" on public.property_gallery_photos;
create policy "Service role can manage property gallery photos"
on public.property_gallery_photos
for all
to service_role
using (true)
with check (true);

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

-- ---------------------------------------------------------------------------
-- Storage buckets
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'room-photos',
  'room-photos',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'property-gallery',
  'property-gallery',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Public read room photos" on storage.objects;
create policy "Public read room photos"
on storage.objects
for select
to public
using (bucket_id = 'room-photos');

drop policy if exists "Service role manages room photos" on storage.objects;
create policy "Service role manages room photos"
on storage.objects
for all
to service_role
using (bucket_id = 'room-photos')
with check (bucket_id = 'room-photos');

drop policy if exists "Public read property gallery photos" on storage.objects;
create policy "Public read property gallery photos"
on storage.objects
for select
to public
using (bucket_id = 'property-gallery');

drop policy if exists "Service role manages property gallery photos" on storage.objects;
create policy "Service role manages property gallery photos"
on storage.objects
for all
to service_role
using (bucket_id = 'property-gallery')
with check (bucket_id = 'property-gallery');

notify pgrst, 'reload schema';
