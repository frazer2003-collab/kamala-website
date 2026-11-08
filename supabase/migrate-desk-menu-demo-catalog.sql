-- Dense demo menu + stock catalog for desk layout checks (safe to re-run).
-- Hides guest laundry sellables from the menu catalog.
-- Names read like a Chiang Mai guesthouse front-desk list.

update public.desk_sellable_items
set active = false, updated_at = now()
where property_id = 'kamala'
  and category = 'laundry'
  and active = true;

insert into public.desk_counted_items (
  property_id, name_th, name_en, unit, opening_quantity, minimum, cost_satang, sell_price_satang
)
values
  ('kamala', 'ชาเขียวซอง', 'Green tea bags', 'count', 80, 20, 300, 0),
  ('kamala', 'น้ำส้มกล่อง', 'Orange juice cartons', 'count', 18, 6, 4500, 0),
  ('kamala', 'โค้กกระป๋อง', 'Coca-Cola cans', 'count', 36, 12, 1200, 0),
  ('kamala', 'เบียร์ช้างขวด', 'Chang beer bottles', 'count', 24, 8, 4500, 0),
  ('kamala', 'สบู่ก้อน', 'Body soap', 'count', 40, 10, 800, 0),
  ('kamala', 'แชมพู', 'Shampoo', 'count', 60, 15, 500, 0),
  ('kamala', 'ทิชชู่', 'Tissues', 'count', 30, 8, 2500, 0),
  ('kamala', 'ถาดไข่', 'Egg tray', 'count', 60, 24, 150, 0),
  ('kamala', 'มะเขือเทศ', 'Tomatoes', 'grams', 3000, 800, 5, 0),
  ('kamala', 'หอมหัวใหญ่', 'Onions', 'grams', 4000, 1000, 3, 0),
  ('kamala', 'กระเทียม', 'Garlic', 'grams', 1500, 400, 8, 0),
  ('kamala', 'น้ำมันพืช', 'Vegetable oil', 'ml', 4000, 1000, 2, 0)
on conflict (property_id, name_en) do nothing;

-- Rename legacy demo stock labels if still present.
update public.desk_counted_items set name_en = 'Drinking water bottles', name_th = 'น้ำดื่มขวด', updated_at = now()
  where property_id = 'kamala' and name_en = 'Bottled water';
update public.desk_counted_items set name_en = 'Bread', name_th = 'ขนมปัง', updated_at = now()
  where property_id = 'kamala' and name_en = 'Bread slices';
update public.desk_counted_items set name_en = 'Eggs', name_th = 'ไข่ไก่', updated_at = now()
  where property_id = 'kamala' and name_en = 'Eggs' and name_th = 'ไข่';
update public.desk_counted_items set name_en = 'Instant coffee', name_th = 'กาแฟสำเร็จรูป', updated_at = now()
  where property_id = 'kamala' and name_en = 'Coffee powder';
update public.desk_counted_items set name_en = 'Milk cartons', name_th = 'นมกล่อง', updated_at = now()
  where property_id = 'kamala' and name_en = 'Milk';
update public.desk_counted_items set name_en = 'Sugar packets', name_th = 'น้ำตาลซอง', updated_at = now()
  where property_id = 'kamala' and name_en = 'Sugar sachets';
update public.desk_counted_items set name_en = 'Vegetable oil', name_th = 'น้ำมันพืช', updated_at = now()
  where property_id = 'kamala' and name_en = 'Cooking oil';

insert into public.desk_sellable_items (
  property_id, name_th, name_en, category, price_satang, cost_satang, minimum, active
)
values
  ('kamala', 'ชาเย็น', 'Thai iced tea', 'drink', 4500, 1200, 0, true),
  ('kamala', 'กาแฟเย็น', 'Thai iced coffee', 'drink', 6500, 1800, 0, true),
  ('kamala', 'น้ำส้มคั้น', 'Orange juice', 'drink', 8000, 3500, 0, true),
  ('kamala', 'โค้ก', 'Coca-Cola', 'drink', 3500, 1200, 0, true),
  ('kamala', 'เบียร์ช้าง', 'Chang beer', 'drink', 9000, 4500, 0, true),
  ('kamala', 'น้ำมะนาวโซดา', 'Lemon soda', 'drink', 5500, 1500, 0, true),
  ('kamala', 'กล้วยปั่น', 'Banana shake', 'drink', 9000, 2800, 0, true),
  ('kamala', 'ไข่เจียว', 'Thai omelette', 'food', 8000, 2500, 0, true),
  ('kamala', 'แพนเค้ก', 'Pancake stack', 'food', 12000, 3500, 0, true),
  ('kamala', 'โจ๊ก', 'Jok', 'food', 7000, 2000, 0, true),
  ('kamala', 'ผัดไทย', 'Pad Thai', 'food', 14000, 4500, 0, true),
  ('kamala', 'ผัดกระเพรา', 'Pad krapow', 'food', 13000, 4200, 0, true),
  ('kamala', 'ต้มยำกุ้ง', 'Tom yum goong', 'food', 16000, 5500, 0, true),
  ('kamala', 'สลัดรวม', 'Mixed salad', 'food', 11000, 3200, 0, true),
  ('kamala', 'ขนมปังปิ้งแยม', 'Toast with jam', 'food', 6000, 1800, 0, true),
  ('kamala', 'ผลไม้ตามฤดูกาล', 'Seasonal fruit', 'food', 10000, 4000, 0, true),
  ('kamala', 'มาม่า', 'Mama noodles', 'food', 5000, 1500, 0, true),
  ('kamala', 'ค่าห้อง', 'Room charge', 'room', 0, 0, 0, true),
  ('kamala', 'ผ้าเช็ดตัวเพิ่ม', 'Extra towel', 'extra', 5000, 1000, 0, true),
  ('kamala', 'หมอนเพิ่ม', 'Extra pillow', 'extra', 3000, 800, 0, true),
  ('kamala', 'ผ้าห่มเพิ่ม', 'Extra blanket', 'extra', 8000, 2000, 0, true),
  ('kamala', 'ที่ชาร์จโทรศัพท์', 'Phone charger', 'extra', 0, 0, 0, true),
  ('kamala', 'เช่าจักรยานครึ่งวัน', 'Bicycle — half day', 'extra', 15000, 0, 0, true),
  ('kamala', 'เช่าจักรยานทั้งวัน', 'Bicycle — full day', 'extra', 25000, 0, 0, true),
  ('kamala', 'รับส่งสนามบิน', 'Airport pickup', 'extra', 40000, 0, 0, true),
  ('kamala', 'ทัวร์เดินเมืองเก่า', 'Old City walking tour', 'extra', 80000, 0, 0, true),
  ('kamala', 'นวดไทย 60 นาที', 'Thai massage (60 min)', 'extra', 45000, 0, 0, true),
  ('kamala', 'น้ำดื่มในห้อง', 'Room drinking water', 'extra', 0, 800, 0, true)
on conflict (property_id, name_en) do update
set
  name_th = excluded.name_th,
  category = excluded.category,
  price_satang = excluded.price_satang,
  cost_satang = excluded.cost_satang,
  active = true,
  updated_at = now();

-- Rename legacy sellable demo labels if still present.
update public.desk_sellable_items set name_en = 'Drinking water', name_th = 'น้ำดื่ม', updated_at = now()
  where property_id = 'kamala' and name_en = 'Bottled water';
update public.desk_sellable_items set name_en = 'American breakfast', name_th = 'อาหารเช้าอเมริกัน', updated_at = now()
  where property_id = 'kamala' and name_en = 'Breakfast set';
update public.desk_sellable_items set name_en = 'Hot coffee', name_th = 'กาแฟร้อน', updated_at = now()
  where property_id = 'kamala' and name_en = 'Hot coffee';
