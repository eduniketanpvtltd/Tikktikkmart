import { db } from "@/lib/supabase/server";
import { enrichProductsWithStore } from "./enrich";

const shelfSize = 8;

export async function getRelatedProducts(product: { id: string; category_id: string | null }, storeId: string | null) {
  const similarQuery = product.category_id
    ? db.from("products").select("*").eq("is_active", true).eq("category_id", product.category_id)
        .neq("id", product.id).order("created_at", { ascending: false }).limit(shelfSize)
    : Promise.resolve({ data: [] });

  const orderedItems = () => db.from("order_items")
    .select("order_id, product_variants!inner(product_id), orders!inner(status, placed_at)")
    .eq("orders.status", "delivered")
    .neq("status", "out_of_stock")
    .order("orders(placed_at)", { ascending: false });

  const [similar, matchingItems] = await Promise.all([
    similarQuery,
    orderedItems().eq("product_variants.product_id", product.id).limit(100),
  ]);
  const orderIds = [...new Set((matchingItems.data ?? []).map((item) => item.order_id))];
  const companions = orderIds.length
    ? await orderedItems().in("order_id", orderIds).neq("product_variants.product_id", product.id).limit(600)
    : { data: [] };

  const rank = (rows: NonNullable<typeof companions.data>) => {
    const ordersByProduct = new Map<string, Set<string>>();
    for (const item of rows) {
      const variant = item.product_variants as unknown as { product_id: string } | null;
      if (!variant?.product_id || !item.order_id) continue;
      const orders = ordersByProduct.get(variant.product_id) ?? new Set<string>();
      orders.add(item.order_id);
      ordersByProduct.set(variant.product_id, orders);
    }
    return [...ordersByProduct].sort((a, b) => b[1].size - a[1].size).map(([id]) => id).slice(0, 40);
  };

  const otherCategories = () => {
    const query = db.from("products").select("*").eq("is_active", true).neq("id", product.id);
    return product.category_id
      ? query.or(`category_id.neq.${product.category_id},category_id.is.null`)
      : query.not("category_id", "is", null);
  };
  let alsoBought = [];
  const rankedCompanions = rank(companions.data ?? []);
  if (rankedCompanions.length) {
    const { data } = await db.from("products").select("*").eq("is_active", true).in("id", rankedCompanions);
    const byId = new Map((data ?? []).map((entry) => [entry.id, entry]));
    alsoBought = rankedCompanions.flatMap((id) => byId.has(id) ? [byId.get(id)] : []).slice(0, shelfSize);
  }
  if (!alsoBought.length) {
    const recent = await orderedItems().neq("product_variants.product_id", product.id).limit(600);
    const rankedPopular = rank(recent.data ?? []);
    const [popular, catalog] = await Promise.all([
      rankedPopular.length ? otherCategories().in("id", rankedPopular) : Promise.resolve({ data: [] }),
      otherCategories().order("created_at", { ascending: false }).limit(40),
    ]);
    const byId = new Map((popular.data ?? []).map((entry) => [entry.id, entry]));
    const ordered = rankedPopular.flatMap((id) => byId.has(id) ? [byId.get(id)] : []);
    const remaining = (catalog.data ?? []).filter((entry) => !byId.has(entry.id))
      .sort((a, b) => (Number(b.review_count) || 0) - (Number(a.review_count) || 0));
    alsoBought = [...ordered, ...remaining].slice(0, shelfSize);
  }

  const similarProducts = similar.data ?? [];
  const enriched = await enrichProductsWithStore([...similarProducts, ...alsoBought], storeId);
  return { similar: enriched.slice(0, similarProducts.length), alsoBought: enriched.slice(similarProducts.length) };
}
