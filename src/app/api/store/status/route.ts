import { z } from "zod";
import { db } from "@/lib/supabase/server";
import { assertStoreAccess, fail, ok, withAuth } from "@/lib/auth/withAuth";

const schema = z.object({
  storeId: z.string().uuid(),
  is_accepting_orders: z.boolean().optional(),
  prep_time_min: z.number().int().min(1).max(60).optional(),
});

export const POST = withAuth(["store_manager", "admin"], async (req, { user }) => {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return fail("Invalid store status payload");

  const { storeId, ...updates } = parsed.data;
  if (!(await assertStoreAccess(user, storeId))) return fail("forbidden", 403);

  const { data, error } = await db
    .from("stores")
    .update(updates)
    .eq("id", storeId)
    .select()
    .single();
  if (error) return fail(error.message, 500);
  return ok(data);
});

