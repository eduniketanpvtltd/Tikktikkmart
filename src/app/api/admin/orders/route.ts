import { z } from "zod";
import { db } from "@/lib/supabase/server";
import { fail, ok, withAuth, writeAuditLog } from "@/lib/auth/withAuth";

export const GET = withAuth(["admin"], async (req) => {
  const status = req.nextUrl.searchParams.get("status");
  let query = db
    .from("orders")
    .select("*, store:stores(id, name), customer:users!orders_user_id_fkey(name, email, phone), rider:users!orders_rider_id_fkey(name, phone)")
    .order("placed_at", { ascending: false })
    .limit(100);

  if (status) query = query.eq("status", status);
  const { data, error } = await query;
  if (error) return fail(error.message, 500);
  return ok(data ?? []);
});

const actionSchema = z.object({
  orderId: z.string().uuid(),
  action: z.enum(["cancel", "assign_rider"]),
  riderId: z.string().uuid().optional(),
  note: z.string().optional(),
});

export const POST = withAuth(["admin"], async (req, { user }) => {
  const body = await req.json().catch(() => null);
  const parsed = actionSchema.safeParse(body);
  if (!parsed.success) return fail("Invalid order action");

  const { orderId, action, riderId, note } = parsed.data;
  if (action === "cancel") {
    const { data, error } = await db.rpc("transition_order", {
      p_order: orderId,
      p_to: "cancelled",
      p_actor: user.id,
      p_actor_role: user.role,
      p_note: note ?? "Cancelled by admin",
    });
    if (error) return fail(error.message, 400);
    await writeAuditLog({ actorId: user.id, action: "cancel_order", entity: "order", entityId: orderId });
    return ok(data);
  }

  if (action === "assign_rider" && riderId) {
    await db.from("orders").update({ rider_id: riderId }).eq("id", orderId);
    await db.from("rider_profiles").update({ on_delivery: true }).eq("user_id", riderId);
    const { data: ord } = await db.from("orders").select("status").eq("id", orderId).single();
    if (ord?.status === "packed") {
      await db.rpc("transition_order", {
        p_order: orderId,
        p_to: "rider_assigned",
        p_actor: user.id,
        p_actor_role: user.role,
        p_note: "Manually assigned by admin",
      });
    }
    await writeAuditLog({ actorId: user.id, action: "assign_rider", entity: "order", entityId: orderId, after: { riderId } });
    return ok({ assigned: true });
  }

  return fail("Unsupported action");
});

