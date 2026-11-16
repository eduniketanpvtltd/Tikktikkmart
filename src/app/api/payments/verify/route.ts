import { z } from "zod";
import { db } from "@/lib/supabase/server";
import { fail, ok, withAuth } from "@/lib/auth/withAuth";
import { verifyRazorpayPaymentSignature } from "@/lib/razorpay/client";

const schema = z.object({
  orderId: z.string().uuid(),
  razorpay_order_id: z.string(),
  razorpay_payment_id: z.string(),
  razorpay_signature: z.string(),
});

export const POST = withAuth(null, async (req, { user }) => {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return fail("Invalid payment payload");

  const { orderId, razorpay_order_id, razorpay_payment_id, razorpay_signature } = parsed.data;
  const valid = verifyRazorpayPaymentSignature({
    razorpayOrderId: razorpay_order_id,
    razorpayPaymentId: razorpay_payment_id,
    razorpaySignature: razorpay_signature,
  });
  if (!valid) return fail("Invalid payment signature", 400);

  await db
    .from("payments")
    .update({
      razorpay_payment_id,
      razorpay_signature,
      status: "captured",
    })
    .eq("razorpay_order_id", razorpay_order_id)
    .eq("order_id", orderId);

  const { data: order } = await db.from("orders").select("status, payment_status").eq("id", orderId).single();
  if (order && order.status === "payment_pending") {
    await db.rpc("transition_order", {
      p_order: orderId,
      p_to: "confirmed",
      p_actor: user.id,
      p_actor_role: user.role,
      p_note: "Razorpay payment verified",
    });
  }
  await db.from("orders").update({ payment_status: "captured" }).eq("id", orderId);

  return ok({ verified: true, orderId });
});

