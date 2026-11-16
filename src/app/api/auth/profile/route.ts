import { z } from "zod";
import { db } from "@/lib/supabase/server";
import { fail, ok, withAuth } from "@/lib/auth/withAuth";

const schema = z.object({
  name: z.string().min(1).max(100).optional(),
  phone: z.string().min(8).max(20).optional(),
});

export const PATCH = withAuth(null, async (req, { user }) => {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return fail("Invalid profile data");

  const { data, error } = await db
    .from("users")
    .update({ ...parsed.data, updated_at: new Date().toISOString() })
    .eq("id", user.id)
    .select()
    .single();
  if (error) return fail(error.message, 500);
  return ok(data);
});

