import { z } from "zod";
import { db } from "@/lib/supabase/server";
import { assertStoreAccess, fail, ok, withAuth } from "@/lib/auth/withAuth";

const schema = z.object({
  status: z.enum(["picked", "out_of_stock"]),
});

export const POST = withAuth(["store_manager", "admin"], async (req, { user, params }) => {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return fail("Invalid item status");

  const { data: order } = await db.from("orders").select("id, store_id").eq("id", params.id).maybeSingle();
  if (!order) return fail("Order not found", 404);
  if (!(await assertStoreAccess(user, order.store_id))) return fail("forbidden", 403);

  const { data: item } = await db
    .from("order_items")
    .select("*")
    .eq("id", params.itemId)
    .eq("order_id", order.id)
    .maybeSingle();
  if (!item) return fail("Order item not found", 404);

  const { data: updated, error } = await db
    .from("order_items")
    .update({
      status: parsed.data.status,
      picked_quantity: parsed.data.status === "picked" ? item.quantity : 0,
    })
    .eq("id", item.id)
    .select()
    .single();

  if (error) return fail(error.message, 500);
  return ok(updated);
});

