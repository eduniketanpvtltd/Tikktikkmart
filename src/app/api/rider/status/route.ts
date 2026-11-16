import { z } from "zod";
import { db } from "@/lib/supabase/server";
import { fail, ok, withAuth } from "@/lib/auth/withAuth";

const schema = z.object({
  is_online: z.boolean(),
});

export const POST = withAuth(["rider", "admin"], async (req, { user }) => {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return fail("Invalid status");

  const { data: profile } = await db
    .from("rider_profiles")
    .select("kyc_status")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!profile) return fail("Rider profile not found", 404);
  if (profile.kyc_status !== "approved") {
    return fail(`KYC status is ${profile.kyc_status}. Admin approval required.`, 403);
  }

  const { data, error } = await db
    .from("rider_profiles")
    .update({ is_online: parsed.data.is_online })
    .eq("user_id", user.id)
    .select()
    .single();

  if (error) return fail(error.message, 500);
  return ok(data);
});

