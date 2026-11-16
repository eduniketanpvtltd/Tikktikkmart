import { db } from "@/lib/supabase/server";
import { assertStoreAccess, fail, ok, withAuth } from "@/lib/auth/withAuth";

export const GET = withAuth(["store_manager", "admin"], async (req, { user }) => {
  const storeId = req.nextUrl.searchParams.get("storeId");
  if (!storeId) return fail("storeId required");
  if (!(await assertStoreAccess(user, storeId))) return fail("forbidden", 403);

  const { data, error } = await db
    .from("orders")
    .select("*, items:order_items(*), customer:users!orders_user_id_fkey(name, phone)")
    .eq("store_id", storeId)
    .not("status", "in", "(payment_pending,payment_failed)")
    .order("placed_at", { ascending: false })
    .limit(60);

  if (error) return fail(error.message, 500);
  return ok(data ?? []);
});

