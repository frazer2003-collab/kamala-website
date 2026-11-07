-- Desk audit actor labels (property-scoped rows already keyed by property_id).
-- Who cleared a bill / who recorded a stock movement for later review.
-- Not a full atomic clear RPC — labels only.

alter table public.desk_bills
  add column if not exists cleared_by text;

alter table public.desk_stock_movements
  add column if not exists acted_by text;

comment on column public.desk_bills.cleared_by is
  'Actor label when status became cleared: staff subject/email, portal:bills, or staff.';

comment on column public.desk_stock_movements.acted_by is
  'Actor label who recorded the movement: staff subject/email, portal:bills / portal:laundry, or staff.';
