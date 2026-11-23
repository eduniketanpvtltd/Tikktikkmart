import { db } from "@/lib/supabase/server";
import { fail, ok, withAuth } from "@/lib/auth/withAuth";

export const POST = withAuth(null, async (req, { user, params }) => {
  const { data: order } = await db.from("orders").select("*").eq("id", params.id).maybeSingle();
  if (!order) return fail("Order not found", 404);
  if (order.user_id !== user.id && !["admin", "super_admin"].includes(user.role)) {
    return fail("forbidden", 403);
  }
  if (!["placed", "payment_pending", "confirmed", "accepted_by_store", "picking"].includes(order.status)) {
    return fail("Order cannot be cancelled after packing", 400);
  }
  if (order.user_id === user.id && ["authorized", "captured"].includes(order.payment_status)) {
    return fail("Contact the store to cancel this paid order", 409);
  }

  const body = await req.json().catch(() => ({}));
  const { data: updated, error } = await db.rpc("transition_order", {
    p_order: params.id,
    p_to: "cancelled",
    p_actor: user.id,
    p_actor_role: user.role,
    p_note: body?.reason || "Cancelled by customer",
  });
  if (error) return fail(error.message, 400);
  return ok(updated);
});

