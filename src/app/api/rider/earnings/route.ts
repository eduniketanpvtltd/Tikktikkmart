import { db } from "@/lib/supabase/server";
import { ok, withAuth } from "@/lib/auth/withAuth";

export const GET = withAuth(["rider", "admin"], async (_req, { user }) => {
  const [{ data: profile }, { data: assignments }, { data: payouts }, { data: history }] = await Promise.all([
    db.from("rider_profiles").select("*").eq("user_id", user.id).maybeSingle(),
    db
      .from("rider_assignments")
      .select("payout, order_id, responded_at")
      .eq("rider_id", user.id)
      .eq("status", "accepted"),
    db
      .from("rider_payouts")
      .select("*")
      .eq("rider_id", user.id)
      .order("period_end", { ascending: false }),
    db
      .from("orders")
      .select("id, order_no, status, grand_total, tip, payment_method, delivered_at, placed_at")
      .eq("rider_id", user.id)
      .order("placed_at", { ascending: false })
      .limit(30),
  ]);

  const totalEarned = (assignments ?? []).reduce((acc, a) => acc + Number(a.payout ?? 0), 0);

  return ok({
    codBalance: Number(profile?.cod_balance ?? 0),
    totalEarned,
    completedCount: (history ?? []).filter((o) => o.status === "delivered").length,
    payouts: payouts ?? [],
    history: history ?? [],
  });
});

