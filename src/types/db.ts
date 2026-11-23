export type UserRole = "customer" | "rider" | "store_manager" | "admin" | "super_admin";

export type OrderStatus =
  | "placed"
  | "payment_pending"
  | "confirmed"
  | "accepted_by_store"
  | "picking"
  | "packed"
  | "rider_assigned"
  | "rider_at_store"
  | "picked_up"
  | "out_for_delivery"
  | "arrived"
  | "delivered"
  | "cancelled"
  | "rejected_by_store"
  | "payment_failed"
  | "delivery_failed"
  | "refunded";

export type PaymentMethod = "online" | "cod";

export interface Category {
  id: string;
  parent_id: string | null;
  name: string;
  slug: string;
  image_url: string | null;
  sort_order: number;
  is_active: boolean;
}

export interface ProductVariant {
  id: string;
  product_id: string;
  label: string;
  sku: string | null;
  barcode: string | null;
  mrp: number;
  base_price: number;
  max_qty_per_order: number;
  is_active: boolean;
  // Store-joined fields
  stock_available?: number;
  price_override?: number | null;
  effective_price?: number;
  rack_location?: string | null;
}

export interface Product {
  id: string;
  category_id: string | null;
  name: string;
  slug: string;
  brand: string | null;
  description: string | null;
  images: string[];
  tags: string[];
  hsn_code: string | null;
  gst_rate: number;
  is_active: boolean;
  variants?: ProductVariant[];
  rating?: number | null;
  review_count?: number | null;
}

export interface Store {
  id: string;
  name: string;
  code: string | null;
  address: string | null;
  phone: string | null;
  service_radius_m: number;
  is_active: boolean;
  is_accepting_orders: boolean;
  prep_time_min: number;
  opens_at: string | null;
  closes_at: string | null;
}

export interface Address {
  id: string;
  user_id: string;
  label: string | null;
  receiver_name: string | null;
  receiver_phone: string | null;
  line1: string;
  line2: string | null;
  landmark: string | null;
  city: string | null;
  state: string | null;
  pincode: string | null;
  place_id: string | null;
  is_default: boolean;
  lat?: number;
  lng?: number;
}

export interface BillBreakdown {
  itemsTotal: number;
  mrpTotal: number;
  savings: number;
  deliveryFee: number;
  handlingFee: number;
  smallCartFee: number;
  tip: number;
  discount: number;
  taxTotal: number;
  grandTotal: number;
  couponCode: string | null;
  couponError?: string | null;
}

