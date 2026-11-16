import { db } from "@/lib/supabase/server";

/**
 * Enriches products with their active variants and store-specific stock/price.
 */
export async function enrichProductsWithStore(products: any[], storeId: string | null) {
  if (!products.length) return [];
  const productIds = products.map((p) => p.id);

  const { data: variants } = await db
    .from("product_variants")
    .select("*")
    .in("product_id", productIds)
    .eq("is_active", true);

  const variantIds = (variants ?? []).map((v) => v.id);
  let invMap = new Map<string, any>();

  if (storeId && variantIds.length) {
    const { data: inv } = await db
      .from("store_inventory")
      .select("variant_id, quantity, reserved, price_override, is_available, rack_location")
      .eq("store_id", storeId)
      .in("variant_id", variantIds);
    invMap = new Map((inv ?? []).map((i) => [i.variant_id, i]));
  }

  return products.map((p) => {
    const pVars = (variants ?? [])
      .filter((v) => v.product_id === p.id)
      .map((v) => {
        const inv = invMap.get(v.id);
        const stockAvailable = storeId
          ? inv && inv.is_available
            ? Math.max(0, inv.quantity - inv.reserved)
            : 0
          : 99;
        return {
          ...v,
          mrp: Number(v.mrp),
          base_price: Number(v.base_price),
          effective_price: Number(inv?.price_override ?? v.base_price),
          stock_available: stockAvailable,
          rack_location: inv?.rack_location ?? null,
        };
      });
    return { ...p, variants: pVars };
  });
}

