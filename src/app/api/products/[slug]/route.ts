import { NextRequest } from "next/server";
import { fail, ok } from "@/lib/auth/withAuth";
import { activeCatalogProducts, catalogProduct } from "@/lib/catalog/queries";
import { getRelatedProducts } from "@/lib/catalog/related";

export async function GET(
  req: NextRequest,
  route: { params: Promise<{ slug: string }> }
) {
  const { slug } = await route.params;
  const storeId = req.nextUrl.searchParams.get("storeId");
  const isId = /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(slug);

  const { data: product, error } = await activeCatalogProducts(storeId)
    .eq(isId ? "id" : "slug", slug)
    .maybeSingle();

  if (error) return fail(error.message, 500);
  if (!product) return fail("Product not found", 404);

  const enriched = catalogProduct(product, storeId);
  if (req.nextUrl.searchParams.get("related") === "1") {
    return ok(await getRelatedProducts(enriched, storeId));
  }
  return ok(enriched);
}
