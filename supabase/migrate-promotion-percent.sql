-- Switch room promotions from fixed nightly rates to percentage discounts.
-- Run in the Supabase SQL editor.

alter table public.room_promotions
  add column if not exists percent_off integer;

-- Existing fixed-rate promos cannot be converted automatically; clear them.
update public.room_promotions
set percent_off = 10
where percent_off is null;

alter table public.room_promotions
  alter column percent_off set not null;

alter table public.room_promotions
  drop constraint if exists room_promotions_percent_off_check;

alter table public.room_promotions
  add constraint room_promotions_percent_off_check
  check (percent_off between 1 and 90);

alter table public.room_promotions
  drop column if exists nightly_rate;
