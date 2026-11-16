import { z } from "zod";
import { db } from "@/lib/supabase/server";
import { assertStoreAccess, fail, ok, withAuth } from "@/lib/auth/withAuth";
import { dispatchOrderToRider } from "@/lib/orders/dispatch";

const schema = z.object({
  action: z.enum(["accept", "reject", "start-picking", "pack"]),
  note: z.string().max(200).optional(),
});

const ACTION_TO_STATUS = {
  accept: "accepted_by_store",
  reject: "rejected_by_store",
  "start-picking": "picking",
  pack: "packed",
} as const;

export const POST = withAuth(["store_manager", "admin"], async (req, { user, params }) => {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return fail("Invalid action");

  const { data: order } = await db.from("orders").select("*").eq("id", params.id).maybeSingle();
  if (!order) return fail("Order not found", 404);
  if (!(await assertStoreAccess(user, order.store_id))) return fail("forbidden", 403);

  const nextStatus = ACTION_TO_STATUS[parsed.data.action];
  const { data: updated, error } = await db.rpc("transition_order", {
    p_order: order.id,
    p_to: nextStatus,
    p_actor: user.id,
    p_actor_role: user.role,
    p_note: parsed.data.note ?? null,
  });
  if (error) return fail(error.message, 400);

  let dispatch = null;
  if (nextStatus === "picking" || nextStatus === "packed") {
    dispatch = await dispatchOrderToRider(order.id);
  }

  return ok({ order: updated, dispatch });
});

