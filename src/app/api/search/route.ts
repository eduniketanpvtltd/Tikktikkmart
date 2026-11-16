import { NextRequest } from "next/server";
import { db } from "@/lib/supabase/server";
import { fail, ok } from "@/lib/auth/withAuth";
import { enrichProductsWithStore } from "@/lib/catalog/enrich";

export async function GET(req: NextRequest) {
  const q = (req.nextUrl.searchParams.get("q") ?? "").trim();
  const storeId = req.nextUrl.searchParams.get("storeId");
  if (!q) return ok([]);

  const { data: products, error } = await db
    .from("products")
    .select("*")
    .eq("is_active", true)
    .or(`name.ilike.%${q}%,brand.ilike.%${q}%`)
    .limit(30);

  if (error) return fail(error.message, 500);
  const enriched = await enrichProductsWithStore(products ?? [], storeId);
  return ok(enriched);
}
