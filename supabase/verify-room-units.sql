-- Verify room-number setup, then refresh the API schema cache.
-- Run this in the Supabase SQL editor for the same project as your app env vars.

select
  exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'room_blocks'
      and column_name = 'room_unit_id'
  ) as room_blocks_has_room_unit_id,
  exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'booking_requests'
      and column_name = 'room_unit_id'
  ) as booking_requests_has_room_unit_id,
  (select count(*) from public.room_units) as room_unit_count,
  (select count(*) from public.room_unit_types) as room_unit_type_links;

-- Make the new columns visible to the app immediately:
NOTIFY pgrst, 'reload schema';
