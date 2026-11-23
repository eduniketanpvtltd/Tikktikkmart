import { NextRequest } from "next/server";
import { db } from "@/lib/supabase/server";
import { fail, ok } from "@/lib/auth/withAuth";
import { activeCatalogProducts, catalogProduct } from "@/lib/catalog/queries";

export async function GET(req: NextRequest) {
  const storeId = req.nextUrl.searchParams.get("storeId");

  const [{ data: banners, error: bErr }, { data: categories, error: cErr }, { data: products, error: pErr }] =
    await Promise.all([
      db.from("banners").select("*").eq("is_active", true).order("sort_order", { ascending: true }),
      db.from("categories").select("*").eq("is_active", true).order("sort_order", { ascending: true }),
      activeCatalogProducts(storeId).order("created_at", { ascending: false }).limit(40),
    ]);

  if (bErr || cErr || pErr) {
    return fail(bErr?.message || cErr?.message || pErr?.message || "Failed to load home", 500);
  }

  return ok({
    banners: banners ?? [],
    categories: categories ?? [],
    products: (products ?? []).map((product) => catalogProduct(product, storeId)),
  });
}
