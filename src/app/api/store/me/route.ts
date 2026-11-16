import { db } from "@/lib/supabase/server";
import { fail, ok, withAuth } from "@/lib/auth/withAuth";

export const GET = withAuth(["store_manager", "admin"], async (_req, { user }) => {
  if (user.role === "admin" || user.role === "super_admin") {
    const { data, error } = await db.from("stores").select("*").order("created_at", { ascending: false });
    if (error) return fail(error.message, 500);
    return ok(data ?? []);
  }

  const { data: staffRows, error } = await db
    .from("store_staff")
    .select("store:stores(*)")
    .eq("user_id", user.id);
  if (error) return fail(error.message, 500);

  const stores = (staffRows ?? []).map((r: any) => (Array.isArray(r.store) ? r.store[0] : r.store)).filter(Boolean);
  return ok(stores);
});

