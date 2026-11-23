import { db } from "@/lib/supabase/server";
import { toRazorpayPaise } from "./client";

export type GatewayPayment = {
  id: string;
  order_id?: string | null;
  amount: number | string;
  currency?: string;
  status?: string;
  method?: string;
};

export async function recordCapturedPayment(orderId: string, payment: GatewayPayment, signature?: string) {
  const { data: order, error } = await db.from("orders")
    .select("id,status,grand_total,payment_method").eq("id", orderId).maybeSingle();
  if (error || !order) throw new Error("Order could not be loaded");
  if (order.payment_method !== "online" || payment.status !== "captured" || payment.currency !== "INR" ||
      Number(payment.amount) !== toRazorpayPaise(Number(order.grand_total)) || !payment.order_id) {
    throw new Error("Captured payment does not match the order");
  }
  const { data: linked, error: paymentError } = await db.from("payments").update({
    razorpay_payment_id: payment.id,
    ...(signature ? { razorpay_signature: signature } : {}),
    ...(payment.method ? { method: payment.method } : {}),
    status: "captured",
  }).eq("order_id", order.id).eq("razorpay_order_id", payment.order_id)
    .neq("status", "refunded").select("id").maybeSingle();
  if (paymentError || !linked) throw new Error("Payment could not be recorded");

  if (order.status === "payment_pending") {
    // Protect captured funds from the reservation-expiry path before moving the order forward.
    const { error: updateError } = await db.from("orders").update({ payment_status: "captured" })
      .eq("id", order.id).eq("status", "payment_pending");
    if (updateError) throw new Error("Order payment status could not be saved");
    await db.rpc("transition_order", {
      p_order: order.id, p_to: "confirmed", p_actor: null, p_actor_role: null,
      p_note: "Razorpay payment captured",
    });
  }
  const { data: current, error: reloadError } = await db.from("orders")
    .select("status,payment_status").eq("id", order.id).single();
  if (reloadError || !current) throw new Error("Order status could not be refreshed");
  if (current.status === "refunded") return "review" as const;

  const { error: finalError } = await db.from("orders").update({ payment_status: "captured" })
    .eq("id", order.id).eq("status", current.status).neq("payment_status", "refunded");
  if (finalError) throw new Error("Payment status could not be saved");
  return ["payment_pending", "payment_failed", "cancelled", "rejected_by_store"].includes(current.status)
    ? "review" as const : "complete" as const;
}
