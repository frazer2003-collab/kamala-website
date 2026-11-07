-- Dense demo menu + stock catalog for desk layout checks (safe to re-run).
-- Hides guest laundry sellables from the menu catalog.

update public.desk_sellable_items
set active = false, updated_at = now()
where property_id = 'kamala'
  and category = 'laundry'
  and active = true;

insert into public.desk_counted_items (
  property_id, name_th, name_en, unit, opening_quantity, minimum, cost_satang, sell_price_satang
)
values
  ('kamala', 'ชาเขียว', 'Green tea bags', 'count', 80, 20, 300, 0),
  ('kamala', 'น้ำส้ม', 'Orange juice carton', 'count', 18, 6, 4500, 0),
  ('kamala', 'โค้ก', 'Coke cans', 'count', 36, 12, 1200, 0),
  ('kamala', 'เบียร์ช้าง', 'Chang beer', 'count', 24, 8, 4500, 0),
  ('kamala', 'สบู่', 'Soap bars', 'count', 40, 10, 800, 0),
  ('kamala', 'แชมพูซอง', 'Shampoo sachets', 'count', 60, 15, 500, 0),
  ('kamala', 'กระดาษทิชชู่', 'Tissue packs', 'count', 30, 8, 2500, 0),
  ('kamala', 'ไข่ไก่เพิ่ม', 'Extra eggs crate', 'count', 60, 24, 150, 0),
  ('kamala', 'มะเขือเทศ', 'Tomatoes', 'grams', 3000, 800, 5, 0),
  ('kamala', 'หอมหัวใหญ่', 'Onions', 'grams', 4000, 1000, 3, 0),
  ('kamala', 'กระเทียม', 'Garlic', 'grams', 1500, 400, 8, 0),
  ('kamala', 'น้ำมันพืช', 'Cooking oil', 'ml', 4000, 1000, 2, 0)
on conflict (property_id, name_en) do nothing;

insert into public.desk_sellable_items (
  property_id, name_th, name_en, category, price_satang, cost_satang, minimum, active
)
values
  ('kamala', 'ชาเย็น', 'Iced tea', 'drink', 4500, 1200, 0, true),
  ('kamala', 'กาแฟเย็น', 'Iced coffee', 'drink', 6500, 1800, 0, true),
  ('kamala', 'น้ำส้มคั้น', 'Fresh orange juice', 'drink', 8000, 3500, 0, true),
  ('kamala', 'โค้กกระป๋อง', 'Coke can', 'drink', 3500, 1200, 0, true),
  ('kamala', 'เบียร์ช้าง', 'Chang beer', 'drink', 9000, 4500, 0, true),
  ('kamala', 'น้ำมะนาว', 'Lime soda', 'drink', 5500, 1500, 0, true),
  ('kamala', 'สมูทตี้กล้วย', 'Banana smoothie', 'drink', 9000, 2800, 0, true),
  ('kamala', 'ไข่เจียว', 'Omelette', 'food', 8000, 2500, 0, true),
  ('kamala', 'แพนเค้ก', 'Pancakes', 'food', 12000, 3500, 0, true),
  ('kamala', 'โจ๊ก', 'Rice porridge', 'food', 7000, 2000, 0, true),
  ('kamala', 'ผัดไทย', 'Pad Thai', 'food', 14000, 4500, 0, true),
  ('kamala', 'ผัดกระเพรา', 'Basil stir-fry', 'food', 13000, 4200, 0, true),
  ('kamala', 'ต้มยำกุ้ง', 'Tom Yum soup', 'food', 16000, 5500, 0, true),
  ('kamala', 'สลัดสวน', 'Garden salad', 'food', 11000, 3200, 0, true),
  ('kamala', 'ขนมปังปิ้ง', 'Toast set', 'food', 6000, 1800, 0, true),
  ('kamala', 'ผลไม้รวม', 'Fruit plate', 'food', 10000, 4000, 0, true),
  ('kamala', 'มาม่า', 'Instant noodles', 'food', 5000, 1500, 0, true),
  ('kamala', 'ห้องพักคืน', 'Room night', 'room', 0, 0, 0, true),
  ('kamala', 'ผ้าเช็ดตัวเพิ่ม', 'Extra towel', 'extra', 5000, 1000, 0, true),
  ('kamala', 'หมอนเพิ่ม', 'Extra pillow', 'extra', 3000, 800, 0, true),
  ('kamala', 'ผ้าห่มเพิ่ม', 'Extra blanket', 'extra', 8000, 2000, 0, true),
  ('kamala', 'ที่ชาร์จ', 'Phone charger loan', 'extra', 0, 0, 0, true),
  ('kamala', 'จักรยานครึ่งวัน', 'Bike half-day', 'extra', 15000, 0, 0, true),
  ('kamala', 'จักรยานเต็มวัน', 'Bike full-day', 'extra', 25000, 0, 0, true),
  ('kamala', 'รถรับส่งสนามบิน', 'Airport transfer', 'extra', 40000, 0, 0, true),
  ('kamala', 'ทัวร์เมืองเก่า', 'Old City tour', 'extra', 80000, 0, 0, true),
  ('kamala', 'นวดไทย 1 ชม.', 'Thai massage 1h', 'extra', 45000, 0, 0, true),
  ('kamala', 'น้ำดื่มห้อง', 'In-room water', 'extra', 0, 800, 0, true)
on conflict (property_id, name_en) do update
set
  category = excluded.category,
  price_satang = excluded.price_satang,
  cost_satang = excluded.cost_satang,
  active = true,
  updated_at = now();
