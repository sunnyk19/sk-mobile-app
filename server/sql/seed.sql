INSERT INTO categories (name, description) VALUES
  ('Cases', 'Protective covers for everyday use'),
  ('Audio', 'Earphones and wireless audio'),
  ('Power', 'Chargers, cables and power accessories');

INSERT INTO products (category_id, name, brand, sku, description, price, mrp, stock_quantity, warranty_days, image_url) VALUES
  (1, 'Barely There Case', 'Native Union', 'CASE-001', 'Slim, grippy protection for everyday carry.', 799, 999, 24, 90, 'https://images.unsplash.com/photo-1601593346740-925612772716?auto=format&fit=crop&w=900&q=82'),
  (1, 'Everyday Silicone Case', 'Caseology', 'CASE-002', 'Soft-touch silicone with extra drop protection.', 1099, 1399, 18, 90, 'https://images.unsplash.com/photo-1603313011108-4dbaee4a7d16?auto=format&fit=crop&w=900&q=82'),
  (2, 'Everyday Wireless Buds', 'Soundcore', 'AUDIO-001', 'Wireless earbuds with clear calls and pocket case.', 2499, 2999, 12, 365, 'https://images.unsplash.com/photo-1606220945770-b5b6c2c55bf1?auto=format&fit=crop&w=900&q=82'),
  (3, '20W Fast Charger', 'Anker', 'POWER-001', 'Compact 20W USB-C fast charger.', 1199, 1499, 20, 365, 'https://images.unsplash.com/photo-1583863788434-e58a36330cf0?auto=format&fit=crop&w=900&q=82'),
  (3, 'Shield Tempered Glass', 'Belkin', 'POWER-002', 'Scratch-resistant tempered glass screen protector.', 599, 799, 30, 30, 'https://images.unsplash.com/photo-1512499617640-c74ae3a79d37?auto=format&fit=crop&w=900&q=82'),
  (3, 'Braided USB-C Cable', 'Native Union', 'POWER-003', 'Durable 1.5 metre braided USB-C cable.', 499, 699, 35, 180, 'https://images.unsplash.com/photo-1609592806596-b43bada0f7a8?auto=format&fit=crop&w=900&q=82');

INSERT INTO repair_services (name, description, estimated_price, estimated_time_hours) VALUES
  ('Screen replacement', 'Display and touch-screen replacement.', 1499, 4),
  ('Battery replacement', 'Battery health check and replacement.', 899, 3),
  ('Charging problem', 'Charging port, cable and power diagnosis.', 599, 5),
  ('Speaker problem', 'Speaker cleaning and component repair.', 799, 5),
  ('Microphone problem', 'Microphone diagnosis and replacement.', 799, 5),
  ('Camera problem', 'Camera module and focus repair.', 999, 6),
  ('Software problem', 'Software diagnostics and recovery.', 499, 3),
  ('Water damage', 'Liquid damage inspection and board cleaning.', 999, 24),
  ('Back glass replacement', 'Rear glass replacement.', 1299, 8),
  ('Network problem', 'Signal and antenna diagnosis.', 799, 8),
  ('Motherboard repair', 'Board-level diagnostics and repair.', 1499, 24),
  ('Other / custom problem', 'Inspection for other device issues.', 499, 24);

INSERT INTO offers (name, description, discount_type, discount_value, start_date, end_date, minimum_order_amount, is_active) VALUES
  ('Welcome to SK Mobiles', '10% off eligible accessory orders with FIX10.', 'PERCENT', 10, '2026-01-01 00:00:00', '2027-12-31 23:59:59', 499, TRUE);

INSERT INTO coupons (offer_id, code, usage_limit, is_active)
SELECT id, 'FIX10', 1000, TRUE FROM offers WHERE name = 'Welcome to SK Mobiles';