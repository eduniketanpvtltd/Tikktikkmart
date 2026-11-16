# TikTikMart — Complete Product & Technical Plan

> Quick-commerce (10–20 min grocery/essentials delivery) platform modelled on Blinkit.
> Four interfaces: **Customer**, **Rider**, **Store (dark store)**, **Admin**.
> Stack: **Next.js** · **Supabase Postgres** · **Firebase (Google Login + Storage)** · **Google Maps Platform** · **Razorpay**

Items marked **[ASSUMPTION]** are defaults I chose. Confirm or change them in Section 20 (Open Questions).

---

## 1. Product Vision & Scope

### 1.1 What we are building
A hyperlocal delivery app. Inventory is held in small nearby **dark stores**. A customer's address decides which store serves them. Orders are picked and packed at the store, then a **rider** delivers within minutes.

### 1.2 Core principles
1. **Store-centric inventory**: stock is per store, not global.
2. **Serviceability by location**: a customer sees only what their nearest serving store has.
3. **Speed**: every flow (browse → pay → pick → pack → assign → deliver) is optimised for minutes, not hours.
4. **One codebase, four surfaces**: a single Next.js app with role-based route groups.

### 1.3 In scope (MVP)
- Google login for all roles
- Location-based store matching
- Catalog, search, cart, checkout
- Razorpay online payment + Cash on Delivery (COD) **[ASSUMPTION]**
- Store order picking/packing and inventory management
- Rider assignment, delivery, live tracking
- Admin control of everything (stores, riders, catalog, pricing, coupons, payouts, reports)

### 1.4 Out of scope for MVP (Phase 2+)
- Native mobile apps (we ship PWAs first)
- Multi-language
- Subscriptions / membership
- Scheduled delivery
- Warehouse/vendor purchase-order management
- Loyalty points

---

## 2. User Roles

| Role | Who | Auth | Main surface |
|---|---|---|---|
| `customer` | Shoppers | Google login (self sign-up) | `/` (mobile-first PWA) |
| `rider` | Delivery partners | Google login + admin approval | `/rider` |
| `store_manager` | Dark store staff | Google login, invited by admin | `/store` |
| `admin` | TikTikMart ops | Google login, allow-listed emails | `/admin` |
| `super_admin` | Owner (you) | Allow-listed | `/admin` + settings |

Role is stored in Postgres (`users.role`) and mirrored into Firebase **custom claims** so every request can be authorised quickly.

---

## 3. High-Level Architecture

```
┌────────────────────────────── Next.js (App Router, Vercel) ──────────────────────────────┐
│  (customer) pages   /rider   /store   /admin      API Route Handlers (/api/*)            │
└───────┬───────────────┬──────────┬─────────┬───────────────────┬─────────────────────────┘
        │               │          │         │                   │
   Firebase Auth   Firebase     Google     Razorpay          Supabase
   (Google login)  Storage      Maps       (Orders,          Postgres + PostGIS
   + custom claims (images)     (JS API,   Webhooks,         + Realtime (live tracking,
                                Places,    Refunds)          order status)
                                Routes)
```

### 3.1 Why this split
- **Firebase Auth**: Google login is simple and reliable; custom claims carry the role.
- **Firebase Storage**: product/banner/category images, rider & store documents, delivery proofs.
- **Supabase Postgres**: relational data, transactions (critical for stock + orders), PostGIS for geo queries.
- **Supabase Realtime**: push order status and rider location to clients without running our own WebSocket server.
- **Next.js API routes**: the only trusted layer. All writes pass through here.

### 3.2 How Firebase Auth and Supabase work together (important)
Two valid options:

**Option A (recommended for MVP) — Server-mediated access**
1. Client signs in with Google via Firebase → gets a Firebase **ID token**.
2. Client sends `Authorization: Bearer <idToken>` to Next.js APIs.
3. API verifies the token using `firebase-admin`, loads `users` row, checks role.
4. API talks to Supabase using the **service role key** (server only, never exposed).
5. Realtime subscriptions use a short-lived Supabase JWT minted by our API (see 3.3).

Pros: simple, secure, no RLS complexity for writes.

**Option B — Supabase third-party auth with Firebase**
Supabase can accept Firebase ID tokens directly, which lets you use RLS with `auth.jwt()` claims. More elegant but more setup. Can migrate to this later.

### 3.3 Realtime security
Supabase Realtime needs an authenticated client to read live data. Approach:
- API endpoint `POST /api/realtime/token` verifies the Firebase token and returns a **Supabase JWT** (signed with the project JWT secret) containing `sub = user_id` and `role = authenticated`.
- RLS `SELECT` policies on `orders`, `rider_locations` ensure customers see only their own order, riders their assigned order, stores their own store orders.
- Prefer **Broadcast channels** (`order:{id}`, `store:{id}`, `rider:{id}`) for high-frequency location data to avoid DB writes on every ping.

### 3.4 Important platform notes
- **Firebase Storage** now requires the **Blaze (pay-as-you-go)** plan for new buckets. Free-tier usage limits still apply inside Blaze, so cost is typically near zero at low volume, but a billing account is required.
- **Rider location in a PWA**: browsers do not reliably track location when the app is in the background or the screen is locked. For MVP use a PWA with Screen Wake Lock (screen stays on during delivery). For production, wrap the rider app with **Capacitor** or build React Native later. This is the single biggest technical risk (see Section 19).

---

## 4. Tech Stack Details

| Concern | Choice | Notes |
|---|---|---|
| Framework | Next.js 15 (App Router) + TypeScript | Route groups per role |
| UI | Tailwind CSS + shadcn/ui | Mobile-first for customer/rider, dense tables for admin/store |
| State | TanStack Query + Zustand (cart) | Cart persisted locally, synced to DB when logged in |
| Forms/validation | React Hook Form + Zod | Same Zod schemas on API |
| DB access | Supabase JS client (server) or Drizzle/Prisma on Supabase connection string | **[ASSUMPTION]** Supabase JS + SQL migrations, RPC functions for transactional logic |
| Auth | Firebase Auth (Google provider) + `firebase-admin` | Custom claims for role |
| Storage | Firebase Storage | Signed upload via client SDK with storage rules; public read for catalog images |
| Maps | Google Maps JS API, Places API (New), Geocoding, Routes API | See Section 12 |
| Payments | Razorpay Orders + Checkout + Webhooks | See Section 11 |
| Push | Firebase Cloud Messaging (web push) | Order updates, rider new-order alerts |
| Hosting | Vercel (Next.js) | Cron via Vercel Cron |
| Monitoring | Sentry + Vercel Analytics | |
| PWA | `next-pwa` / Serwist | Installable customer + rider apps |

---

## 5. Order Lifecycle (State Machine)

```
PLACED ─► PAYMENT_PENDING ─► CONFIRMED ─► ACCEPTED_BY_STORE ─► PICKING ─► PACKED
                                                                          │
                      ┌───────────────────────────────────────────────────┘
                      ▼
              RIDER_ASSIGNED ─► RIDER_AT_STORE ─► PICKED_UP ─► OUT_FOR_DELIVERY ─► ARRIVED ─► DELIVERED
                                                                                         
Terminal side exits: CANCELLED, REJECTED_BY_STORE, PAYMENT_FAILED, DELIVERY_FAILED, REFUNDED
```

### 5.1 Transition rules
| From | To | Who | Condition |
|---|---|---|---|
| — | PLACED | system | Cart validated, stock reserved |
| PLACED | PAYMENT_PENDING | system | Online payment chosen |
| PAYMENT_PENDING | CONFIRMED | webhook | Razorpay `payment.captured` verified |
| PLACED | CONFIRMED | system | COD chosen |
| CONFIRMED | ACCEPTED_BY_STORE | store | Auto-accept or manual within 60s **[ASSUMPTION: auto-accept ON, manual toggle]** |
| ACCEPTED_BY_STORE | PICKING | store | Picker starts |
| PICKING | PACKED | store | All items picked or substituted/removed |
| PACKED | RIDER_ASSIGNED | system/admin | Rider accepts |
| RIDER_ASSIGNED | RIDER_AT_STORE | rider | Geofence or manual tap |
| RIDER_AT_STORE | PICKED_UP | rider | Store verifies handover (OTP/QR) |
| PICKED_UP | OUT_FOR_DELIVERY | rider | Auto |
| OUT_FOR_DELIVERY | ARRIVED | rider | Within 50 m or manual |
| ARRIVED | DELIVERED | rider | Delivery OTP verified (+ COD cash collected) |

Each transition writes a row in `order_status_history` (who, when, location, note). Illegal transitions are rejected by a single server function `transition_order(order_id, to_status, actor)`.

### 5.2 Timeouts (run by cron / pg_cron)
- Payment pending > 10 min → `PAYMENT_FAILED`, release stock.
- Store doesn't accept within 2 min → auto-reassign to the next nearest store or cancel.
- No rider accepts within 3 min → widen search radius, then alert admin.

---

## 6. Interface 1 — Customer App (`/`)

### 6.1 Screens
1. **Splash / Onboarding** → permission prompts (location).
2. **Login** — "Continue with Google". First login asks for phone number (needed by riders/OTP) **[ASSUMPTION: collect phone manually without SMS verification in MVP]**.
3. **Location picker** — GPS detect, Google Places autocomplete, draggable map pin, saved addresses. Shows "Delivery in X mins" or "We're not here yet" if not serviceable.
4. **Home**
   - Delivery ETA + address header
   - Search bar
   - Banner carousel (admin-managed)
   - Category grid
   - Product shelves (Best sellers, Dairy, Fruits, Offers…)
   - Floating cart bar ("2 items · ₹148 · View cart")
5. **Category / Subcategory listing** — left rail subcategories, product grid right (Blinkit style).
6. **Search** — debounced, typo-tolerant (Postgres `pg_trgm` + `tsvector`), recent searches, trending.
7. **Product detail** — images, variants/pack size, price/MRP/discount, description, "Add" stepper, similar products.
8. **Cart** — items, quantity change, coupon, bill breakdown, delivery tip, "Add instructions", unavailable-item warnings.
9. **Checkout** — address, payment method (UPI / Card / Netbanking via Razorpay, COD), place order.
10. **Order tracking** — live map, rider details, ETA, status timeline, call rider (masked number is Phase 2; direct call in MVP), delivery OTP shown.
11. **Orders list & order detail** — reorder, invoice download, help/report issue.
12. **Profile** — addresses, support, terms, logout.

### 6.2 Key behaviours
- **Store resolution**: on every location change call `GET /api/serviceability?lat&lng`. Server finds stores whose delivery radius/polygon contains the point and picks the nearest *open* one with stock capacity. Result cached in client state; cart is tied to that `store_id`.
- **Changing address** to a different store's zone → warn "Some items may be unavailable", revalidate cart.
- **Stock-aware UI**: out-of-stock items greyed with "Notify me" (Phase 2).
- **Price source of truth is the server**. Client totals are display only.
- **Cart limits**: max qty per product (admin configurable), max items per order.
- **Minimum order value** and **free-delivery threshold** (admin configurable).

### 6.3 Bill breakdown
```
Items total (MRP − discount)
+ Delivery fee   (distance/time slab, free above threshold)
+ Handling fee   (flat)
+ Small cart fee (if below min cart value)
+ Rider tip      (optional)
− Coupon discount
+ GST            (per item tax rate, shown inclusive in item prices **[ASSUMPTION]**)
= Grand total
```

---

## 7. Interface 2 — Rider App (`/rider`)

### 7.1 Screens
1. **Login + onboarding** — Google login → KYC form: name, phone, vehicle type & number, driving licence, Aadhaar/ID, photo, bank/UPI details. Files go to Firebase Storage (private path). Status: `pending → approved / rejected` by admin.
2. **Home (Go Online/Offline toggle)** — shift status, today's earnings, completed orders, incentive progress.
3. **New order alert** — full-screen card with pickup store, drop distance, estimated payout, 30-second countdown, Accept/Reject. Plays sound + push notification.
4. **Active delivery** (stepper)
   1. Navigate to store (opens Google Maps navigation deep link + in-app route)
   2. Arrived at store → show order ID, item count, bag checklist
   3. Pickup confirmed (store scans rider QR / enters pickup code)
   4. Navigate to customer
   5. Arrived → customer phone/call button
   6. Enter **delivery OTP** → Delivered
   7. COD: "Collect ₹X cash" confirmation step
5. **Earnings** — per-delivery payout, daily/weekly totals, tips, incentives, COD cash in hand (to deposit), payout history.
6. **Order history**
7. **Profile & documents**, support.

### 7.2 Behaviours
- While online, the app sends location every **5–10 s** (throttled by movement > 15 m) to a Supabase **Broadcast** channel and writes a **last-known** row to `rider_locations` every ~30 s for dispatch queries.
- **Wake Lock** keeps screen on during active delivery (PWA limitation, see 3.4).
- Auto-offline after 10 min of no heartbeat.
- A rider can hold **1 active order** in MVP (batching = Phase 2).
- Cancel after accepting requires a reason and affects rider score.

### 7.3 Rider payout model **[ASSUMPTION]**
`payout = base_fee + distance_km × per_km_rate + peak/rain bonus + tip` — all editable by admin. COD cash tracked as `cod_balance` that the rider must deposit at the store/admin; settlements recorded in `cash_deposits`.

---

## 8. Interface 3 — Store App (`/store`)

Used on a tablet/desktop at the dark store.

### 8.1 Screens
1. **Live orders board** (Kanban): `New` · `Picking` · `Packed (waiting rider)` · `Handed over`. Audible alert on new order. Each card: order #, items count, age timer (red after SLA), customer area, payment mode.
2. **Order picking view** — item list sorted by **rack/aisle location**, image, qty, barcode scan (camera/USB scanner) to confirm each item. Actions: *Mark picked*, *Out of stock* (removes item, recalculates bill, partial refund if prepaid), *Suggest substitute* (Phase 2).
3. **Packing & handover** — Print label/invoice, "Mark packed", show **pickup code / QR** for rider verification.
4. **Inventory**
   - Searchable stock table: product, SKU/barcode, quantity, rack location, store price override (optional), active toggle.
   - Quick adjust (+/−), bulk CSV upload, low-stock alerts, expiry/batch tracking (Phase 2).
   - **Stock-in** (GRN): add received stock with reason; every change logged in `inventory_movements`.
5. **Store status** — Open/Close, pause orders (rush mode), set prep-time buffer.
6. **Reports** — today's orders, avg pick time, cancellations, stock-outs, revenue.
7. **Staff** — list of pickers (Phase 2).

### 8.2 Behaviours
- Realtime subscription to `store:{id}` for new orders.
- Store cannot edit global catalog (name, MRP, images); only stock, availability, and (if allowed) selling price.
- Rider-store handover verified via code to prevent fake pickups.

---

## 9. Interface 4 — Admin Panel (`/admin`)

### 9.1 Modules
| Module | Capabilities |
|---|---|
| **Dashboard** | Live KPIs: orders now, GMV today, avg delivery time, active riders, stores online, cancellation rate; live map of riders & orders; charts |
| **Orders** | Search/filter all orders, view timeline, manually reassign rider/store, cancel, refund, add notes |
| **Catalog** | Categories → Subcategories → Products → Variants (pack sizes); bulk import/export CSV; image upload; tax rate (GST slab), HSN code, brand, tags, MRP, base price |
| **Pricing & Offers** | Coupons (flat/percent, caps, first-order, per-user limits, store/category scope, validity), banners, collections/shelves, delivery fee slabs, handling fee, surge/rain fee |
| **Stores** | Create store, set location, **delivery radius or polygon on map**, opening hours, SLA, assign managers, enable/disable |
| **Riders** | Approve/reject KYC, view documents, suspend, view performance, payouts, COD balances, shifts |
| **Customers** | Profile, addresses, order history, block/unblock, wallet adjustments |
| **Payments** | Razorpay payments list, failed/pending reconcile, refunds, settlement report |
| **Payouts** | Weekly rider payout generation, mark paid, export CSV |
| **Support** | Tickets (Phase 2), refund/complaint log |
| **Notifications** | Send broadcast push, templates |
| **Settings** | Service config, feature flags, admin users & roles, audit log |
| **Reports** | Sales, product performance, store performance, rider performance, coupon usage; CSV export |

### 9.2 Admin safety
- Every admin write is logged to `audit_logs` (who, what, before/after JSON).
- Destructive actions need confirmation.
- `super_admin` only: manage admins, change payment keys/config, hard deletes.

---

## 10. Database Design (Supabase Postgres)

Enable extensions: `postgis`, `pg_trgm`, `pgcrypto`, `pg_cron`.

### 10.1 Entity overview
```
users ──< addresses
users ─── rider_profiles ──< rider_locations, rider_payouts, cash_deposits
users ─── store_staff >── stores ──< store_inventory >── product_variants >── products >── categories
orders >── users, stores, riders, addresses
orders ──< order_items, order_status_history, payments, refunds, rider_assignments
coupons ──< coupon_redemptions
carts ──< cart_items
banners, collections, notifications, audit_logs, app_settings, fee_slabs
```

### 10.2 Schema (SQL — core tables)

```sql
create extension if not exists postgis;
create extension if not exists pg_trgm;
create extension if not exists pgcrypto;

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
    to_tsvector('simple', coalesce(name,'')||' '||coalesce(brand,'')||' '||coalesce(array_to_string(tags,' '),''))
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
```

### 10.3 Critical database functions (SQL / RPC)
All multi-step money/stock logic lives in Postgres functions so it runs in one transaction:

1. **`find_serving_store(lat, lng)`**
   ```sql
   select s.* from stores s
   where s.is_active and s.is_accepting_orders
     and (
       (s.service_area is not null and st_covers(s.service_area, st_point(lng,lat)::geography))
       or (s.service_area is null and st_dwithin(s.location, st_point(lng,lat)::geography, s.service_radius_m))
     )
   order by st_distance(s.location, st_point(lng,lat)::geography) limit 1;
   ```
2. **`place_order(...)`** — inside one transaction: lock inventory rows (`FOR UPDATE`), verify stock, recompute prices server-side, apply coupon, insert `orders`/`order_items`, increment `reserved`, log `inventory_movements`. Fails entirely if any item is short.
3. **`transition_order(order_id, to_status, actor_id, note, loc)`** — validates the state machine, updates order, writes history, and on `delivered` converts `reserved` → decrement `quantity`; on cancel releases `reserved`.
4. **`nearest_available_riders(store_id, radius_m, limit)`** — `rider_locations` joined with `rider_profiles` where `is_online and not on_delivery`, ordered by distance.
5. **`release_expired_reservations()`** — run by `pg_cron` every minute.

### 10.4 Row Level Security (RLS) outline
Enable RLS on all tables.
- `orders`: customer `SELECT` where `user_id = current user`; rider `SELECT` where `rider_id = current user`; store staff `SELECT` where `store_id` in their stores; admin all.
- `rider_locations`: readable only for a rider assigned to the viewer's active order.
- Catalog tables: public `SELECT` for active rows.
- **No client `INSERT/UPDATE` on orders, payments, inventory** — only via server (service role).

---

## 11. Payments — Razorpay

### 11.1 Online payment flow
1. Client calls `POST /api/checkout` with cart + address + method.
2. Server runs `place_order` (stock reserved, status `payment_pending`) and creates a **Razorpay Order** (`amount` in paise, `receipt = order_no`, `notes.order_id`).
3. Server returns `razorpay_order_id`, key id, amount.
4. Client opens **Razorpay Checkout** (UPI intent/collect, cards, netbanking, wallets).
5. On success, client sends `razorpay_payment_id`, `razorpay_order_id`, `razorpay_signature` to `POST /api/payments/verify`.
6. Server verifies HMAC-SHA256 signature: `hmac(order_id + "|" + payment_id, key_secret)` → marks `payments.status=captured`, order → `confirmed`.
7. **Webhook** (`POST /api/webhooks/razorpay`) is the *source of truth* in case the client closes the tab. Verify `X-Razorpay-Signature` with the webhook secret, dedupe via `webhook_events.event_id`.

### 11.2 Webhook events to handle
`payment.captured`, `payment.failed`, `order.paid`, `refund.processed`, `refund.failed`.

### 11.3 COD
Order moves to `confirmed` immediately. Rider collects cash; `rider_profiles.cod_balance` increases on delivery and is cleared via `cash_deposits`. Admin can set a **COD limit** (e.g., ≤ ₹2000) and disable COD for flagged users.

### 11.4 Refunds
- Store marks item out-of-stock after payment → server computes refund delta → Razorpay Refund API (`speed: optimum`) → `refunds` row.
- Cancellation before pick: full refund. After pack: admin discretion.
- COD short-fall: credit to wallet (Phase 2) or no refund.

### 11.5 Safety
- Never trust client amounts; server recomputes.
- Idempotency key on checkout to avoid duplicate orders.
- Test mode keys first; live keys only after KYC activation of your Razorpay account.

---

## 12. Google Maps Platform

### 12.1 APIs used
| API | Used for |
|---|---|
| Maps JavaScript API | Location picker, tracking map, admin zone drawing |
| Places API (New) | Address autocomplete + place details |
| Geocoding API | Lat/lng ↔ address |
| Routes API | Distance, duration, polyline for ETA and rider route |
| Drawing/Geometry library | Draw delivery polygons, distance helpers |

### 12.2 Key rules
- **Two API keys**: a *browser key* restricted by HTTP referrer, and a *server key* restricted by IP/none for server-side Routes calls. Never expose the server key.
- Cache geocoding results and use `sessionToken` for Places autocomplete to cut cost.
- Use straight-line (PostGIS) distance for dispatch ranking; call Routes API only for final ETA to limit cost.
- **Live tracking**: the customer map animates the rider marker between broadcast points (interpolation) and draws the stored route polyline; recompute ETA every ~30 s.
- Billing must be enabled on the Google Cloud project; set budget alerts and quotas.

---

## 13. Dispatch & Rider Assignment

### 13.1 Algorithm (MVP)
When an order reaches `PACKED` (or `PICKING` for pre-assignment to save time **[ASSUMPTION: assign at PICKING start]**):
1. Query `nearest_available_riders(store, 3 km)`.
2. Score = `0.6 × proximity + 0.2 × rating + 0.2 × idle_time`.
3. Offer to the top rider; 30 s to accept (`rider_assignments.status='offered'`).
4. Reject/timeout → next rider. After 5 attempts widen radius to 5 km.
5. Still none → alert admin dashboard, optional manual assign.
6. First accept wins; others get `cancelled` offer.

Implemented as a server function triggered by an API call + retried by cron. Offers delivered via **FCM push + Realtime** broadcast on `rider:{id}`.

### 13.2 Phase 2
Batching two orders, rider zones, surge incentives, auto-rebalancing.

---

## 14. Notifications
| Event | Customer | Rider | Store | Admin |
|---|---|---|---|---|
| Order confirmed | ✔ push | | ✔ sound+push | |
| Store accepted / packed | ✔ | | | |
| Rider assigned / picked up / arriving | ✔ | | | |
| Delivered | ✔ | | | |
| New delivery offer | | ✔ | | |
| Item out of stock | ✔ | | | |
| No rider found / SLA breach | | | | ✔ |
| KYC approved | | ✔ | | |

Channel: **FCM web push** (service worker) + in-app `notifications` table. SMS/WhatsApp optional later.

---

## 15. API Design (Next.js Route Handlers)

Base: `/api`. All except public ones require `Authorization: Bearer <Firebase ID token>`. Responses: `{ ok, data, error }`.

### 15.1 Auth
- `POST /auth/session` — verify token, upsert `users`, set role claims, return profile
- `POST /realtime/token` — Supabase JWT for Realtime

### 15.2 Customer
- `GET /serviceability?lat&lng`
- `GET /home?storeId` · `GET /categories` · `GET /categories/:slug/products`
- `GET /search?q&storeId` · `GET /products/:slug`
- `GET/POST/PATCH/DELETE /addresses`
- `GET /cart` · `PUT /cart/items` · `POST /cart/coupon` · `DELETE /cart/coupon`
- `POST /checkout` (idempotent) · `POST /payments/verify`
- `GET /orders` · `GET /orders/:id` · `POST /orders/:id/cancel`
- `POST /orders/:id/rate`

### 15.3 Rider
- `POST /rider/onboard` · `GET /rider/me`
- `POST /rider/status` (online/offline)
- `POST /rider/location` (batched pings)
- `GET /rider/offers` · `POST /rider/offers/:id/accept|reject`
- `POST /rider/orders/:id/{arrived-store|picked-up|arrived|deliver}`
- `GET /rider/earnings` · `GET /rider/history`

### 15.4 Store
- `GET /store/orders?status=` · `POST /store/orders/:id/{accept|reject|start-picking|pack}`
- `POST /store/orders/:id/items/:itemId/{picked|out-of-stock}`
- `GET/PATCH /store/inventory` · `POST /store/inventory/bulk` · `POST /store/inventory/grn`
- `POST /store/status`

### 15.5 Admin
- CRUD: `/admin/{categories|products|variants|stores|banners|collections|coupons|fee-slabs|settings|admins}`
- `GET /admin/orders` · `POST /admin/orders/:id/{reassign|cancel|refund}`
- `GET /admin/riders` · `POST /admin/riders/:id/{approve|reject|suspend}`
- `GET /admin/payouts` · `POST /admin/payouts/generate` · `POST /admin/payouts/:id/pay`
- `GET /admin/reports/*` · `GET /admin/audit-logs`

### 15.6 Webhooks / Cron
- `POST /webhooks/razorpay`
- `GET /cron/expire-orders` · `/cron/dispatch-retry` · `/cron/release-stock` (Vercel Cron, secured with secret)

### 15.7 Authorisation middleware
```ts
// pseudo
withAuth(['store_manager'], async (req, ctx) => {
  // ctx.user from Firebase token + users table
  // for store routes also assert ctx.user is staff of the target store
})
```
Validation with Zod on every route. Rate limiting (Upstash Redis or Vercel KV) on login, checkout, coupons, location pings.

---

## 16. Firebase Setup Details

### 16.1 Auth
- Enable Google provider. Authorised domains: localhost, production domain.
- On first login `POST /auth/session` creates the `users` row.
- **Admin/store/rider roles are never self-assignable.** Admin creates the invite → the server sets a Firebase custom claim `{ role, storeId? }` and updates `users.role`. Client refreshes the ID token to pick up claims.
- Super admin emails come from env `SUPER_ADMIN_EMAILS`.

### 16.2 Storage structure
```
public/
  products/{productId}/{file}
  categories/{id}/{file}
  banners/{id}/{file}
private/
  riders/{uid}/{licence|id|photo}
  delivery-proofs/{orderId}/{file}
  invoices/{orderId}.pdf
```

### 16.3 Storage rules (concept)
- `public/**`: read all; write only if `request.auth.token.role in ['admin','super_admin']`; size < 5 MB; `image/*`.
- `private/riders/{uid}/**`: read/write by owner `uid` (write once) and admins; others denied.
- `private/delivery-proofs/**`: write by rider; read by admin and the order's customer via signed URL from server.
- Image optimisation: upload originals, serve via Next `<Image>` with `remotePatterns` for the Firebase host (or generate resized variants via a Cloud Function in Phase 2).

---

## 17. Project Structure

```
tiktikmart/
├─ src/
│  ├─ app/
│  │  ├─ (customer)/            # /, /category/[slug], /search, /cart, /checkout, /orders, /profile
│  │  ├─ rider/                 # /rider, /rider/delivery/[id], /rider/earnings
│  │  ├─ store/                 # /store, /store/orders, /store/inventory
│  │  ├─ admin/                 # /admin/** modules
│  │  ├─ login/
│  │  └─ api/                   # route handlers (Section 15)
│  ├─ components/
│  │  ├─ ui/                    # shadcn
│  │  ├─ customer/ rider/ store/ admin/
│  │  └─ maps/                  # LocationPicker, TrackingMap, ZoneEditor
│  ├─ lib/
│  │  ├─ firebase/              # client.ts, admin.ts
│  │  ├─ supabase/              # server.ts, realtime.ts
│  │  ├─ razorpay/              # client.ts, verify.ts
│  │  ├─ maps/                  # routes.ts, geocode.ts
│  │  ├─ auth/                  # withAuth, roles
│  │  ├─ pricing/               # bill calculator, coupons, fees
│  │  ├─ orders/                # state machine, dispatch
│  │  └─ validators/            # zod schemas
│  ├─ hooks/  stores/ (zustand)  types/
│  └─ middleware.ts             # route guard by role cookie
├─ supabase/
│  ├─ migrations/               # SQL from Section 10
│  └─ seed.sql
├─ public/ (manifest, icons, firebase-messaging-sw.js)
├─ tests/ (unit, e2e with Playwright)
└─ .env.local
```

### 17.1 Route protection
`middleware.ts` checks a session cookie (Firebase ID token verified server-side → role) and redirects: `/admin` → admin only, `/store` → store_manager, `/rider` → rider (approved), others → customer. Real enforcement is repeated inside every API route.

---

## 18. Environment Variables

```
# Firebase (client)
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
NEXT_PUBLIC_FIREBASE_VAPID_KEY=
# Firebase (server)
FIREBASE_ADMIN_PROJECT_ID=
FIREBASE_ADMIN_CLIENT_EMAIL=
FIREBASE_ADMIN_PRIVATE_KEY=
SUPER_ADMIN_EMAILS=you@example.com
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=          # server only
SUPABASE_JWT_SECRET=                # server only (realtime token)
# Google Maps
NEXT_PUBLIC_GOOGLE_MAPS_KEY=        # referrer-restricted
GOOGLE_MAPS_SERVER_KEY=             # server only
# Razorpay
NEXT_PUBLIC_RAZORPAY_KEY_ID=
RAZORPAY_KEY_SECRET=
RAZORPAY_WEBHOOK_SECRET=
# Misc
CRON_SECRET=
UPSTASH_REDIS_URL= / UPSTASH_REDIS_TOKEN=
SENTRY_DSN=
```

---

## 19. Delivery Plan, Testing, Deployment & Risks

### 19.1 Phased roadmap **[ASSUMPTION: 1–2 devs]**
| Phase | Duration | Deliverables |
|---|---|---|
| 0. Setup | 3–4 days | Repo, Firebase/Supabase/Razorpay/Maps projects, CI, migrations, auth + roles |
| 1. Catalog & Admin core | 1.5 wks | Categories/products/variants, image upload, stores + zone drawing, inventory basics |
| 2. Customer browse | 1.5 wks | Location, serviceability, home, listing, search, product page, cart |
| 3. Checkout & payments | 1 wk | `place_order`, Razorpay, COD, webhooks, refunds, order list |
| 4. Store app | 1 wk | Live board, picking, handover, inventory edit/GRN |
| 5. Rider app & dispatch | 1.5 wks | KYC, online toggle, offers, delivery stepper, location broadcast, OTP |
| 6. Live tracking & notifications | 1 wk | Tracking map, ETA, FCM push, status timeline |
| 7. Admin ops | 1 wk | Dashboard, order control, riders/payouts, coupons, banners, reports, audit logs |
| 8. Hardening | 1 wk | RLS review, rate limits, load test, Sentry, PWA polish, UAT |
| **Total** | **≈ 10–11 weeks** | Pilot launch with 1 store |

### 19.2 Testing
- **Unit**: pricing, coupon rules, state machine, signature verification.
- **DB tests**: concurrency test — 50 parallel `place_order` on 5 units of stock must never oversell.
- **E2E (Playwright)**: full order journey across four roles (4 browser contexts).
- **Payment**: Razorpay test cards/UPI, webhook replay, double-click checkout.
- **Mobile**: real-device test for rider location + Wake Lock.

### 19.3 Deployment
- Vercel (preview per PR, production on `main`). Supabase staging + production projects. Separate Firebase projects for staging/prod. Razorpay test vs live keys per environment.
- Supabase daily backups + PITR on a paid plan before real money flows.
- Custom domain + HTTPS; set Razorpay webhook URL to production.

### 19.4 Security checklist
- Service role key only on server; RLS on; no client writes to sensitive tables.
- Verify Firebase token and role on **every** API route; store routes also verify store membership.
- Razorpay signature + webhook verification; idempotency keys.
- Zod validation, rate limiting, CORS locked down, secure headers/CSP.
- Private rider documents with signed URLs; PII minimisation; audit logs.
- Compliance notes: GST invoices (with GSTIN/HSN), FSSAI licence for food items, Razorpay KYC, Privacy Policy/Terms/Refund policy pages (required for Razorpay & Play Store).

### 19.5 Top risks & mitigations
| Risk | Impact | Mitigation |
|---|---|---|
| PWA can't track rider in background | Broken live tracking | Wake Lock now; Capacitor/React Native rider app in Phase 2 |
| Overselling stock | Cancelled orders | Row-locked reservation in SQL function, expiry job |
| Google Maps cost spikes | Budget | Session tokens, caching, straight-line dispatch, quotas/alerts |
| Realtime load from location pings | DB cost | Broadcast (no DB write), throttle, periodic last-known write |
| Razorpay tab closed after payment | Lost order state | Webhook as source of truth, reconcile cron |
| Fraud (COD, coupons) | Loss | COD limits, per-user coupon caps, blocklist |
| Supply side (not tech): dark store, stock, riders | Cannot operate | Pilot in one locality before scaling |

---

## 20. Open Questions (please answer so I can finalise the plan)

**Business**
1. **City/area for launch** and how many stores to start with (1 pilot store?)
2. **Product types**: only grocery/essentials, or also food, medicines, electronics? (Medicines/food need extra licences and flows.)
3. **Who sets prices**: one global price, or can each store override?
4. **Delivery fee model**: flat, distance slabs, or free above ₹X? Handling fee amount? Minimum order value?
5. **COD**: allowed or online-only? Max COD amount?
6. **Rider payment**: fixed per order, per km, or salaried? Employed or gig?

**Product**
7. **Customer app as PWA first** (my default), or do you want native Android/iOS apps (React Native/Flutter) soon?
8. **Customer login**: Google only, or also phone OTP? (Indian users expect OTP; needs Firebase Phone Auth or MSG91 and has SMS cost.)
9. **Rider app**: OK to start as a PWA with the background-location limitation, or must tracking work with screen off from day one (then Capacitor/native is needed)?
10. **Substitutions, scheduled delivery, wallet, loyalty, ratings**: any of these needed in MVP?
11. **Languages** (English only, or Hindi/Bengali too)? Branding assets (logo, colours) available?

**Technical**
12. Use **Firebase Storage** for all images as stated (requires Blaze plan), or would you accept Supabase Storage to avoid Blaze? (Default: Firebase.)
13. **Supabase integration style**: server-mediated access (my default) or Firebase-as-Supabase-third-party-auth with RLS?
14. Do you want me to continue with **database migrations + project scaffold** after this plan?
15. Team size and target launch date? (My timeline assumes 1–2 developers.)

---

*End of plan. Once the open questions are answered, the next deliverables can be: (1) final SQL migration files, (2) Next.js scaffold with auth + role guards, (3) detailed screen wireframes per interface.*
