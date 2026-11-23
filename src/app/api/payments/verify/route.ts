import { z } from "zod";
import { db } from "@/lib/supabase/server";
import { fail, ok, withAuth } from "@/lib/auth/withAuth";
import { getRazorpay, verifyRazorpayPaymentSignature } from "@/lib/razorpay/client";
import { recordCapturedPayment } from "@/lib/razorpay/settlement";

const schema = z.object({
  orderId: z.uuid(),
  razorpay_order_id: z.string().min(1).max(64),
  razorpay_payment_id: z.string().min(1).max(64),
  razorpay_signature: z.string().regex(/^[a-f\d]{64}$/i),
});

export const POST = withAuth(null, async (req, { user }) => {
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return fail("Invalid payment payload");

  const { orderId, razorpay_order_id, razorpay_payment_id, razorpay_signature } = parsed.data;
  const { data: order, error } = await db.from("orders").select("id")
    .eq("id", orderId).eq("user_id", user.id).maybeSingle();
  if (error) return fail("Could not check your order", 503);
  if (!order) return fail("Order not found", 404);
  if (!verifyRazorpayPaymentSignature({
    razorpayOrderId: razorpay_order_id, razorpayPaymentId: razorpay_payment_id, razorpaySignature: razorpay_signature,
  })) return fail("Invalid payment signature");

  try {
    const payment = await getRazorpay().payments.fetch(razorpay_payment_id);
    if (payment.order_id !== razorpay_order_id) return fail("Payment could not be matched to this order", 409);
    if (payment.status !== "captured") return ok({ state: "review", orderId });
    const state = await recordCapturedPayment(orderId, payment, razorpay_signature);
    return ok({ state, orderId });
  } catch {
    return fail("Payment confirmation is pending. Check your order before paying again.", 503);
  }
});
