import { db } from "@/lib/supabase/server";
import { stockedVariant } from "./queries";

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
      .map((v) => stockedVariant(v, invMap.get(v.id), storeId));
    return { ...p, variants: pVars };
  });
}

