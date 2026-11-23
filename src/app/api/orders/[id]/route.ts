import { z } from "zod";
import { db } from "@/lib/supabase/server";
import { assertStoreAccess, fail, ok, withAuth } from "@/lib/auth/withAuth";
import { enrichProductsWithStore } from "@/lib/catalog/enrich";
import { readCoordinates } from "@/lib/maps/coordinates";
import { activeRouteStatuses, isRouteActive } from "@/lib/orders/tracking";

export const GET = withAuth(null, async (req, { user, params }) => {
  const { data: order, error } = await db
    .from("orders")
    .select("*, store:stores(id, name, address, phone, location, prep_time_min), items:order_items(*), history:order_status_history(to_status,created_at)")
    .eq("id", params.id)
    .maybeSingle();

  if (error) return fail("Could not load order tracking", 500);
  if (!order) return fail("Order not found", 404);

  const isCustomer = order.user_id === user.id;
  const isRider = order.rider_id === user.id;
  const isStaff = ["admin", "super_admin"].includes(user.role) ||
    (user.role === "store_manager" && Boolean(order.store_id) && await assertStoreAccess(user, order.store_id));
  if (!isCustomer && !isRider && !isStaff) return fail("forbidden", 403);

  if (req.nextUrl.searchParams.get("reorder") === "1") {
    if (!isCustomer || order.status !== "delivered") return fail("This order cannot be reordered", 409);
    const store = req.nextUrl.searchParams.get("storeId");
    if (!store || !z.guid().safeParse(store).success) return fail("Choose a delivery location to reorder");
    const ids = order.items.flatMap((item: { variant_id: string | null; status: string | null }) =>
      item.variant_id && item.status !== "out_of_stock" ? [item.variant_id] : []);
    if (!ids.length) return ok([]);
    const { data: variants, error: variantError } = await db.from("product_variants")
      .select("product_id").in("id", ids).eq("is_active", true);
    if (variantError) return fail("Could not check current stock", 503);
    if (!variants?.length) return ok([]);
    const { data: products, error: productError } = await db.from("products").select("*")
      .in("id", [...new Set(variants.map(({ product_id }) => product_id))]).eq("is_active", true);
    if (productError) return fail("Could not check current stock", 503);
    return ok(await enrichProductsWithStore(products ?? [], store));
  }

  const moving = isRouteActive(order.status);
  let rider = null;
  let riderPosition = null;

  if (order.rider_id && isCustomer && moving) {
    const [{ data: profile }, { data: vehicle }, { data: latest }] = await Promise.all([
      db.from("users").select("name, phone, photo_url").eq("id", order.rider_id).maybeSingle(),
      db.from("rider_profiles").select("rating, vehicle_type, vehicle_no").eq("user_id", order.rider_id).maybeSingle(),
      db.from("rider_locations").select("location, updated_at").eq("rider_id", order.rider_id).maybeSingle(),
    ]);
    if (profile) rider = { ...profile, rating: vehicle?.rating ?? null, vehicle_type: vehicle?.vehicle_type ?? null,
      vehicle_number: vehicle?.vehicle_no ?? null };
    const point = readCoordinates(latest?.location);
    const pickedUp = order.history.find((entry: { to_status: string }) => entry.to_status === "picked_up");
    const positionTime = Date.parse(latest?.updated_at ?? "");
    if (point && positionTime >= Date.parse(pickedUp?.created_at ?? order.placed_at) && Date.now() - positionTime < 90_000) {
      riderPosition = { ...point, updatedAt: latest!.updated_at };
    }
  }

  const placedAt = Date.parse(order.placed_at);
  const eta = order.eta_minutes ?? (order.store?.prep_time_min != null ? order.store.prep_time_min + 8 : null);
  const estimatedAt = eta > 0 && Number.isFinite(placedAt) ? new Date(placedAt + eta * 60_000).toISOString() : null;
  const tracking = {
    store: isCustomer ? readCoordinates(order.store?.location) : null,
    drop: isCustomer ? readCoordinates(order.address_snapshot?.location) : null,
    rider: riderPosition,
    estimatedAt,
  };
  if (order.store) delete order.store.location;
  if (!isCustomer || !moving) delete order.delivery_otp;
  if (!isRider) delete order.pickup_code;
  delete order.idempotency_key;
  return ok({ ...order, rider, tracking });
});

const updates = z.discriminatedUnion("action", [
  z.object({ action: z.literal("instructions"), instructions: z.string().max(300) }),
  z.object({ action: z.literal("rating"), rating: z.number().int().min(1).max(5) }),
  z.object({ action: z.literal("add-item"), variantId: z.uuid() }),
]);

export const PATCH = withAuth(null, async (req, { user, params }) => {
  const input = updates.safeParse(await req.json().catch(() => null));
  if (!input.success) return fail("Invalid order update");
  const change = input.data;

  if (change.action === "add-item") {
    const { error } = await db.rpc("add_order_item", { p_order: params.id, p_user: user.id, p_variant: change.variantId });
    if (error?.code === "P0001") return fail(error.message, 409);
    if (error) return fail("Add-ons are currently unavailable", 503);
    return ok(null);
  }

  const isRating = change.action === "rating";
  const values = isRating ? { customer_rating: change.rating } : { instructions: change.instructions.trim() || null };
  const editable = isRating ? ["delivered"] : ["placed", "payment_pending", "confirmed", "accepted_by_store", "picking", "packed", "rider_assigned", "rider_at_store", ...activeRouteStatuses];
  const { data, error } = await db.from("orders").update(values).eq("id", params.id).eq("user_id", user.id)
    .in("status", editable).select("id").maybeSingle();
  if (error) return fail(isRating ? "Ratings are currently unavailable" : "Could not save delivery instructions", 503);
  if (!data) return fail("This order can no longer be updated", 409);
  return ok(values);
});
