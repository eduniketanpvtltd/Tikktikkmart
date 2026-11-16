-- Core schema from TikTikMart_Plan.md section 10.2
create extension if not exists postgis;
create extension if not exists pg_trgm;
create extension if not exists pgcrypto;
create extension if not exists pg_cron;

-- immutable wrapper so it can be used in a generated column
create or replace function product_search_text(n text, b text, t text[]) returns tsvector
language sql immutable parallel safe as $$
  select to_tsvector('simple', coalesce(n,'')||' '||coalesce(b,'')||' '||coalesce(array_to_string(t,' '),''))
$$;

create type user_role as enum ('customer','rider','store_manager','admin','super_admin');
create type order_status as enum (
  'placed','payment_pending','confirmed','accepted_by_store','picking','packed',
  'rider_assigned','rider_at_store','picked_up','out_for_delivery','arrived','delivered',
  'cancelled','rejected_by_store','payment_failed','delivery_failed','refunded');
create type payment_method as enum ('online','cod');
create type payment_status as enum ('created','authorized','captured','failed','refunded','partially_refunded');

-- USERS (firebase_uid is the link to Firebase Auth)
create table users (
  id uuid primary key default gen_random_uuid(),
  firebase_uid text unique not null,
  email text unique not null,
  name text,
  phone text,
  photo_url text,
  role user_role not null default 'customer',
  is_blocked boolean default false,
  fcm_tokens text[] default '{}',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table addresses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete cascade,
  label text,                       -- Home / Work / Other
  receiver_name text, receiver_phone text,
  line1 text not null, line2 text, landmark text,
  city text, state text, pincode text,
  location geography(Point,4326) not null,
  place_id text,
  is_default boolean default false,
  created_at timestamptz default now()
);
create index on addresses using gist(location);

-- STORES
create table stores (
  id uuid primary key default gen_random_uuid(),
  name text not null, code text unique,
  address text, phone text,
  location geography(Point,4326) not null,
  service_area geography(Polygon,4326),     -- optional exact zone
  service_radius_m int default 3000,        -- fallback if no polygon
  is_active boolean default true,
  is_accepting_orders boolean default true,
  prep_time_min int default 5,
  opens_at time, closes_at time,
  created_at timestamptz default now()
);
create index on stores using gist(location);
create index on stores using gist(service_area);

create table store_staff (
  store_id uuid references stores(id) on delete cascade,
  user_id uuid references users(id) on delete cascade,
  primary key (store_id, user_id)
);

-- CATALOG
create table categories (
  id uuid primary key default gen_random_uuid(),
  parent_id uuid references categories(id),
  name text not null, slug text unique not null,
  image_url text, sort_order int default 0, is_active boolean default true
);

create table products (
  id uuid primary key default gen_random_uuid(),
  category_id uuid references categories(id),
  name text not null, slug text unique not null,
  brand text, description text,
  images text[] default '{}',
  tags text[] default '{}',
  hsn_code text, gst_rate numeric(4,2) default 0,
  is_active boolean default true,
  search tsvector generated always as (
    product_search_text(name, brand, tags)
  ) stored,
  created_at timestamptz default now()
);
create index on products using gin(search);
create index on products using gin(name gin_trgm_ops);

create table product_variants (          -- pack sizes: 500 g, 1 kg ...
  id uuid primary key default gen_random_uuid(),
  product_id uuid references products(id) on delete cascade,
  label text not null,                   -- "500 g"
  sku text unique, barcode text,
  mrp numeric(10,2) not null,
  base_price numeric(10,2) not null,     -- default selling price
  max_qty_per_order int default 10,
  is_active boolean default true
);

create table store_inventory (
  store_id uuid references stores(id) on delete cascade,
  variant_id uuid references product_variants(id) on delete cascade,
  quantity int not null default 0 check (quantity >= 0),
  reserved int not null default 0 check (reserved >= 0),
  price_override numeric(10,2),
  rack_location text,
  is_available boolean default true,
  low_stock_threshold int default 5,
  updated_at timestamptz default now(),
  primary key (store_id, variant_id)
);

create table inventory_movements (
  id bigserial primary key,
  store_id uuid, variant_id uuid,
  delta int not null,
  reason text not null,                  -- 'grn','order_reserve','order_release','order_commit','manual','damage'
  ref_id uuid, actor_id uuid,
  created_at timestamptz default now()
);

-- CART (server-side so it survives devices)
create table carts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique references users(id) on delete cascade,
  store_id uuid references stores(id),
  coupon_code text,
  updated_at timestamptz default now()
);
create table cart_items (
  cart_id uuid references carts(id) on delete cascade,
  variant_id uuid references product_variants(id),
  quantity int not null check (quantity > 0),
  primary key (cart_id, variant_id)
);

-- ORDERS
create table orders (
  id uuid primary key default gen_random_uuid(),
  order_no bigint generated always as identity,   -- human number
  user_id uuid references users(id),
  store_id uuid references stores(id),
  rider_id uuid references users(id),
  address_id uuid references addresses(id),
  address_snapshot jsonb not null,                 -- frozen copy
  status order_status not null default 'placed',
  payment_method payment_method not null,
  payment_status payment_status default 'created',
  items_total numeric(10,2), discount numeric(10,2) default 0,
  delivery_fee numeric(10,2) default 0, handling_fee numeric(10,2) default 0,
  small_cart_fee numeric(10,2) default 0, tip numeric(10,2) default 0,
  tax_total numeric(10,2) default 0, grand_total numeric(10,2) not null,
  coupon_code text,
  delivery_otp char(4), pickup_code char(4),
  instructions text,
  distance_m int, eta_minutes int,
  placed_at timestamptz default now(),
  delivered_at timestamptz,
  idempotency_key text unique
);
create index on orders(user_id, placed_at desc);
create index on orders(store_id, status);
create index on orders(rider_id, status);

create table order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references orders(id) on delete cascade,
  variant_id uuid references product_variants(id),
  name_snapshot text, label_snapshot text, image_snapshot text,
  mrp numeric(10,2), unit_price numeric(10,2), gst_rate numeric(4,2),
  quantity int not null, picked_quantity int default 0,
  status text default 'pending'          -- pending / picked / out_of_stock
);

create table order_status_history (
  id bigserial primary key,
  order_id uuid references orders(id) on delete cascade,
  from_status order_status, to_status order_status not null,
  actor_id uuid, actor_role user_role,
  location geography(Point,4326), note text,
  created_at timestamptz default now()
);

-- PAYMENTS
create table payments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references orders(id),
  razorpay_order_id text unique, razorpay_payment_id text unique,
  razorpay_signature text,
  amount numeric(10,2) not null, currency text default 'INR',
  status payment_status default 'created',
  method text, raw jsonb,
  created_at timestamptz default now()
);
create table refunds (
  id uuid primary key default gen_random_uuid(),
  payment_id uuid references payments(id), order_id uuid references orders(id),
  razorpay_refund_id text unique, amount numeric(10,2), reason text,
  status text, created_at timestamptz default now()
);
create table webhook_events (            -- idempotency for Razorpay webhooks
  event_id text primary key, type text, payload jsonb, processed_at timestamptz default now()
);

-- RIDERS
create table rider_profiles (
  user_id uuid primary key references users(id) on delete cascade,
  kyc_status text default 'pending',     -- pending / approved / rejected / suspended
  vehicle_type text, vehicle_no text,
  license_no text, id_proof_type text, id_proof_no text,
  doc_urls jsonb default '{}',           -- Firebase Storage paths
  payout_upi text, bank_account jsonb,
  is_online boolean default false,
  on_delivery boolean default false,
  cod_balance numeric(10,2) default 0,
  rating numeric(3,2) default 5,
  home_store_id uuid references stores(id)
);
create table rider_locations (
  rider_id uuid primary key references users(id) on delete cascade,
  location geography(Point,4326), heading real, speed real,
  updated_at timestamptz default now()
);
create index on rider_locations using gist(location);

create table rider_assignments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references orders(id), rider_id uuid references users(id),
  status text,                           -- offered / accepted / rejected / expired / cancelled
  offered_at timestamptz default now(), responded_at timestamptz,
  payout numeric(10,2)
);
create table rider_payouts (
  id uuid primary key default gen_random_uuid(),
  rider_id uuid references users(id),
  period_start date, period_end date,
  deliveries int, base numeric(10,2), incentives numeric(10,2), tips numeric(10,2),
  cod_deduction numeric(10,2), net numeric(10,2),
  status text default 'pending', paid_at timestamptz, reference text
);
create table cash_deposits (
  id uuid primary key default gen_random_uuid(),
  rider_id uuid references users(id), store_id uuid references stores(id),
  amount numeric(10,2), received_by uuid references users(id), created_at timestamptz default now()
);

-- MARKETING & CONFIG
create table coupons (
  id uuid primary key default gen_random_uuid(),
  code text unique not null, description text,
  type text check (type in ('flat','percent')), value numeric(10,2),
  max_discount numeric(10,2), min_order numeric(10,2) default 0,
  first_order_only boolean default false,
  usage_limit int, per_user_limit int default 1,
  store_ids uuid[], category_ids uuid[],
  starts_at timestamptz, ends_at timestamptz, is_active boolean default true
);
create table coupon_redemptions (
  id uuid primary key default gen_random_uuid(),
  coupon_id uuid references coupons(id), user_id uuid references users(id),
  order_id uuid references orders(id), amount numeric(10,2), created_at timestamptz default now()
);
create table banners (
  id uuid primary key default gen_random_uuid(),
  image_url text not null, link_type text, link_value text,
  store_id uuid references stores(id), sort_order int default 0,
  starts_at timestamptz, ends_at timestamptz, is_active boolean default true
);
create table collections (            -- home shelves
  id uuid primary key default gen_random_uuid(),
  title text, rule jsonb, product_ids uuid[], sort_order int, is_active boolean default true
);
create table fee_slabs (
  id serial primary key, min_distance_m int, max_distance_m int, fee numeric(10,2),
  free_above numeric(10,2)
);
create table app_settings (key text primary key, value jsonb, updated_at timestamptz default now());
create table notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id), title text, body text, data jsonb,
  read_at timestamptz, created_at timestamptz default now()
);
create table audit_logs (
  id bigserial primary key, actor_id uuid, action text, entity text, entity_id text,
  before jsonb, after jsonb, ip inet, created_at timestamptz default now()
);
