import { db } from "@/lib/supabase/server";
import { fail, ok, withAuth } from "@/lib/auth/withAuth";

export const GET = withAuth(null, async (_req, { user }) => {
  const { data, error } = await db
    .from("orders")
    .select("*, store:stores(id, name, address), items:order_items(*)")
    .eq("user_id", user.id)
    .order("placed_at", { ascending: false })
    .limit(50);

  if (error) return fail(error.message, 500);
  return ok(data ?? []);
});

