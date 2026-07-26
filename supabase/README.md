# Supabase SQL

## Fresh install

Run once in the Supabase SQL editor:

1. `schema.sql` — complete current database (tables, RPCs, RLS, storage buckets, room/door seed)
2. `seed-chiangmai-tours.sql` — optional tour cards

Then open Staff → Settings and fill property details, photos, and calendar feeds.

## Diagnostics

- `verify-room-units.sql` — check door numbers and room-type links

## Archive

`archive/` holds historical one-off upgrade scripts that were already applied on the live project. They are kept for reference only. Do not re-run them on a database created from `schema.sql`.

If an old environment is missing a feature, prefer re-running the relevant section from `schema.sql` (it is idempotent where possible) or consult the matching file under `archive/`.
