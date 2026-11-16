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

  const { data: product, error } = await db
    .from("products")
    .select("*")
    .eq("slug", slug)
    .eq("is_active", true)
    .maybeSingle();

  if (error) return fail(error.message, 500);
  if (!product) return fail("Product not found", 404);

  const [enriched] = await enrichProductsWithStore([product], storeId);
  return ok(enriched);
}
