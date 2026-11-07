-- Sheet slips store item quantities (duvet cover, pillow case, …).
alter table public.desk_laundry_records
  add column if not exists lines jsonb not null default '[]'::jsonb;

comment on column public.desk_laundry_records.lines is
  'For category=sheets: array of {key, quantity}. Empty for bag laundry.';
