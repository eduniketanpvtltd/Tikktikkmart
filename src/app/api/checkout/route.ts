import { z } from "zod";
import { db } from "@/lib/supabase/server";
import { fail, ok, withAuth } from "@/lib/auth/withAuth";
import { computeBillBreakdown } from "@/lib/pricing/calculator";
import { getRazorpay, toRazorpayPaise } from "@/lib/razorpay/client";
import { getCheckoutGatewayOrder, type CheckoutOrder } from "@/lib/razorpay/orders";
import { recordCapturedPayment } from "@/lib/razorpay/settlement";

const schema = z.object({
  storeId: z.guid(),
  addressId: z.uuid(),
  paymentMethod: z.enum(["online", "cod"]),
  items: z.array(z.object({ variant_id: z.guid(), quantity: z.number().int().min(1) })).min(1).max(100),
  couponCode: z.string().nullable().optional(),
  tip: z.number().min(0).max(500).optional(),
  instructions: z.string().max(300).optional(),
  idempotencyKey: z.uuid().optional(),
});

function checkoutResponse(order: CheckoutOrder, state: "complete" | "payment_required" | "payment_review" | "expired", razorpay = null as null | {
  orderId: string; amount: number; currency: string; keyId: string;
}) {
  return ok({ order: { id: order.id, order_no: order.order_no, grand_total: order.grand_total }, state, razorpay });
}

async function resume(order: CheckoutOrder) {
  const closed = ["cancelled", "payment_failed", "rejected_by_store", "refunded"].includes(order.status);
  if (order.payment_method === "cod") return checkoutResponse(order, closed ? "expired" : "complete");
  if (order.status === "refunded") return checkoutResponse(order, "expired");
  if (order.payment_status === "captured" && order.status !== "payment_pending") {
    return checkoutResponse(order, closed ? "payment_review" : "complete");
  }
  if (closed) {
    // Inspect an existing gateway order only. A closed local order must never create a new payment.
    const { data: payment, error } = await db.from("payments").select("razorpay_order_id")
      .eq("order_id", order.id).not("razorpay_order_id", "is", null).limit(1).maybeSingle();
    if (error) return checkoutResponse(order, "payment_review");
    if (!payment?.razorpay_order_id) return checkoutResponse(order, "expired");
    try {
      const gateway = await getRazorpay().orders.fetch(payment.razorpay_order_id);
      if (gateway.status === "created" && !Number(gateway.amount_paid)) return checkoutResponse(order, "expired");
      const { items } = await getRazorpay().orders.fetchPayments(gateway.id);
      const captured = items.find(({ status }) => status === "captured");
      if (captured) await recordCapturedPayment(order.id, captured);
      if (!captured && !Number(gateway.amount_paid) && items.every(({ status }) => status === "failed")) {
        return checkoutResponse(order, "expired");
      }
    } catch {}
    return checkoutResponse(order, "payment_review");
  }

  try {
    const gateway = await getCheckoutGatewayOrder(order);
    if (gateway.status !== "created" || order.payment_status === "captured") {
      const list = await getRazorpay().orders.fetchPayments(gateway.id);
      const captured = list.items.find(({ status }) => status === "captured");
      if (captured) {
        const state = await recordCapturedPayment(order.id, captured);
        return checkoutResponse(order, state === "complete" ? "complete" : "payment_review");
      }
      if (gateway.status === "paid" || order.payment_status === "captured" ||
          list.items.some(({ status }) => status === "authorized")) {
        return checkoutResponse(order, "payment_review");
      }
    }
    if (Number(gateway.amount_paid) > 0 || Number(gateway.amount) !== toRazorpayPaise(Number(order.grand_total)) || gateway.currency !== "INR") {
      return checkoutResponse(order, "payment_review");
    }
    return checkoutResponse(order, "payment_required", {
      orderId: gateway.id,
      amount: Number(gateway.amount),
      currency: gateway.currency,
      keyId: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID!,
    });
  } catch {
    return checkoutResponse(order, "payment_review");
  }
}

export const POST = withAuth(null, async (req, { user }) => {
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return fail("Invalid checkout details");

  const { storeId, addressId, paymentMethod, items, couponCode, tip = 0, instructions, idempotencyKey: legacyKey } = parsed.data;
  const requestKey = z.uuid().safeParse(req.headers.get("Idempotency-Key") ?? legacyKey);
  if (!requestKey.success) return fail("A checkout attempt key is required");
  if (new Set(items.map(({ variant_id }) => variant_id)).size !== items.length) return fail("Remove duplicate cart entries and try again");

  const idempotencyKey = `${user.id}:${requestKey.data}`;
  const lookup = () => db.from("orders").select("*").eq("idempotency_key", idempotencyKey).eq("user_id", user.id).maybeSingle();
  const { data: previous, error: lookupError } = await lookup();
  if (lookupError) return fail("Could not check the previous checkout attempt. Please retry.", 503);
  if (previous) {
    if (previous.store_id !== storeId || previous.address_id !== addressId || previous.payment_method !== paymentMethod) {
      return fail("This checkout attempt belongs to a different order", 409);
    }
    return resume(previous);
  }

  if (paymentMethod === "online" && (!process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET)) {
    return fail("Online payment is unavailable. Choose cash on delivery.", 503);
  }

  const { data: store, error: storeError } = await db.from("stores")
    .select("is_active,is_accepting_orders").eq("id", storeId).maybeSingle();
  if (storeError) return fail("Could not check store availability. Please retry.", 503);
  if (!store?.is_active || !store.is_accepting_orders) return fail("Selected store is currently not accepting orders");

  let bill;
  try {
    ({ bill } = await computeBillBreakdown({ storeId, userId: user.id, items, couponCode, tip }));
  } catch {
    return fail("Could not check your cart. Refresh the cart and try again.");
  }
  if (bill.couponError) return fail(bill.couponError);
  if (paymentMethod === "cod" && bill.grandTotal > 2000) return fail("Cash on Delivery is available up to ₹2,000 only");

  const { data: order, error: rpcError } = await db.rpc("place_order", {
    p_user: user.id, p_store: storeId, p_address: addressId, p_method: paymentMethod,
    p_items: items, p_tip: bill.tip, p_instructions: instructions ?? null, p_idem: idempotencyKey,
    p_delivery_fee: bill.deliveryFee, p_handling_fee: bill.handlingFee,
    p_small_cart_fee: bill.smallCartFee, p_discount: bill.discount, p_coupon: bill.couponCode,
  });

  if (!order || rpcError) {
    const { data: recovered } = await lookup();
    if (recovered) return resume(recovered);
    if (rpcError?.code === "P0001") return fail("Checkout could not be completed. Check your stock and address, then retry.");
    return fail("Checkout could not be confirmed. Retry to check the same order.", 503);
  }

  if (bill.couponCode && bill.discount > 0) {
    const { data: coupon } = await db.from("coupons").select("id").eq("code", bill.couponCode).maybeSingle();
    if (coupon) {
      await db.from("coupon_redemptions").upsert({ id: order.id, coupon_id: coupon.id,
        user_id: user.id, order_id: order.id, amount: bill.discount }, { onConflict: "id", ignoreDuplicates: true });
    }
  }

  return resume(order);
});
