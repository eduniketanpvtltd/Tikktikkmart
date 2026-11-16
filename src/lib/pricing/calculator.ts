import { db } from "@/lib/supabase/server";
import type { BillBreakdown } from "@/types/db";

export interface CartItemInput {
  variant_id: string;
  quantity: number;
}

export const DEFAULT_HANDLING_FEE = 5;
export const DEFAULT_MIN_CART_VALUE = 99;
export const DEFAULT_SMALL_CART_FEE = 15;
export const DEFAULT_DELIVERY_FEE = 25;
export const DEFAULT_FREE_DELIVERY_ABOVE = 199;

/**
 * Computes authoritative bill breakdown server-side from store inventory & coupons.
 */
export async function computeBillBreakdown(params: {
  storeId: string;
  userId?: string;
  items: CartItemInput[];
  couponCode?: string | null;
  tip?: number;
  distanceM?: number;
}): Promise<{ bill: BillBreakdown; resolvedItems: Array<{ variant_id: string; quantity: number; unit_price: number; mrp: number; gst_rate: number; name: string; label: string; image: string | null }> }> {
  const { storeId, userId, items, couponCode, tip = 0, distanceM = 1500 } = params;
  if (!items.length) {
    return {
      bill: {
        itemsTotal: 0,
        mrpTotal: 0,
        savings: 0,
        deliveryFee: 0,
        handlingFee: 0,
        smallCartFee: 0,
        tip: 0,
        discount: 0,
        taxTotal: 0,
        grandTotal: 0,
        couponCode: null,
      },
      resolvedItems: [],
    };
  }

  const variantIds = items.map((i) => i.variant_id);
  const [{ data: variants }, { data: invRows }] = await Promise.all([
    db
      .from("product_variants")
      .select("id, label, mrp, base_price, max_qty_per_order, is_active, product:products(id, name, images, gst_rate, is_active)")
      .in("id", variantIds),
    db
      .from("store_inventory")
      .select("variant_id, quantity, reserved, price_override, is_available")
      .eq("store_id", storeId)
      .in("variant_id", variantIds),
  ]);

  const invMap = new Map((invRows ?? []).map((r) => [r.variant_id, r]));
  const varMap = new Map((variants ?? []).map((v) => [v.id, v]));

  let itemsTotal = 0;
  let mrpTotal = 0;
  let taxTotal = 0;
  const resolvedItems: Array<{
    variant_id: string;
    quantity: number;
    unit_price: number;
    mrp: number;
    gst_rate: number;
    name: string;
    label: string;
    image: string | null;
  }> = [];

  for (const item of items) {
    const v = varMap.get(item.variant_id);
    if (!v || !v.is_active) continue;
    const prod = Array.isArray(v.product) ? v.product[0] : v.product;
    if (!prod || !prod.is_active) continue;
    const inv = invMap.get(item.variant_id);
    const unitPrice = Number(inv?.price_override ?? v.base_price);
    const mrp = Number(v.mrp);
    const gst = Number(prod.gst_rate ?? 0);

    itemsTotal += unitPrice * item.quantity;
    mrpTotal += mrp * item.quantity;
    if (gst > 0) {
      taxTotal += Number(((unitPrice * item.quantity * gst) / (100 + gst)).toFixed(2));
    }
    resolvedItems.push({
      variant_id: v.id,
      quantity: item.quantity,
      unit_price: unitPrice,
      mrp,
      gst_rate: gst,
      name: prod.name,
      label: v.label,
      image: prod.images?.[0] ?? null,
    });
  }

  // Delivery fee from fee_slabs if configured, else default
  const { data: slabs } = await db
    .from("fee_slabs")
    .select("*")
    .lte("min_distance_m", distanceM)
    .gte("max_distance_m", distanceM)
    .limit(1);

  const slab = slabs?.[0];
  const freeAbove = slab?.free_above != null ? Number(slab.free_above) : DEFAULT_FREE_DELIVERY_ABOVE;
  const baseDeliveryFee = slab?.fee != null ? Number(slab.fee) : DEFAULT_DELIVERY_FEE;
  const deliveryFee = itemsTotal >= freeAbove ? 0 : baseDeliveryFee;

  const handlingFee = itemsTotal > 0 ? DEFAULT_HANDLING_FEE : 0;
  const smallCartFee = itemsTotal > 0 && itemsTotal < DEFAULT_MIN_CART_VALUE ? DEFAULT_SMALL_CART_FEE : 0;

  let discount = 0;
  let appliedCoupon: string | null = null;
  let couponError: string | null = null;

  if (couponCode) {
    const code = couponCode.trim().toUpperCase();
    const { data: coupon } = await db
      .from("coupons")
      .select("*")
      .eq("code", code)
      .eq("is_active", true)
      .maybeSingle();

    if (!coupon) {
      couponError = "Invalid coupon code";
    } else if (coupon.starts_at && new Date(coupon.starts_at) > new Date()) {
      couponError = "Coupon is not active yet";
    } else if (coupon.ends_at && new Date(coupon.ends_at) < new Date()) {
      couponError = "Coupon has expired";
    } else if (itemsTotal < Number(coupon.min_order ?? 0)) {
      couponError = `Minimum order ₹${coupon.min_order} required`;
    } else if (coupon.store_ids?.length && !coupon.store_ids.includes(storeId)) {
      couponError = "Coupon not valid for this store";
    } else {
      let eligible = true;
      if (userId) {
        const { count: userUses } = await db
          .from("coupon_redemptions")
          .select("*", { count: "exact", head: true })
          .eq("coupon_id", coupon.id)
          .eq("user_id", userId);
        if ((userUses ?? 0) >= (coupon.per_user_limit ?? 1)) {
          couponError = "Coupon usage limit reached";
          eligible = false;
        }
        if (eligible && coupon.first_order_only) {
          const { count: orderCount } = await db
            .from("orders")
            .select("*", { count: "exact", head: true })
            .eq("user_id", userId)
            .not("status", "in", "(cancelled,payment_failed,rejected_by_store)");
          if ((orderCount ?? 0) > 0) {
            couponError = "Valid on first order only";
            eligible = false;
          }
        }
      }
      if (eligible) {
        if (coupon.type === "flat") {
          discount = Math.min(Number(coupon.value ?? 0), itemsTotal);
        } else {
          const pct = (itemsTotal * Number(coupon.value ?? 0)) / 100;
          discount = coupon.max_discount ? Math.min(pct, Number(coupon.max_discount)) : pct;
        }
        discount = Number(discount.toFixed(2));
        appliedCoupon = code;
      }
    }
  }

  const safeTip = Math.max(0, Number(tip) || 0);
  const grandTotal = Math.max(
    0,
    Number((itemsTotal - discount + deliveryFee + handlingFee + smallCartFee + safeTip).toFixed(2))
  );

  return {
    bill: {
      itemsTotal: Number(itemsTotal.toFixed(2)),
      mrpTotal: Number(mrpTotal.toFixed(2)),
      savings: Number(Math.max(0, mrpTotal - itemsTotal + discount).toFixed(2)),
      deliveryFee,
      handlingFee,
      smallCartFee,
      tip: safeTip,
      discount,
      taxTotal: Number(taxTotal.toFixed(2)),
      grandTotal,
      couponCode: appliedCoupon,
      couponError,
    },
    resolvedItems,
  };
}

