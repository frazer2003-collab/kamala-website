-- Assign door numbers without relying on PostgREST's cached table columns.
-- Safe to re-run. Also refreshes the API schema cache.
--
-- Includes guest columns from migrate-room-block-guest.sql so the RPC
-- does not fail on databases that never ran that migration.

alter table public.booking_requests
  add column if not exists room_unit_id uuid references public.room_units(id) on delete set null;

alter table public.room_blocks
  add column if not exists room_unit_id uuid references public.room_units(id) on delete set null;

alter table public.room_blocks
  add column if not exists guest_name text,
  add column if not exists guest_email text,
  add column if not exists guest_phone text;

create index if not exists booking_requests_room_unit_id_idx
  on public.booking_requests (room_unit_id)
  where room_unit_id is not null;

create index if not exists room_blocks_room_unit_id_idx
  on public.room_blocks (room_unit_id)
  where room_unit_id is not null;

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
    and status = 'confirmed';

  if not found then
    raise exception 'booking_not_found';
  end if;
end;
$$;

-- Read helpers when table column is invisible to PostgREST cache.
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

revoke all on function public.staff_update_channel_reservation(uuid, text, text, text, date, date, text, uuid) from public;
revoke all on function public.staff_set_booking_room_unit(uuid, uuid) from public;
revoke all on function public.staff_room_block_unit_map() from public;
revoke all on function public.staff_booking_room_unit_map() from public;

grant execute on function public.staff_update_channel_reservation(uuid, text, text, text, date, date, text, uuid) to service_role;
grant execute on function public.staff_set_booking_room_unit(uuid, uuid) to service_role;
grant execute on function public.staff_room_block_unit_map() to service_role;
grant execute on function public.staff_booking_room_unit_map() to service_role;

NOTIFY pgrst, 'reload schema';
