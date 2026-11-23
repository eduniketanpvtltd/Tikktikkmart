import { db } from "@/lib/supabase/server";
import { ok, withAuth } from "@/lib/auth/withAuth";

export const GET = withAuth(null, async (_req, { user }) => {
  const [{ data: profile }, { data: activeOrder }, { data: pendingOffer }] = await Promise.all([
    db.from("rider_profiles").select("*").eq("user_id", user.id).maybeSingle(),
    db
      .from("orders")
      .select("*, store:stores(id, name, address, phone), items:order_items(*)")
      .eq("rider_id", user.id)
      .in("status", ["rider_assigned", "rider_at_store", "picked_up", "out_for_delivery", "arrived"])
      .order("placed_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    db
      .from("rider_assignments")
      .select("*, order:orders(id, order_no, grand_total, payment_method, address_snapshot, store:stores(id, name, address))")
      .eq("rider_id", user.id)
      .eq("status", "offered")
      .order("offered_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  if (activeOrder) delete activeOrder.delivery_otp;
  return ok({ user, profile, activeOrder, pendingOffer });
});

