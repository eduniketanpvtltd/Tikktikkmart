import { z } from "zod";
import { db } from "@/lib/supabase/server";
import { fail, ok, withAuth } from "@/lib/auth/withAuth";

export const GET = withAuth(["admin"], async () => {
  const { data, error } = await db
    .from("rider_payouts")
    .select("*, rider:users(name, email, phone)")
    .order("period_end", { ascending: false });
  if (error) return fail(error.message, 500);
  return ok(data ?? []);
});

const actionSchema = z.object({
  action: z.enum(["generate", "mark_paid"]),
  payoutId: z.string().uuid().optional(),
  reference: z.string().optional(),
});

export const POST = withAuth(["admin"], async (req) => {
  const body = await req.json().catch(() => null);
  const parsed = actionSchema.safeParse(body);
  if (!parsed.success) return fail("Invalid payout action");

  if (parsed.data.action === "mark_paid" && parsed.data.payoutId) {
    const { data, error } = await db
      .from("rider_payouts")
      .update({
        status: "paid",
        paid_at: new Date().toISOString(),
        reference: parsed.data.reference ?? `PAY-${Date.now()}`,
      })
      .eq("id", parsed.data.payoutId)
      .select()
      .single();
    if (error) return fail(error.message, 400);
    return ok(data);
  }

  // Generate payout rows for approved riders with accepted assignments
  const { data: riders } = await db.from("rider_profiles").select("user_id, cod_balance").eq("kyc_status", "approved");
  const today = new Date().toISOString().slice(0, 10);
  const weekAgo = new Date(Date.now() - 7 * 86400_000).toISOString().slice(0, 10);

  let created = 0;
  for (const r of riders ?? []) {
    const { data: offers } = await db
      .from("rider_assignments")
      .select("payout")
      .eq("rider_id", r.user_id)
      .eq("status", "accepted");
    if (!offers?.length) continue;

    const base = offers.reduce((acc, o) => acc + Number(o.payout ?? 0), 0);
    const codDed = Number(r.cod_balance ?? 0);
    const net = Math.max(0, base - codDed);
    await db.from("rider_payouts").insert({
      rider_id: r.user_id,
      period_start: weekAgo,
      period_end: today,
      deliveries: offers.length,
      base,
      incentives: 0,
      tips: 0,
      cod_deduction: codDed,
      net,
      status: "pending",
    });
    created++;
  }

  return ok({ generated: created });
});

