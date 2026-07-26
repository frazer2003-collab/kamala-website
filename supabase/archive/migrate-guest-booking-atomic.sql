-- Atomic guest booking: advisory lock + capacity re-check + insert in one transaction.
-- Prevents two concurrent last-unit guests from both inserting pending_payment holds.

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
  p_available_count integer
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
begin
  if p_arrival_date is null
     or p_departure_date is null
     or p_departure_date <= p_arrival_date
     or p_nights < 1
     or p_available_count is null
     or p_available_count < 0 then
    return jsonb_build_object('ok', false, 'reason', 'unavailable');
  end if;

  -- Serialize concurrent guest holds for the same room type.
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
            br.status in ('pending_payment', 'confirmed')
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
    conversation_token
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
    p_conversation_token
  )
  returning * into v_booking;

  return jsonb_build_object(
    'ok', true,
    'booking', to_jsonb(v_booking)
  );
exception
  when others then
    return jsonb_build_object(
      'ok', false,
      'reason', 'verify-failed',
      'message', sqlerrm
    );
end;
$$;

revoke all on function public.create_guest_booking_if_capacity(
  text, text, text, text, text, date, date, integer, integer, integer, text, text, integer
) from public;

grant execute on function public.create_guest_booking_if_capacity(
  text, text, text, text, text, date, date, integer, integer, integer, text, text, integer
) to service_role;
