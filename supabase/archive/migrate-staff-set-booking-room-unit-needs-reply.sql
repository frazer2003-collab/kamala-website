-- Allow door assignment for paid needs-reply stays (guest messaged after
-- card confirm). Matches isStaffCalendarManageableStay.
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

revoke all on function public.staff_set_booking_room_unit(uuid, uuid) from public;
grant execute on function public.staff_set_booking_room_unit(uuid, uuid) to service_role;

NOTIFY pgrst, 'reload schema';
