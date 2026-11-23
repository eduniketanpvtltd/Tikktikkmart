import { db } from "@/lib/supabase/server";
import { fail, ok, withAuth } from "@/lib/auth/withAuth";

export const GET = withAuth(null, async (_req, { user }) => {
  const [profileResult, activeResult, offerResult] = await Promise.all([
    db.from("rider_profiles").select("is_online,kyc_status,rating,vehicle_no,vehicle_type,home_store:stores!home_store_id(name)").eq("user_id", user.id).maybeSingle(),
    db
      .from("orders")
      .select("id,order_no,status,instructions,address_snapshot,eta_minutes,distance_m,payment_method,grand_total,pickup_code,store:stores(name,address,phone),items:order_items(quantity,name_snapshot),assignments:rider_assignments(payout)")
      .eq("rider_id", user.id)
      .eq("assignments.rider_id", user.id).eq("assignments.status", "accepted")
      .in("status", ["rider_assigned", "rider_at_store", "picked_up", "out_for_delivery", "arrived"])
      .order("placed_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    db
      .from("rider_assignments")
      .select("id,offered_at,payout,order:orders(id,order_no,grand_total,payment_method,distance_m,eta_minutes,address_snapshot,store:stores(name,address))")
      .eq("rider_id", user.id)
      .eq("status", "offered")
      .gte("offered_at", new Date(Date.now() - 30_000).toISOString())
      .order("offered_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  if (profileResult.error || activeResult.error || offerResult.error) {
    return fail("Couldn’t load the rider dashboard", 503);
  }
  return ok({ user, profile: profileResult.data, activeOrder: activeResult.data, pendingOffer: offerResult.data });
});

