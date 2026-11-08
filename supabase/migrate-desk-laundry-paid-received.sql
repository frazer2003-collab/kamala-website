-- Laundry: unpaid/paid + price + received date (sent stays on recorded_at).

alter table public.desk_laundry_records
  add column if not exists price_satang bigint,
  add column if not exists received_at timestamptz;

-- Drop old status check before rewriting values.
alter table public.desk_laundry_records
  drop constraint if exists desk_laundry_records_status_check;

update public.desk_laundry_records
set status = case
  when status = 'complete' then 'paid'
  when status in ('paid', 'unpaid') then status
  else 'unpaid'
end;

alter table public.desk_laundry_records
  add constraint desk_laundry_records_status_check
  check (status in ('unpaid', 'paid'));

alter table public.desk_laundry_records
  alter column status set default 'unpaid';

update public.desk_laundry_records
set price_satang = coalesce(price_satang, 0)
where price_satang is null;

alter table public.desk_laundry_records
  alter column price_satang set default 0;

alter table public.desk_laundry_records
  alter column price_satang set not null;

alter table public.desk_laundry_records
  drop constraint if exists desk_laundry_records_price_satang_check;

alter table public.desk_laundry_records
  add constraint desk_laundry_records_price_satang_check
  check (price_satang >= 0);

comment on column public.desk_laundry_records.price_satang is
  'Quoted / invoiced laundry price in satang.';
comment on column public.desk_laundry_records.received_at is
  'When the bag/sheets came back; null while still out.';
comment on column public.desk_laundry_records.recorded_at is
  'When the slip was sent out.';
