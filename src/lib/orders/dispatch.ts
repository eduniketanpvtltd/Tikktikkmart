import { db } from "@/lib/supabase/server";

/**
 * Finds nearest available riders for an order's store and creates an 'offered' assignment
 * for the highest-scoring rider who hasn't already rejected/expired this order.
 */
export async function dispatchOrderToRider(orderId: string): Promise<{ offered: boolean; riderId?: string; reason?: string }> {
  const { data: order } = await db
    .from("orders")
    .select("id, store_id, rider_id, status, distance_m")
    .eq("id", orderId)
    .maybeSingle();

  if (!order) return { offered: false, reason: "order not found" };
  if (order.rider_id) return { offered: false, reason: "already assigned" };
  if (!["picking", "packed"].includes(order.status)) {
    return { offered: false, reason: `not dispatchable in status ${order.status}` };
  }

  // Check if there is already an active pending offer
  const { data: existingOffer } = await db
    .from("rider_assignments")
    .select("id, rider_id, offered_at")
    .eq("order_id", orderId)
    .eq("status", "offered")
    .maybeSingle();

  if (existingOffer) {
    const ageMs = Date.now() - new Date(existingOffer.offered_at).getTime();
    if (ageMs < 30_000) {
      return { offered: true, riderId: existingOffer.rider_id };
    }
    // Expire stale offer
    await db
      .from("rider_assignments")
      .update({ status: "expired", responded_at: new Date().toISOString() })
      .eq("id", existingOffer.id);
  }

  // Get riders who already rejected/expired this order
  const { data: pastOffers } = await db
    .from("rider_assignments")
    .select("rider_id")
    .eq("order_id", orderId);
  const excludedIds = new Set((pastOffers ?? []).map((p) => p.rider_id));

  // Try 3km first, then 5km
  for (const radiusM of [3000, 5000, 10000]) {
    const { data: candidates } = await db.rpc("nearest_available_riders", {
      p_store: order.store_id,
      p_radius_m: radiusM,
      p_limit: 15,
    });
    const eligible = (candidates ?? []).filter(
      (c: { rider_id: string }) => !excludedIds.has(c.rider_id)
    );
    if (eligible.length > 0) {
      // Score: 0.6 * proximity + 0.2 * rating + 0.2 * idle_time (simplified with distance & rating)
      const scored = eligible
        .map((c: { rider_id: string; distance_m: number; rating: number }) => {
          const proxScore = Math.max(0, 1 - (c.distance_m ?? 0) / radiusM);
          const ratingScore = Number(c.rating ?? 5) / 5;
          return { ...c, score: 0.7 * proxScore + 0.3 * ratingScore };
        })
        .sort((a: { score: number }, b: { score: number }) => b.score - a.score);

      const top = scored[0];
      const distanceKm = Math.max(1, (order.distance_m ?? 1500) / 1000);
      const estimatedPayout = Math.round(25 + distanceKm * 8);

      await db.from("rider_assignments").insert({
        order_id: orderId,
        rider_id: top.rider_id,
        status: "offered",
        payout: estimatedPayout,
      });

      await db.from("notifications").insert({
        user_id: top.rider_id,
        title: "New delivery offer",
        body: `Earn ₹${estimatedPayout} — Tap to accept within 30s`,
        data: { orderId, payout: estimatedPayout },
      });

      return { offered: true, riderId: top.rider_id };
    }
  }

  return { offered: false, reason: "no available riders nearby" };
}

