import { NextRequest } from "next/server";
import { fail, ok } from "@/lib/auth/withAuth";
import { rankSearchProducts, relatedSearchProducts, searchExpression, searchWords } from "@/lib/catalog/search";
import { activeCatalogProducts, catalogProduct } from "@/lib/catalog/queries";
import type { Product } from "@/types/db";

function availableFirst(products: Product[]) {
  const unavailable = (product: Product) => !product.variants?.some((variant) =>
    variant.stock_available == null || variant.stock_available > 0);
  return products.sort((a, b) => Number(unavailable(a)) - Number(unavailable(b)));
}

export async function GET(req: NextRequest) {
  const brand = req.nextUrl.searchParams.get("brand")?.trim() ?? "";
  const words = searchWords(req.nextUrl.searchParams.get("q") ?? "");
  const storeId = req.nextUrl.searchParams.get("storeId");
  const withRelated = req.nextUrl.searchParams.get("includeRelated") === "1";

  const catalog = () => activeCatalogProducts(storeId);

  if (brand) {
    const { data, error } = await catalog().ilike("brand", brand).order("created_at", { ascending: false }).limit(100);
    if (error) return fail("Search is temporarily unavailable", 503);
    const matched = (data ?? []).map((product) => catalogProduct(product, storeId));
    if (!withRelated) return ok(availableFirst(matched));
    return ok({ products: availableFirst(matched), related: [] });
  }

  if (!words.length) return ok(withRelated ? { products: [], related: [] } : []);
  const { data, error } = await catalog().textSearch("search", searchExpression(words), { config: "simple" }).limit(30);
  if (error) return fail("Search is temporarily unavailable", 503);

  const direct = (data ?? []).map((product) => catalogProduct(product, storeId));
  const ranked = rankSearchProducts(direct, words);
  const rankedIds = new Set(ranked.map(({ id }) => id));
  let matched = [...ranked, ...direct.filter(({ id }) => !rankedIds.has(id))];
  let candidates: Product[] = [];

  if (!matched.length && words.some((word) => word.length >= 3)) {
    const fallback = await catalog().order("created_at", { ascending: false }).limit(160);
    if (fallback.error) return fail("Search is temporarily unavailable", 503);
    candidates = (fallback.data ?? []).map((product) => catalogProduct(product, storeId));
    matched = rankSearchProducts(candidates, words, true).slice(0, 30);
  }

  if (!withRelated) return ok(availableFirst(matched));

  const categoryIds = [...new Set(matched.map(({ category_id }) => category_id).filter((id): id is string => Boolean(id)))].slice(0, 5);
  if (!candidates.length && categoryIds.length) {
    const related = await catalog().in("category_id", categoryIds).order("created_at", { ascending: false }).limit(60);
    candidates = (related.data ?? []).map((product) => catalogProduct(product, storeId));
  }
  const related = relatedSearchProducts(candidates, matched, words).slice(0, 16);
  return ok({ products: availableFirst(matched), related: availableFirst(related) });
}
