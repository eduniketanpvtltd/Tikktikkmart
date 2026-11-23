import type { OrderStatus } from "@/types/db";
import type { Coordinates } from "@/lib/maps/coordinates";

export const activeRouteStatuses = ["picked_up", "out_for_delivery", "arrived"] as const;
export const cancellableOrderStatuses: OrderStatus[] = ["placed", "payment_pending", "confirmed", "accepted_by_store", "picking"];
export const addOnOrderStatuses: OrderStatus[] = ["placed", "confirmed"];
export const addOnWindowMs = 120_000;
export const deliveryInstructionOptions = ["Leave at door", "Don't ring the bell", "Call on arrival", "Avoid calling"] as const;

export type TrackedOrder = {
  id: string;
  order_no: number;
  status: OrderStatus;
  placed_at: string;
  delivered_at: string | null;
  delivery_otp?: string | null;
  payment_method: "online" | "cod";
  payment_status: string | null;
  instructions: string | null;
  address_snapshot: { line1?: string; line2?: string; landmark?: string; city?: string; state?: string; pincode?: string } | null;
  items_total: number | null;
  delivery_fee: number | null;
  handling_fee: number | null;
  small_cart_fee: number | null;
  discount: number | null;
  tip: number | null;
  grand_total: number;
  customer_rating?: number | null;
  store: { id: string; name: string; phone: string | null } | null;
  rider: { name: string | null; phone: string | null; photo_url: string | null; rating: number | null; vehicle_number: string | null; vehicle_type: string | null } | null;
  items: { id: string; variant_id: string | null; name_snapshot: string | null; label_snapshot: string | null; image_snapshot: string | null; unit_price: number | null; quantity: number; status: string | null }[];
  history: { to_status: OrderStatus; created_at: string }[];
  tracking: { store: Coordinates | null; drop: Coordinates | null; rider: (Coordinates & { updatedAt: string }) | null; estimatedAt: string | null };
};

export function isRouteActive(status: string) {
  return activeRouteStatuses.some((stage) => stage === status);
}
