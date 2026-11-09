-- Clear demo desk catalog and ops rows. Keeps booking_requests (live stays).
-- Safe to re-run. Does not touch expenses or item categories.

delete from public.desk_stock_movements
where property_id = 'kamala';

delete from public.desk_bill_lines
where property_id = 'kamala';

delete from public.desk_bills
where property_id = 'kamala';

delete from public.desk_sellable_ingredients
where property_id = 'kamala';

delete from public.desk_sellable_attached
where property_id = 'kamala';

delete from public.desk_sellable_items
where property_id = 'kamala';

delete from public.desk_counted_items
where property_id = 'kamala';

delete from public.desk_laundry_records
where property_id = 'kamala';

delete from public.desk_tour_sales
where property_id = 'kamala';
