-- Kamala desk operations: counted stock, sellables, bills, and laundry.
-- Monetary values are stored as integer satang. Staff access is service-role only.

create table if not exists public.desk_counted_items (
  id uuid primary key default gen_random_uuid(),
  property_id text not null default 'kamala' check (length(trim(property_id)) > 0),
  name_th text not null check (length(trim(name_th)) > 0),
  name_en text not null check (length(trim(name_en)) > 0),
  unit text not null check (unit in ('count', 'grams')),
  opening_quantity bigint not null default 0 check (opening_quantity >= 0),
  minimum bigint not null default 0 check (minimum >= 0),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (property_id, id),
  unique (property_id, name_en)
);

create table if not exists public.desk_sellable_items (
  id uuid primary key default gen_random_uuid(),
  property_id text not null default 'kamala' check (length(trim(property_id)) > 0),
  name_th text not null check (length(trim(name_th)) > 0),
  name_en text not null check (length(trim(name_en)) > 0),
  category text not null check (
    category in ('room', 'drink', 'food', 'laundry', 'extra')
  ),
  price_satang bigint not null check (price_satang >= 0),
  minimum bigint not null default 0 check (minimum >= 0),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (property_id, id),
  unique (property_id, name_en)
);

create table if not exists public.desk_sellable_ingredients (
  id uuid primary key default gen_random_uuid(),
  property_id text not null default 'kamala' check (length(trim(property_id)) > 0),
  sellable_item_id uuid not null,
  counted_item_id uuid not null,
  quantity bigint not null check (quantity > 0),
  created_at timestamptz not null default now(),
  unique (property_id, id),
  unique (property_id, sellable_item_id, counted_item_id),
  foreign key (property_id, sellable_item_id)
    references public.desk_sellable_items(property_id, id)
    on delete cascade,
  foreign key (property_id, counted_item_id)
    references public.desk_counted_items(property_id, id)
    on delete restrict
);

create table if not exists public.desk_sellable_attached (
  id uuid primary key default gen_random_uuid(),
  property_id text not null default 'kamala' check (length(trim(property_id)) > 0),
  room_sellable_item_id uuid not null,
  laundry_sellable_item_id uuid not null,
  created_at timestamptz not null default now(),
  unique (property_id, id),
  unique (
    property_id,
    room_sellable_item_id,
    laundry_sellable_item_id
  ),
  check (room_sellable_item_id <> laundry_sellable_item_id),
  foreign key (property_id, room_sellable_item_id)
    references public.desk_sellable_items(property_id, id)
    on delete cascade,
  foreign key (property_id, laundry_sellable_item_id)
    references public.desk_sellable_items(property_id, id)
    on delete cascade
);

create table if not exists public.desk_bills (
  id uuid primary key default gen_random_uuid(),
  property_id text not null default 'kamala' check (length(trim(property_id)) > 0),
  name text not null check (length(trim(name)) > 0),
  room text,
  status text not null default 'open' check (status in ('open', 'cleared')),
  service_date date not null default ((now() at time zone 'Asia/Bangkok')::date),
  cleared_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (property_id, id),
  check (room is null or length(trim(room)) > 0),
  check (
    (status = 'open' and cleared_at is null)
    or (status = 'cleared' and cleared_at is not null)
  )
);

create table if not exists public.desk_bill_lines (
  id uuid primary key default gen_random_uuid(),
  property_id text not null default 'kamala' check (length(trim(property_id)) > 0),
  bill_id uuid not null,
  sellable_item_id uuid not null,
  quantity integer not null check (quantity > 0),
  created_at timestamptz not null default now(),
  unique (property_id, id),
  foreign key (property_id, bill_id)
    references public.desk_bills(property_id, id)
    on delete cascade,
  foreign key (property_id, sellable_item_id)
    references public.desk_sellable_items(property_id, id)
    on delete restrict
);

create table if not exists public.desk_stock_movements (
  id uuid primary key default gen_random_uuid(),
  property_id text not null default 'kamala' check (length(trim(property_id)) > 0),
  counted_item_id uuid not null,
  quantity bigint not null check (quantity <> 0),
  reason text not null check (
    reason in ('opening', 'purchase', 'bill_sale', 'waste', 'adjustment')
  ),
  source_bill_line_id uuid,
  note text,
  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (property_id, id),
  foreign key (property_id, counted_item_id)
    references public.desk_counted_items(property_id, id)
    on delete restrict,
  foreign key (property_id, source_bill_line_id)
    references public.desk_bill_lines(property_id, id)
    on delete restrict,
  check (
    (reason = 'bill_sale' and source_bill_line_id is not null)
    or (reason <> 'bill_sale' and source_bill_line_id is null)
  )
);

create unique index if not exists desk_stock_bill_post_once_idx
  on public.desk_stock_movements (
    property_id,
    source_bill_line_id,
    counted_item_id
  )
  where source_bill_line_id is not null;

create table if not exists public.desk_laundry_records (
  id uuid primary key default gen_random_uuid(),
  property_id text not null default 'kamala' check (length(trim(property_id)) > 0),
  name text not null check (length(trim(name)) > 0),
  category text not null check (category in ('laundry', 'sheets')),
  grams bigint check (grams is null or grams > 0),
  count integer check (count is null or count > 0),
  staff_note text,
  email text,
  recorded_at timestamptz not null default now(),
  status text not null default 'sent' check (
    status in ('sent', 'incomplete', 'complete')
  ),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (property_id, id),
  check ((grams is null) <> (count is null)),
  check (email is null or length(trim(email)) > 0)
);

create index if not exists desk_counted_items_active_idx
  on public.desk_counted_items (property_id, active, name_en);
create index if not exists desk_sellable_items_category_idx
  on public.desk_sellable_items (property_id, category, active);
create index if not exists desk_bill_lines_bill_idx
  on public.desk_bill_lines (property_id, bill_id);
create index if not exists desk_bills_status_idx
  on public.desk_bills (property_id, status, service_date desc);
create index if not exists desk_stock_movements_item_idx
  on public.desk_stock_movements (property_id, counted_item_id, occurred_at);
create index if not exists desk_laundry_records_status_idx
  on public.desk_laundry_records (property_id, status, recorded_at desc);

alter table public.desk_counted_items enable row level security;
alter table public.desk_stock_movements enable row level security;
alter table public.desk_sellable_items enable row level security;
alter table public.desk_sellable_ingredients enable row level security;
alter table public.desk_sellable_attached enable row level security;
alter table public.desk_bills enable row level security;
alter table public.desk_bill_lines enable row level security;
alter table public.desk_laundry_records enable row level security;

revoke all on table public.desk_counted_items from anon, authenticated;
revoke all on table public.desk_stock_movements from anon, authenticated;
revoke all on table public.desk_sellable_items from anon, authenticated;
revoke all on table public.desk_sellable_ingredients from anon, authenticated;
revoke all on table public.desk_sellable_attached from anon, authenticated;
revoke all on table public.desk_bills from anon, authenticated;
revoke all on table public.desk_bill_lines from anon, authenticated;
revoke all on table public.desk_laundry_records from anon, authenticated;

grant all on table public.desk_counted_items to service_role;
grant all on table public.desk_stock_movements to service_role;
grant all on table public.desk_sellable_items to service_role;
grant all on table public.desk_sellable_ingredients to service_role;
grant all on table public.desk_sellable_attached to service_role;
grant all on table public.desk_bills to service_role;
grant all on table public.desk_bill_lines to service_role;
grant all on table public.desk_laundry_records to service_role;

-- Starter catalog for a property with no desk inventory yet.
insert into public.desk_counted_items (
  property_id,
  name_th,
  name_en,
  unit,
  opening_quantity,
  minimum
)
values
  ('kamala', 'ไข่', 'Eggs', 'count', 0, 12),
  ('kamala', 'ขนมปัง', 'Bread slices', 'count', 0, 12),
  ('kamala', 'เบคอน', 'Bacon', 'grams', 0, 1000)
on conflict (property_id, name_en) do nothing;

insert into public.desk_sellable_items (
  property_id,
  name_th,
  name_en,
  category,
  price_satang,
  minimum
)
values (
  'kamala',
  'ชุดอาหารเช้า',
  'Breakfast set',
  'food',
  25000,
  0
)
on conflict (property_id, name_en) do nothing;

insert into public.desk_sellable_ingredients (
  property_id,
  sellable_item_id,
  counted_item_id,
  quantity
)
select
  'kamala',
  sellable.id,
  counted.id,
  ingredient.quantity
from public.desk_sellable_items sellable
join (
  values
    ('Eggs'::text, 2::bigint),
    ('Bread slices'::text, 2::bigint),
    ('Bacon'::text, 80::bigint)
) as ingredient(name_en, quantity)
  on true
join public.desk_counted_items counted
  on counted.property_id = 'kamala'
  and counted.name_en = ingredient.name_en
where sellable.property_id = 'kamala'
  and sellable.name_en = 'Breakfast set'
on conflict (property_id, sellable_item_id, counted_item_id) do nothing;

-- Extra demo catalog (safe to re-run).
insert into public.desk_counted_items (
  property_id, name_th, name_en, unit, opening_quantity, minimum
)
values
  ('kamala', 'น้ำดื่ม', 'Bottled water', 'count', 48, 12),
  ('kamala', 'กาแฟผง', 'Coffee powder', 'grams', 2000, 400),
  ('kamala', 'นม', 'Milk', 'count', 20, 6),
  ('kamala', 'น้ำตาล', 'Sugar sachets', 'count', 100, 20),
  ('kamala', 'ข้าวสาร', 'Rice', 'grams', 10000, 2000)
on conflict (property_id, name_en) do nothing;

insert into public.desk_sellable_items (
  property_id, name_th, name_en, category, price_satang, minimum
)
values
  ('kamala', 'กาแฟร้อน', 'Hot coffee', 'drink', 6000, 0),
  ('kamala', 'น้ำดื่ม', 'Bottled water', 'drink', 2000, 0),
  ('kamala', 'ข้าวผัด', 'Fried rice', 'food', 12000, 0),
  ('kamala', 'ซักผ้า', 'Guest laundry bag', 'laundry', 15000, 0),
  ('kamala', 'ผ้าเช็ดตัวเพิ่ม', 'Extra towel', 'extra', 5000, 0)
on conflict (property_id, name_en) do nothing;
