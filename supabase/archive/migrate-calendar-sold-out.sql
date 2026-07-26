-- Sold-out calendar color (distinct from reservation yellow).
-- Safe to re-run.

alter table public.property_settings
  add column if not exists calendar_color_sold_out text not null default '#fdba74';

update public.property_settings
set calendar_color_sold_out = '#fdba74'
where calendar_color_sold_out is null or trim(calendar_color_sold_out) = '';
