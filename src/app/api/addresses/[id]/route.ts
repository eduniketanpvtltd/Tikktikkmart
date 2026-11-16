import { db } from "@/lib/supabase/server";
import { fail, ok, withAuth } from "@/lib/auth/withAuth";

export const DELETE = withAuth(null, async (_req, { user, params }) => {
  const { error } = await db
    .from("addresses")
    .delete()
    .eq("id", params.id)
    .eq("user_id", user.id);
  if (error) return fail(error.message, 500);
  return ok({ deleted: true });
});

