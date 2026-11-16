import { z } from "zod";
import { db } from "@/lib/supabase/server";
import { fail, ok, withAuth } from "@/lib/auth/withAuth";

const schema = z.object({
  name: z.string().min(2).max(100),
  phone: z.string().min(8).max(20),
  vehicle_type: z.enum(["bike", "scooter", "ev", "cycle"]),
  vehicle_no: z.string().max(30).optional(),
  license_no: z.string().max(40).optional(),
  id_proof_type: z.string().max(30).optional(),
  id_proof_no: z.string().max(40).optional(),
  payout_upi: z.string().max(80).optional(),
  doc_urls: z.record(z.string(), z.string()).optional(),
});

export const POST = withAuth(null, async (req, { user }) => {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return fail("Invalid onboarding details");

  const { name, phone, ...riderFields } = parsed.data;

  await db
    .from("users")
    .update({
      name,
      phone,
      role: user.role === "customer" ? "rider" : user.role,
      updated_at: new Date().toISOString(),
    })
    .eq("id", user.id);

  const { data: profile, error } = await db
    .from("rider_profiles")
    .upsert(
      {
        user_id: user.id,
        ...riderFields,
        kyc_status: "pending",
      },
      { onConflict: "user_id" }
    )
    .select()
    .single();

  if (error) return fail(error.message, 500);
  return ok(profile);
});

