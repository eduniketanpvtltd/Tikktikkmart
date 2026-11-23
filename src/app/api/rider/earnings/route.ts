import { db } from "@/lib/supabase/server";
import { fail, ok, withAuth } from "@/lib/auth/withAuth";

export const GET = withAuth(["rider", "admin"], async (req, { user }) => {
  const summaryOnly = req.nextUrl.searchParams.get("summary") === "1";
  const indiaDay = (date: Date) => date.toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
  const days = Array.from({ length: 7 }, (_, i) => indiaDay(new Date(Date.now() - (6 - i) * 86_400_000)));
  const skip = { data: null, error: null };
  const [{ data: profile, error: profileError }, { data: assignments, error: assignmentError }, { data: payouts }, { data: history }, { data: recentDrops, error: dropError }] = await Promise.all([
    db.from("rider_profiles").select("cod_balance").eq("user_id", user.id).maybeSingle(),
    summaryOnly ? skip : db
      .from("rider_assignments")
      .select("payout")
      .eq("rider_id", user.id)
      .eq("status", "accepted"),
    summaryOnly ? skip : db
      .from("rider_payouts")
      .select("*")
      .eq("rider_id", user.id)
      .order("period_end", { ascending: false }),
    summaryOnly ? skip : db
      .from("orders")
      .select("id, order_no, status, grand_total, tip, payment_method, delivered_at, placed_at")
      .eq("rider_id", user.id)
      .order("placed_at", { ascending: false })
      .limit(30),
    db.from("orders").select("id,order_no,delivered_at,distance_m,address_snapshot,assignments:rider_assignments(payout)")
      .eq("rider_id", user.id).eq("status", "delivered")
      .eq("assignments.rider_id", user.id).eq("assignments.status", "accepted")
      .gte("delivered_at", `${days[0]}T00:00:00+05:30`).order("delivered_at", { ascending: false }),
  ]);

  if (dropError || assignmentError || profileError) return fail("Couldn’t load rider earnings", 503);
  const drops = (recentDrops ?? []).map((drop) => ({
    id: drop.id, orderNumber: `TTM-${drop.order_no}`,
    customerArea: drop.address_snapshot?.city || drop.address_snapshot?.landmark || "Delivered",
    completedAt: new Date(drop.delivered_at).toLocaleTimeString("en-IN", {
      hour: "numeric", minute: "2-digit", timeZone: "Asia/Kolkata",
    }),
    day: indiaDay(new Date(drop.delivered_at)),
    distanceKm: drop.distance_m == null ? null : drop.distance_m / 1_000,
    payout: Number(drop.assignments[0]?.payout ?? 0),
  }));
  const today = drops.filter((drop) => drop.day === days.at(-1));
  const dailyEarnings = days.map((day) => drops.filter((drop) => drop.day === day).reduce((total, drop) => total + drop.payout, 0));

  const summary = {
    todayTrips: today.length,
    todayEarned: dailyEarnings.at(-1) ?? 0,
    todayDrops: today,
    dailyEarnings,
    codBalance: Number(profile?.cod_balance ?? 0),
  };
  if (summaryOnly) return ok(summary);

  return ok({
    ...summary,
    totalEarned: (assignments ?? []).reduce((acc, assignment) => acc + Number(assignment.payout ?? 0), 0),
    completedCount: (history ?? []).filter((o) => o.status === "delivered").length,
    payouts: payouts ?? [],
    history: history ?? [],
  });
});

