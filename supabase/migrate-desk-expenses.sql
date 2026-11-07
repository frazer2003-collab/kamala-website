-- Desk business expenses (charge name + cost + optional note).
-- Indexed for year-scale month/day range queries.

create table if not exists public.desk_expenses (
  id uuid primary key default gen_random_uuid(),
  property_id text not null default 'kamala' check (length(trim(property_id)) > 0),
  name text not null check (length(trim(name)) > 0),
  amount_satang bigint not null check (amount_satang >= 0),
  staff_note text,
  expense_date date not null default ((now() at time zone 'Asia/Bangkok')::date),
  acted_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (property_id, id),
  check (staff_note is null or length(trim(staff_note)) > 0)
);

create index if not exists desk_expenses_property_date_idx
  on public.desk_expenses (property_id, expense_date desc, created_at desc);

create index if not exists desk_expenses_property_date_id_idx
  on public.desk_expenses (property_id, expense_date, id);

comment on table public.desk_expenses is
  'Business expense records for Finance gross profit (room/operating costs).';

-- Demo rows so owners can see month/day filtering and Finance profit.
-- Idempotent: only inserts when this property has fewer than 5 expenses.
insert into public.desk_expenses (
  property_id,
  name,
  amount_satang,
  staff_note,
  expense_date,
  acted_by
)
select
  'kamala',
  demo.name,
  demo.amount_satang,
  demo.staff_note,
  demo.expense_date,
  'demo'
from (
  values
    ('Electricity — October', 420000, 'MEA invoice', (current_date - 28)),
    ('Water bill', 85000, null, (current_date - 26)),
    ('Laundry detergent bulk', 120000, 'Bought at Makro', (current_date - 21)),
    ('Internet / Wi‑Fi', 99000, 'True Business', (current_date - 18)),
    ('Garden maintenance', 150000, 'Weekly gardener', (current_date - 14)),
    ('LPG gas refill', 65000, null, (current_date - 12)),
    ('Pool chemicals', 78000, 'Chlorine + acid', (current_date - 10)),
    ('Staff lunch — market', 45000, 'Front desk float', (current_date - 9)),
    ('Toilet paper & soap', 56000, 'Housekeeping', (current_date - 7)),
    ('Air-con service — Room 2', 180000, 'Annual clean', (current_date - 5)),
    ('Grab delivery tips float', 20000, null, (current_date - 3)),
    ('Drinking water bottles', 36000, '6 packs', (current_date - 2)),
    ('Market vegetables', 52000, 'Breakfast prep', (current_date - 1)),
    ('Municipal rubbish fee', 30000, null, current_date),
    ('Printer ink', 89000, 'Office', current_date)
) as demo(name, amount_satang, staff_note, expense_date)
where (
  select count(*)::int
  from public.desk_expenses
  where property_id = 'kamala'
) < 5;

-- Soft-fill missing menu cost prices so Finance food/drink cost has numbers to show.
update public.desk_sellable_items
set cost_satang = greatest(1, (price_satang * 35) / 100)
where property_id = 'kamala'
  and active = true
  and cost_satang = 0
  and price_satang > 0;
