-- Desk catalog setup: cost/sell prices, free-text units, custom categories,
-- and per-line bill prices (owner comps / price overrides).

-- Categories the guesthouse can manage (seed keeps current system keys).
create table if not exists public.desk_item_categories (
  id uuid primary key default gen_random_uuid(),
  property_id text not null default 'kamala' check (length(trim(property_id)) > 0),
  key text not null check (length(trim(key)) > 0),
  name_en text not null check (length(trim(name_en)) > 0),
  name_th text not null default '' check (name_th = trim(name_th)),
  sort_order integer not null default 100,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (property_id, id),
  unique (property_id, key)
);

insert into public.desk_item_categories (property_id, key, name_en, name_th, sort_order)
values
  ('kamala', 'room', 'Room', 'ห้อง', 10),
  ('kamala', 'drink', 'Drink', 'เครื่องดื่ม', 20),
  ('kamala', 'food', 'Food', 'อาหาร', 30),
  ('kamala', 'laundry', 'Laundry', 'ซักรีด', 40),
  ('kamala', 'extra', 'Extra', 'อื่นๆ', 50)
on conflict (property_id, key) do nothing;

-- Free-text stock units (was count|grams only).
alter table public.desk_counted_items
  drop constraint if exists desk_counted_items_unit_check;

alter table public.desk_counted_items
  add column if not exists cost_satang bigint not null default 0
    check (cost_satang >= 0);

alter table public.desk_counted_items
  add column if not exists sell_price_satang bigint not null default 0
    check (sell_price_satang >= 0);

-- Menu sell + cost; category becomes free key (validated in app against categories table).
alter table public.desk_sellable_items
  drop constraint if exists desk_sellable_items_category_check;

alter table public.desk_sellable_items
  add column if not exists cost_satang bigint not null default 0
    check (cost_satang >= 0);

-- Snapshot sell price on each bill line so overrides / comps stick after clear.
alter table public.desk_bill_lines
  add column if not exists unit_price_satang bigint;

update public.desk_bill_lines as line
set unit_price_satang = sellable.price_satang
from public.desk_sellable_items as sellable
where line.unit_price_satang is null
  and line.property_id = sellable.property_id
  and line.sellable_item_id = sellable.id;

update public.desk_bill_lines
set unit_price_satang = 0
where unit_price_satang is null;

alter table public.desk_bill_lines
  alter column unit_price_satang set not null;

alter table public.desk_bill_lines
  drop constraint if exists desk_bill_lines_unit_price_satang_check;

alter table public.desk_bill_lines
  add constraint desk_bill_lines_unit_price_satang_check
  check (unit_price_satang >= 0);

comment on table public.desk_item_categories is
  'Guesthouse-managed menu categories; key is stored on desk_sellable_items.category.';

comment on column public.desk_counted_items.cost_satang is
  'Purchase / cost price per unit in satang.';

comment on column public.desk_counted_items.sell_price_satang is
  'Default sell price when this stock item is sold on a bill.';

comment on column public.desk_sellable_items.cost_satang is
  'Cost price in satang for margin awareness.';

comment on column public.desk_bill_lines.unit_price_satang is
  'Sell price per unit for this line (may be 0 for owner/comp; stock still cuts on clear).';
