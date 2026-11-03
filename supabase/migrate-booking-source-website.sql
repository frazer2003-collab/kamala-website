-- Allow staff to label direct site bookings as Website (same as guest checkout).

alter table public.booking_requests
  drop constraint if exists booking_requests_booking_source_check;

alter table public.booking_requests
  add constraint booking_requests_booking_source_check
  check (
    booking_source is null
    or booking_source in ('website', 'walk-in', 'airbnb', 'expedia', 'booking')
  );

alter table public.room_blocks
  drop constraint if exists room_blocks_staff_booking_source_check;

alter table public.room_blocks
  add constraint room_blocks_staff_booking_source_check
  check (
    staff_booking_source is null
    or staff_booking_source in ('website', 'walk-in', 'airbnb', 'expedia', 'booking')
  );

comment on column public.booking_requests.booking_source is
  'Staff/guest label: website, walk-in, airbnb, expedia, or booking (Booking.com).';

-- Guest checkout stays are website bookings.
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
set search_path to 'public'
as $function$
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
    discount_code_text,
    booking_source
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
    nullif(trim(p_discount_code_text), ''),
    'website'
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
$function$;
