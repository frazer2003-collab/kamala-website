# Supabase SQL

## Fresh install

Run once in the Supabase SQL editor:

1. `schema.sql` — complete current database (tables, RPCs, RLS, storage buckets, room/door seed)
2. `seed-chiangmai-tours.sql` — optional tour cards

Then open Staff → Settings and fill property details and photos.

## Existing projects

Run once in the SQL editor when upgrading an older database that still has iCal tables/columns:

- `migrate-remove-ical.sql` — drops `room_ical_feeds`, export tokens, and `ical_feed_id` / `ical_uid`

## Diagnostics

- `verify-room-units.sql` — check door numbers and room-type links

## Archive

`archive/` holds historical one-off upgrade scripts that were already applied on the live project. They are kept for reference only. Do not re-run them on a database created from `schema.sql`.

If an old environment is missing a feature, prefer re-running the relevant section from `schema.sql` (it is idempotent where possible) or consult the matching file under `archive/`.
