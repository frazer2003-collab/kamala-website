-- Guest checkout was showing this staff note under the promo line.
-- Room % off stays; only the tours wording is removed.
update public.room_promotions
set label = null
where label ilike '%10% discount on any tours%';
