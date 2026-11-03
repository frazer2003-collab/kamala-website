-- Deluxe (garden) has three doors: 112, 117, 119. Door 114 is Family loft.
-- available_count was left at 4 after loft was split out, which inflated
-- Finance "still open" nights and guest sellable inventory by one phantom door.
update public.rooms
set available_count = 3
where id = 'garden'
  and available_count = 4;
