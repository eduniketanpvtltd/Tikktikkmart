import { z } from "zod";
import { db } from "@/lib/supabase/server";
import { fail, ok, withAuth } from "@/lib/auth/withAuth";

const schema = z.object({
  step: z.enum(["arrived-store", "picked-up", "out-for-delivery", "arrived", "deliver"]),
  code: z.string().optional(),
  lat: z.number().optional(),
  lng: z.number().optional(),
});

export const POST = withAuth(["rider", "admin"], async (req, { user, params }) => {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return fail("Invalid delivery step");

  const { data: order } = await db.from("orders").select("*").eq("id", params.id).maybeSingle();
  if (!order) return fail("Order not found", 404);
  if (order.rider_id !== user.id && !["admin", "super_admin"].includes(user.role)) {
    return fail("forbidden", 403);
  }

  const { step, code, lat, lng } = parsed.data;

  if (step === "picked-up" && order.pickup_code && code !== order.pickup_code) {
    return fail("Invalid store pickup code");
  }
  if (step === "deliver" && (!order.delivery_otp || code !== order.delivery_otp)) {
    return fail("Invalid customer delivery OTP");
  }

  const mapStep = {
    "arrived-store": "rider_at_store",
    "picked-up": "picked_up",
    "out-for-delivery": "out_for_delivery",
    arrived: "arrived",
    deliver: "delivered",
  } as const;

  // Offers can be accepted while the store is picking. Promote a now-packed
  // order before recording arrival if the original accept could not do it.
  if (step === "arrived-store" && order.status === "packed" && order.rider_id) {
    const { error: assignmentError } = await db.rpc("transition_order", {
      p_order: order.id,
      p_to: "rider_assigned",
      p_actor: user.id,
      p_actor_role: user.role,
      p_note: "Rider assignment confirmed at pickup",
    });
    if (assignmentError) return fail(assignmentError.message, 400);
  }

  const toStatus = mapStep[step];
  const { data: updated, error } = await db.rpc("transition_order", {
    p_order: order.id,
    p_to: toStatus,
    p_actor: user.id,
    p_actor_role: user.role,
    p_note: `Rider step: ${step}`,
    p_lat: lat ?? null,
    p_lng: lng ?? null,
  });
  if (error) return fail(error.message, 400);

  // Auto-advance picked_up -> out_for_delivery for smooth UX
  if (toStatus === "picked_up") {
    await db.rpc("transition_order", {
      p_order: order.id,
      p_to: "out_for_delivery",
      p_actor: user.id,
      p_actor_role: user.role,
      p_note: "Auto out for delivery",
    });
  }

  if (toStatus === "delivered") {
    const updates: Record<string, unknown> = { on_delivery: false };
    if (order.payment_method === "cod") {
      const { data: rp } = await db
        .from("rider_profiles")
        .select("cod_balance")
        .eq("user_id", user.id)
        .single();
      updates.cod_balance = Number(rp?.cod_balance ?? 0) + Number(order.grand_total);
      await db.from("orders").update({ payment_status: "captured" }).eq("id", order.id);
    }
    await db.from("rider_profiles").update(updates).eq("user_id", user.id);
  }

  if (updated) delete updated.delivery_otp;
  return ok(updated);
});

