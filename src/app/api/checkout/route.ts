import { z } from "zod";
import { db } from "@/lib/supabase/server";
import { fail, ok, withAuth } from "@/lib/auth/withAuth";
import { computeBillBreakdown } from "@/lib/pricing/calculator";
import { getRazorpay, toRazorpayPaise } from "@/lib/razorpay/client";

const schema = z.object({
  storeId: z.string().uuid(),
  addressId: z.string().uuid(),
  paymentMethod: z.enum(["online", "cod"]),
  items: z.array(z.object({ variant_id: z.string().uuid(), quantity: z.number().int().min(1) })).min(1),
  couponCode: z.string().nullable().optional(),
  tip: z.number().min(0).max(500).optional(),
  instructions: z.string().max(300).optional(),
  idempotencyKey: z.string().min(4).max(100).optional(),
});

export const POST = withAuth(null, async (req, { user }) => {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return fail("Invalid checkout payload");

  const { storeId, addressId, paymentMethod, items, couponCode, tip = 0, instructions, idempotencyKey } = parsed.data;

  // Check store is active
  const { data: store } = await db
    .from("stores")
    .select("id, is_active, is_accepting_orders, prep_time_min")
    .eq("id", storeId)
    .maybeSingle();
  if (!store || !store.is_active || !store.is_accepting_orders) {
    return fail("Selected store is currently not accepting orders", 400);
  }

  // Server-side bill breakdown
  const { bill } = await computeBillBreakdown({
    storeId,
    userId: user.id,
    items,
    couponCode,
    tip,
  });

  if (paymentMethod === "cod" && bill.grandTotal > 2000) {
    return fail("Cash on Delivery is available up to ₹2,000 only");
  }

  // Call transactional place_order RPC
  const { data: order, error: rpcErr } = await db.rpc("place_order", {
    p_user: user.id,
    p_store: storeId,
    p_address: addressId,
    p_method: paymentMethod,
    p_items: items,
    p_tip: bill.tip,
    p_instructions: instructions ?? null,
    p_idem: idempotencyKey ?? null,
    p_delivery_fee: bill.deliveryFee,
    p_handling_fee: bill.handlingFee,
    p_small_cart_fee: bill.smallCartFee,
    p_discount: bill.discount,
    p_coupon: bill.couponCode,
  });

  if (rpcErr || !order) {
    return fail(rpcErr?.message || "Failed to place order", 400);
  }

  // Record coupon redemption if applied
  if (bill.couponCode && bill.discount > 0) {
    const { data: c } = await db.from("coupons").select("id").eq("code", bill.couponCode).maybeSingle();
    if (c) {
      await db.from("coupon_redemptions").insert({
        coupon_id: c.id,
        user_id: user.id,
        order_id: order.id,
        amount: bill.discount,
      });
    }
  }

  if (paymentMethod === "cod") {
    return ok({ order, razorpay: null });
  }

  // Online payment: create Razorpay Order
  try {
    const rzp = getRazorpay();
    const amountPaise = toRazorpayPaise(Number(order.grand_total));
    const rzpOrder = await rzp.orders.create({
      amount: amountPaise,
      currency: "INR",
      receipt: `TTM-${order.order_no}`,
      notes: { order_id: order.id, user_id: user.id },
    });

    await db.from("payments").insert({
      order_id: order.id,
      razorpay_order_id: rzpOrder.id,
      amount: Number(order.grand_total),
      currency: "INR",
      status: "created",
    });

    return ok({
      order,
      razorpay: {
        orderId: rzpOrder.id,
        amount: amountPaise,
        currency: "INR",
        keyId: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
      },
    });
  } catch (err: any) {
    return fail(err?.message || "Failed to create Razorpay order", 500);
  }
});

