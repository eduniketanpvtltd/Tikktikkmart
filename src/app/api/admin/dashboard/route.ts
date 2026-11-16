import { db } from "@/lib/supabase/server";
import { ok, withAuth } from "@/lib/auth/withAuth";

export const GET = withAuth(["admin"], async () => {
  const todayIso = new Date(new Date().setHours(0, 0, 0, 0)).toISOString();

  const [
    { data: todayOrders },
    { count: activeStores },
    { count: onlineRiders },
    { count: pendingKyc },
    { data: recentOrders },
  ] = await Promise.all([
    db.from("orders").select("grand_total, status").gte("placed_at", todayIso),
    db.from("stores").select("*", { count: "exact", head: true }).eq("is_active", true).eq("is_accepting_orders", true),
    db.from("rider_profiles").select("*", { count: "exact", head: true }).eq("is_online", true),
    db.from("rider_profiles").select("*", { count: "exact", head: true }).eq("kyc_status", "pending"),
    db
      .from("orders")
      .select("id, order_no, status, grand_total, payment_method, placed_at, store:stores(name)")
      .order("placed_at", { ascending: false })
      .limit(10),
  ]);

  const gmvToday = (todayOrders ?? [])
    .filter((o) => !["cancelled", "payment_failed", "rejected_by_store"].includes(o.status))
    .reduce((acc, o) => acc + Number(o.grand_total ?? 0), 0);

  const liveOrdersCount = (todayOrders ?? []).filter(
    (o) => !["delivered", "cancelled", "payment_failed", "rejected_by_store", "refunded"].includes(o.status)
  ).length;

  return ok({
    ordersToday: (todayOrders ?? []).length,
    liveOrders: liveOrdersCount,
    gmvToday: Number(gmvToday.toFixed(2)),
    activeStores: activeStores ?? 0,
    onlineRiders: onlineRiders ?? 0,
    pendingKyc: pendingKyc ?? 0,
    recentOrders: recentOrders ?? [],
  });
});

