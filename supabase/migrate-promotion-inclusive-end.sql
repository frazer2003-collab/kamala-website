-- Promotion end_date is the last discounted night (inclusive).
-- The app previously treated end_date as checkout day (exclusive).
--
-- If promotions were saved with the old checkout-day field, adjust them once:
--   UPDATE public.room_promotions SET end_date = end_date - 1 WHERE end_date > start_date;

alter table public.room_promotions
  drop constraint if exists room_promotions_date_range;

alter table public.room_promotions
  add constraint room_promotions_date_range check (end_date >= start_date);
