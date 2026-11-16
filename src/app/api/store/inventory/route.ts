import { z } from "zod";
import { db } from "@/lib/supabase/server";
import { assertStoreAccess, fail, ok, withAuth } from "@/lib/auth/withAuth";

export const GET = withAuth(["store_manager", "admin"], async (req, { user }) => {
  const storeId = req.nextUrl.searchParams.get("storeId");
  if (!storeId) return fail("storeId required");
  if (!(await assertStoreAccess(user, storeId))) return fail("forbidden", 403);

  const { data: variants, error } = await db
    .from("product_variants")
    .select("id, label, sku, barcode, mrp, base_price, product:products(id, name, brand, images)")
    .eq("is_active", true);
  if (error) return fail(error.message, 500);

  const { data: inv } = await db
    .from("store_inventory")
    .select("*")
    .eq("store_id", storeId);

  const invMap = new Map((inv ?? []).map((r) => [r.variant_id, r]));

  const rows = (variants ?? []).map((v: any) => {
    const prod = Array.isArray(v.product) ? v.product[0] : v.product;
    const itemInv = invMap.get(v.id);
    return {
      variant_id: v.id,
      product_name: prod?.name ?? "Product",
      brand: prod?.brand ?? "",
      image: prod?.images?.[0] ?? null,
      label: v.label,
      sku: v.sku,
      barcode: v.barcode,
      mrp: Number(v.mrp),
      base_price: Number(v.base_price),
      quantity: itemInv?.quantity ?? 0,
      reserved: itemInv?.reserved ?? 0,
      price_override: itemInv?.price_override != null ? Number(itemInv.price_override) : null,
      rack_location: itemInv?.rack_location ?? "",
      is_available: itemInv?.is_available ?? false,
    };
  });

  return ok(rows);
});

const patchSchema = z.object({
  storeId: z.string().uuid(),
  variantId: z.string().uuid(),
  quantity: z.number().int().min(0).optional(),
  price_override: z.number().min(0).nullable().optional(),
  rack_location: z.string().max(40).optional(),
  is_available: z.boolean().optional(),
  reason: z.string().max(40).optional(),
});

export const PATCH = withAuth(["store_manager", "admin"], async (req, { user }) => {
  const body = await req.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) return fail("Invalid inventory update");

  const { storeId, variantId, quantity, price_override, rack_location, is_available, reason } = parsed.data;
  if (!(await assertStoreAccess(user, storeId))) return fail("forbidden", 403);

  const { data: existing } = await db
    .from("store_inventory")
    .select("quantity")
    .eq("store_id", storeId)
    .eq("variant_id", variantId)
    .maybeSingle();

  const payload: Record<string, unknown> = {
    store_id: storeId,
    variant_id: variantId,
    updated_at: new Date().toISOString(),
  };
  if (quantity !== undefined) payload.quantity = quantity;
  if (price_override !== undefined) payload.price_override = price_override;
  if (rack_location !== undefined) payload.rack_location = rack_location;
  if (is_available !== undefined) payload.is_available = is_available;

  const { data, error } = await db
    .from("store_inventory")
    .upsert(payload, { onConflict: "store_id,variant_id" })
    .select()
    .single();
  if (error) return fail(error.message, 500);

  if (quantity !== undefined) {
    const delta = quantity - (existing?.quantity ?? 0);
    if (delta !== 0) {
      await db.from("inventory_movements").insert({
        store_id: storeId,
        variant_id: variantId,
        delta,
        reason: reason ?? "manual",
        actor_id: user.id,
      });
    }
  }

  return ok(data);
});

