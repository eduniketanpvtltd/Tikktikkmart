-- Sample seed data for TikTikMart (pilot dark store in Kolkata + grocery catalog)
-- Run in Supabase SQL Editor after 0001, 0002, 0003 migrations.

insert into stores (id, name, code, address, phone, location, service_radius_m, is_active, is_accepting_orders, prep_time_min)
values (
  '11111111-1111-1111-1111-111111111111',
  'TikTikMart Park Street Dark Store',
  'KOL-PS-01',
  '45 Park Street, Kolkata 700016',
  '+919800000001',
  st_point(88.3639, 22.5726)::geography,
  15000,
  true,
  true,
  6
) on conflict (code) do nothing;

insert into categories (id, name, slug, image_url, sort_order) values
  ('22222222-2222-2222-2222-222222222201', 'Vegetables & Fruits', 'vegetables-fruits', 'https://images.unsplash.com/photo-1610832958506-aa56368176cf?w=300', 1),
  ('22222222-2222-2222-2222-222222222202', 'Dairy, Bread & Eggs', 'dairy-bread-eggs', 'https://images.unsplash.com/photo-1550583724-b2692b85b150?w=300', 2),
  ('22222222-2222-2222-2222-222222222203', 'Munchies & Snacks', 'munchies-snacks', 'https://images.unsplash.com/photo-1599490659213-e2b9527bd087?w=300', 3),
  ('22222222-2222-2222-2222-222222222204', 'Cold Drinks & Juices', 'cold-drinks-juices', 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=300', 4),
  ('22222222-2222-2222-2222-222222222205', 'Atta, Rice & Dal', 'atta-rice-dal', 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=300', 5),
  ('22222222-2222-2222-2222-222222222206', 'Instant & Frozen', 'instant-frozen', 'https://images.unsplash.com/photo-1612929633738-8fe44f7ec841?w=300', 6)
on conflict (slug) do nothing;

insert into products (id, category_id, name, slug, brand, description, images, tags, gst_rate) values
  ('33333333-3333-3333-3333-333333333301', '22222222-2222-2222-2222-222222222201', 'Fresh Hybrid Tomato', 'fresh-hybrid-tomato', 'FarmFresh', 'Juicy red tomatoes sourced daily', array['https://images.unsplash.com/photo-1546470427-e26264be0b0d?w=400'], array['vegetable','tomato','fresh'], 0),
  ('33333333-3333-3333-3333-333333333302', '22222222-2222-2222-2222-222222222201', 'Cavendish Banana', 'cavendish-banana', 'FarmFresh', 'Naturally ripened sweet bananas', array['https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?w=400'], array['fruit','banana'], 0),
  ('33333333-3333-3333-3333-333333333303', '22222222-2222-2222-2222-222222222202', 'Amul Taaza Toned Milk', 'amul-taaza-milk', 'Amul', 'Pasteurised toned milk', array['https://images.unsplash.com/photo-1563636619-e9143da7973b?w=400'], array['milk','dairy','amul'], 0),
  ('33333333-3333-3333-3333-333333333304', '22222222-2222-2222-2222-222222222202', 'Brown Sandwich Bread', 'brown-sandwich-bread', 'Modern', 'Soft whole wheat brown bread', array['https://images.unsplash.com/photo-1509440159596-0249088772ff?w=400'], array['bread','bakery'], 5),
  ('33333333-3333-3333-3333-333333333305', '22222222-2222-2222-2222-222222222203', 'Lay''s Classic Salted Chips', 'lays-classic-salted', 'Lay''s', 'Crispy salted potato chips', array['https://images.unsplash.com/photo-1566478989037-eec170784d0b?w=400'], array['chips','snacks','lays'], 12),
  ('33333333-3333-3333-3333-333333333306', '22222222-2222-2222-2222-222222222204', 'Coca-Cola Original', 'coca-cola-original', 'Coca-Cola', 'Chilled refreshing cola', array['https://images.unsplash.com/photo-1554866585-cd94860890b7?w=400'], array['cola','drink','cold'], 28),
  ('33333333-3333-3333-3333-333333333307', '22222222-2222-2222-2222-222222222205', 'Aashirvaad Shudh Chakki Atta', 'aashirvaad-atta', 'Aashirvaad', '100% whole wheat flour', array['https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?w=400'], array['atta','flour','staples'], 0),
  ('33333333-3333-3333-3333-333333333308', '22222222-2222-2222-2222-222222222206', 'Maggi 2-Minute Masala Noodles', 'maggi-masala-noodles', 'Maggi', 'India''s favourite masala noodles', array['https://images.unsplash.com/photo-1612929633738-8fe44f7ec841?w=400'], array['noodles','maggi','instant'], 12)
on conflict (slug) do nothing;

insert into product_variants (id, product_id, label, sku, barcode, mrp, base_price) values
  ('44444444-4444-4444-4444-444444444401', '33333333-3333-3333-3333-333333333301', '500 g', 'TOM-500', '8901000001', 40, 29),
  ('44444444-4444-4444-4444-444444444402', '33333333-3333-3333-3333-333333333302', '6 pcs', 'BAN-6PC', '8901000002', 55, 42),
  ('44444444-4444-4444-4444-444444444403', '33333333-3333-3333-3333-333333333303', '500 ml', 'MILK-500', '8901000003', 28, 27),
  ('44444444-4444-4444-4444-444444444404', '33333333-3333-3333-3333-333333333304', '400 g', 'BREAD-400', '8901000004', 50, 45),
  ('44444444-4444-4444-4444-444444444405', '33333333-3333-3333-3333-333333333305', '50 g', 'LAYS-50', '8901000005', 20, 20),
  ('44444444-4444-4444-4444-444444444406', '33333333-3333-3333-3333-333333333306', '750 ml', 'COKE-750', '8901000006', 45, 40),
  ('44444444-4444-4444-4444-444444444407', '33333333-3333-3333-3333-333333333307', '5 kg', 'ATTA-5KG', '8901000007', 295, 249),
  ('44444444-4444-4444-4444-444444444408', '33333333-3333-3333-3333-333333333308', '4 x 70 g', 'MAGGI-4PK', '8901000008', 60, 56)
on conflict (sku) do nothing;

insert into store_inventory (store_id, variant_id, quantity, rack_location, is_available)
select '11111111-1111-1111-1111-111111111111', id, 50, 'A-' || row_number() over (), true
from product_variants
on conflict (store_id, variant_id) do nothing;

insert into fee_slabs (min_distance_m, max_distance_m, fee, free_above)
values (0, 3000, 25, 199), (3001, 15000, 39, 399)
on conflict do nothing;

insert into coupons (code, description, type, value, max_discount, min_order, per_user_limit, is_active)
values ('WELCOME50', 'Flat ₹50 off on orders above ₹199', 'flat', 50, 50, 199, 5, true)
on conflict (code) do nothing;

insert into banners (image_url, link_type, link_value, sort_order, is_active)
values
  ('https://images.unsplash.com/photo-1542838132-92c53300491e?w=1200', 'category', 'vegetables-fruits', 1, true),
  ('https://images.unsplash.com/photo-1604719312566-8912e9227c6a?w=1200', 'category', 'dairy-bread-eggs', 2, true)
on conflict do nothing;

