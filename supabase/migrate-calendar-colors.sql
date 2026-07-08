-- Staff calendar day and booking bar colors.
alter table public.property_settings
  add column if not exists calendar_color_available text not null default '#bbf7d0',
  add column if not exists calendar_color_closed text not null default '#fecaca',
  add column if not exists calendar_color_booking text not null default '#fef08a';
