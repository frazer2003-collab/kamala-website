-- Guest-entered discount codes (promo codes) with usage limits.

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

grant all on public.discount_codes to service_role;

alter table public.discount_codes enable row level security;

drop policy if exists "Service role can manage discount codes" on public.discount_codes;
create policy "Service role can manage discount codes"
on public.discount_codes
for all
to service_role
using (true)
with check (true);

-- Extend atomic guest booking to reserve a discount code use.
drop function if exists public.create_guest_booking_if_capacity(
  text, text, text, text, text, date, date, integer, integer, integer, text, text, integer, text
);

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
        and coalesce(b.staff_booking_source, '') not in ('airbnb', 'expedia', 'booking')
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
          and b.staff_booking_source in ('airbnb', 'expedia', 'booking')
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

revoke all on function public.create_guest_booking_if_capacity(
  text, text, text, text, text, date, date, integer, integer, integer, text, text, integer, text, uuid, text
) from public;

grant execute on function public.create_guest_booking_if_capacity(
  text, text, text, text, text, date, date, integer, integer, integer, text, text, integer, text, uuid, text
) to service_role;
