-- Room-number assignment for OTA / channel reservations (room_blocks).
-- Safe to run after migrate-room-units.sql (or together with a fresh units install).

alter table public.room_blocks
  add column if not exists room_unit_id uuid references public.room_units(id) on delete set null;

create index if not exists room_blocks_room_unit_id_idx
  on public.room_blocks (room_unit_id)
  where room_unit_id is not null;

-- Refresh PostgREST / Supabase API schema cache so room_unit_id is visible to the app.
NOTIFY pgrst, 'reload schema';
