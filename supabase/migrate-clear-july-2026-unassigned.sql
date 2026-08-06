-- One-shot: remove No # (unassigned / orphaned door) stays overlapping July 2026.
-- Safe to re-run. Does not touch stays with a valid room_unit_id.

delete from public.booking_requests br
where br.arrival_date < '2026-08-01'
  and br.departure_date > '2026-07-01'
  and (
    br.room_unit_id is null
    or not exists (
      select 1 from public.room_units u where u.id = br.room_unit_id
    )
  );

delete from public.room_blocks rb
where rb.start_date < '2026-08-01'
  and rb.end_date > '2026-07-01'
  and (
    rb.room_unit_id is null
    or not exists (
      select 1 from public.room_units u where u.id = rb.room_unit_id
    )
  );
