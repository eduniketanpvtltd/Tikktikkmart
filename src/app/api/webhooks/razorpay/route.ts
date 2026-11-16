import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/supabase/server";
import { verifyRazorpayWebhookSignature } from "@/lib/razorpay/client";

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const signature = req.headers.get("x-razorpay-signature") ?? "";

  if (!verifyRazorpayWebhookSignature(rawBody, signature)) {
    return NextResponse.json({ ok: false, error: "invalid signature" }, { status: 400 });
  }

  const event = JSON.parse(rawBody);
  const eventId = req.headers.get("x-razorpay-event-id") || `${event.event}:${event.created_at}`;

  // Deduplicate webhook events
  const { data: existing } = await db
    .from("webhook_events")
    .select("event_id")
    .eq("event_id", eventId)
    .maybeSingle();
  if (existing) return NextResponse.json({ ok: true, deduped: true });

  await db.from("webhook_events").insert({ event_id: eventId, type: event.event, payload: event });

  const paymentEntity = event?.payload?.payment?.entity;
  const rzpOrderId = paymentEntity?.order_id;
  if (!rzpOrderId) return NextResponse.json({ ok: true });

  const { data: payment } = await db
    .from("payments")
    .select("*")
    .eq("razorpay_order_id", rzpOrderId)
    .maybeSingle();
  if (!payment) return NextResponse.json({ ok: true });

  if (event.event === "payment.captured" || event.event === "order.paid") {
    await db
      .from("payments")
      .update({ razorpay_payment_id: paymentEntity.id, status: "captured", method: paymentEntity.method, raw: paymentEntity })
      .eq("id", payment.id);
    await db.from("orders").update({ payment_status: "captured" }).eq("id", payment.order_id);

    const { data: ord } = await db.from("orders").select("status").eq("id", payment.order_id).single();
    if (ord?.status === "payment_pending") {
      await db.rpc("transition_order", {
        p_order: payment.order_id,
        p_to: "confirmed",
        p_actor: null,
        p_actor_role: null,
        p_note: "Razorpay webhook payment.captured",
      });
    }
  } else if (event.event === "payment.failed") {
    await db.from("payments").update({ status: "failed", raw: paymentEntity }).eq("id", payment.id);
    const { data: ord } = await db.from("orders").select("status").eq("id", payment.order_id).single();
    if (ord?.status === "payment_pending") {
      await db.rpc("transition_order", {
        p_order: payment.order_id,
        p_to: "payment_failed",
        p_actor: null,
        p_actor_role: null,
        p_note: "Razorpay webhook payment.failed",
      });
    }
  }

  return NextResponse.json({ ok: true });
}

