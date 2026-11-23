import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/supabase/server";
import { verifyRazorpayWebhookSignature } from "@/lib/razorpay/client";
import { recordCapturedPayment, type GatewayPayment } from "@/lib/razorpay/settlement";

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  if (!verifyRazorpayWebhookSignature(rawBody, req.headers.get("x-razorpay-signature") ?? "")) {
    return NextResponse.json({ ok: false, error: "Invalid signature" }, { status: 400 });
  }

  let event;
  try {
    event = JSON.parse(rawBody) as { event: string; created_at: number; payload?: { payment?: { entity?: GatewayPayment } } };
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid event" }, { status: 400 });
  }

  // Failed attempts may be retried within an existing Razorpay order.
  if (!["payment.captured", "order.paid"].includes(event.event)) return NextResponse.json({ ok: true });
  const payment = event.payload?.payment?.entity;
  if (!payment?.id || !payment.order_id) return NextResponse.json({ ok: false, error: "Missing captured payment" }, { status: 400 });
  const eventId = req.headers.get("x-razorpay-event-id") ?? `${event.event}:${payment.id}`;
  const { data: existing, error: checkError } = await db.from("webhook_events").select("event_id")
    .eq("event_id", eventId).maybeSingle();
  if (existing) return NextResponse.json({ ok: true, deduped: true });

  try {
    if (checkError) throw checkError;
    const { data: linked, error } = await db.from("payments").select("order_id")
      .eq("razorpay_order_id", payment.order_id).maybeSingle();
    if (error || !linked?.order_id) throw new Error("Payment linkage is pending");
    await recordCapturedPayment(linked.order_id, payment);
    const { error: stored } = await db.from("webhook_events")
      .upsert({ event_id: eventId, type: event.event, payload: event }, { onConflict: "event_id", ignoreDuplicates: true });
    if (stored) throw stored;
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false, error: "Payment reconciliation is pending" }, { status: 503 });
  }
}
