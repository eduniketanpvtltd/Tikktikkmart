import { z } from "zod";
import { db } from "@/lib/supabase/server";
import { fail, ok, withAuth, writeAuditLog } from "@/lib/auth/withAuth";

export const GET = withAuth(["admin"], async () => {
  const { data, error } = await db
    .from("rider_profiles")
    .select("*, user:users(id, name, email, phone, photo_url, is_blocked)")
    .order("kyc_status", { ascending: true });
  if (error) return fail(error.message, 500);
  return ok(data ?? []);
});

const schema = z.object({
  userId: z.string().uuid(),
  kyc_status: z.enum(["approved", "rejected", "suspended", "pending"]),
});

export const POST = withAuth(["admin"], async (req, { user }) => {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return fail("Invalid rider KYC action");

  const { userId, kyc_status } = parsed.data;
  const { data, error } = await db
    .from("rider_profiles")
    .update({ kyc_status, is_online: kyc_status === "approved" ? undefined : false })
    .eq("user_id", userId)
    .select()
    .single();
  if (error) return fail(error.message, 400);

  if (kyc_status === "approved") {
    await db.from("users").update({ role: "rider" }).eq("id", userId);
    await db.from("notifications").insert({
      user_id: userId,
      title: "KYC Approved",
      body: "You can now go online and accept deliveries on TikTikMart!",
    });
  }

  await writeAuditLog({ actorId: user.id, action: `rider_${kyc_status}`, entity: "rider_profile", entityId: userId });
  return ok(data);
});

