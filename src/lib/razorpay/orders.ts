import { createOrRecoverGatewayOrder } from "./gatewayOrder";
import type { Orders } from "razorpay/dist/types/orders";
import type { OrderStatus } from "@/types/db";
import { db } from "@/lib/supabase/server";
import { getRazorpay, toRazorpayPaise } from "./client";

export type CheckoutOrder = {
  id: string;
  user_id: string;
  order_no: number;
  grand_total: number;
  payment_method: "online" | "cod";
  payment_status: string | null;
  status: OrderStatus;
  placed_at: string;
};

export async function getCheckoutGatewayOrder(order: CheckoutOrder): Promise<Orders.RazorpayOrder> {
  const gateway = getRazorpay().orders;
  const { data: existing, error } = await db.from("payments").select("razorpay_order_id")
    .eq("order_id", order.id).not("razorpay_order_id", "is", null).order("created_at").limit(1).maybeSingle();
  if (error) throw new Error("Payment lookup failed");
  if (existing?.razorpay_order_id) return gateway.fetch(existing.razorpay_order_id);

  const amount = toRazorpayPaise(Number(order.grand_total));
  // Claim the gateway create before calling Razorpay. A receipt alone does not prevent duplicates.
  const { data: claim, error: claimError } = await db.from("payments").upsert({
    id: order.id,
    order_id: order.id,
    amount: amount / 100,
    currency: "INR",
    status: "created",
  }, { onConflict: "id", ignoreDuplicates: true }).select("id").maybeSingle();
  if (claimError) throw new Error("Payment creation could not be claimed");

  const created = await createOrRecoverGatewayOrder(gateway, order, amount, Boolean(claim));
  const { error: writeError } = await db.from("payments").update({ razorpay_order_id: created.id })
    .eq("id", order.id).is("razorpay_order_id", null);
  if (writeError) throw new Error("Payment connection could not be saved");
  const { data: saved, error: readError } = await db.from("payments").select("razorpay_order_id").eq("id", order.id).single();
  if (readError || !saved?.razorpay_order_id) throw new Error("Payment connection could not be loaded");
  return saved.razorpay_order_id === created.id ? created : gateway.fetch(saved.razorpay_order_id);
}
