import { NextRequest } from "next/server";
import { db } from "@/lib/supabase/server";
import { fail, ok } from "@/lib/auth/withAuth";
import { enrichProductsWithStore } from "@/lib/catalog/enrich";

export async function GET(
  req: NextRequest,
  route: { params: Promise<{ slug: string }> }
) {
  const { slug } = await route.params;
  const storeId = req.nextUrl.searchParams.get("storeId");

  const { data: category } = await db
    .from("categories")
    .select("*")
    .eq("slug", slug)
    .eq("is_active", true)
    .maybeSingle();

  if (!category) return fail("Category not found", 404);

  const { data: subcats } = await db
    .from("categories")
    .select("*")
    .eq("parent_id", category.id)
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  const catIds = [category.id, ...(subcats ?? []).map((s) => s.id)];
  const { data: products, error } = await db
    .from("products")
    .select("*")
    .in("category_id", catIds)
    .eq("is_active", true);

  if (error) return fail(error.message, 500);
  const enriched = await enrichProductsWithStore(products ?? [], storeId);

  return ok({ category, subcategories: subcats ?? [], products: enriched });
}
