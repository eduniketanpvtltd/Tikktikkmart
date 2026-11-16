import { db } from "@/lib/supabase/server";
import { fail, ok, withAuth } from "@/lib/auth/withAuth";

export const GET = withAuth(null, async (_req, { user, params }) => {
  const { data: order, error } = await db
    .from("orders")
    .select("*, store:stores(id, name, address, phone), items:order_items(*), history:order_status_history(*)")
    .eq("id", params.id)
    .maybeSingle();

  if (error) return fail(error.message, 500);
  if (!order) return fail("Order not found", 404);

  const isOwner = order.user_id === user.id || order.rider_id === user.id;
  const isStaff = ["admin", "super_admin", "store_manager"].includes(user.role);
  if (!isOwner && !isStaff) return fail("forbidden", 403);

  let rider = null;
  if (order.rider_id) {
    const { data: rUser } = await db
      .from("users")
      .select("id, name, phone, photo_url")
      .eq("id", order.rider_id)
      .maybeSingle();
    const { data: rLoc } = await db
      .from("rider_locations")
      .select("heading, speed, updated_at")
      .eq("rider_id", order.rider_id)
      .maybeSingle();
    rider = rUser ? { ...rUser, locationMeta: rLoc } : null;
  }

  return ok({ ...order, rider });
});

