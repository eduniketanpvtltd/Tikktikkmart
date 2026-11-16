import { z } from "zod";
import { db } from "@/lib/supabase/server";
import { fail, ok, withAuth } from "@/lib/auth/withAuth";
import { dispatchOrderToRider } from "@/lib/orders/dispatch";

const schema = z.object({
  action: z.enum(["accept", "reject"]),
});

export const POST = withAuth(["rider", "admin"], async (req, { user, params }) => {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return fail("Invalid action");

  const { data: offer } = await db
    .from("rider_assignments")
    .select("*")
    .eq("id", params.id)
    .eq("rider_id", user.id)
    .eq("status", "offered")
    .maybeSingle();

  if (!offer) return fail("Offer not found or already handled", 404);

  if (parsed.data.action === "reject") {
    await db
      .from("rider_assignments")
      .update({ status: "rejected", responded_at: new Date().toISOString() })
      .eq("id", offer.id);
    await dispatchOrderToRider(offer.order_id);
    return ok({ rejected: true });
  }

  // Accept: atomically assign order if still unassigned
  const { data: order } = await db
    .from("orders")
    .select("id, status, rider_id")
    .eq("id", offer.order_id)
    .single();
  if (!order || order.rider_id) {
    await db.from("rider_assignments").update({ status: "expired" }).eq("id", offer.id);
    return fail("Order already assigned to another rider", 409);
  }

  await db
    .from("rider_assignments")
    .update({ status: "accepted", responded_at: new Date().toISOString() })
    .eq("id", offer.id);

  await db.from("orders").update({ rider_id: user.id }).eq("id", order.id);
  await db.from("rider_profiles").update({ on_delivery: true }).eq("user_id", user.id);

  if (order.status === "packed") {
    await db.rpc("transition_order", {
      p_order: order.id,
      p_to: "rider_assigned",
      p_actor: user.id,
      p_actor_role: user.role,
      p_note: "Rider accepted offer",
    });
  }

  return ok({ accepted: true, orderId: order.id });
});

