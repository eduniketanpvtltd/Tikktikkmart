import { z } from "zod";
import { db } from "@/lib/supabase/server";
import { fail, ok, withAuth, writeAuditLog } from "@/lib/auth/withAuth";

export const GET = withAuth(["admin"], async () => {
  const { data, error } = await db
    .from("products")
    .select("*, category:categories(id, name), variants:product_variants(*)")
    .order("created_at", { ascending: false });
  if (error) return fail(error.message, 500);
  return ok(data ?? []);
});

const createSchema = z.object({
  category_id: z.string().uuid().nullable().optional(),
  name: z.string().min(1).max(150),
  slug: z.string().min(1).max(150),
  brand: z.string().max(100).optional(),
  description: z.string().max(1000).optional(),
  images: z.array(z.string()).optional(),
  tags: z.array(z.string()).optional(),
  hsn_code: z.string().max(30).optional(),
  gst_rate: z.number().min(0).max(28).optional(),
  // Optional initial variant
  variant_label: z.string().optional(),
  mrp: z.number().positive().optional(),
  base_price: z.number().positive().optional(),
  sku: z.string().optional(),
});

export const POST = withAuth(["admin"], async (req, { user }) => {
  const body = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return fail("Invalid product payload");

  const { variant_label, mrp, base_price, sku, ...prodFields } = parsed.data;
  const { data: prod, error } = await db.from("products").insert(prodFields).select().single();
  if (error) return fail(error.message, 400);

  if (variant_label && mrp && base_price) {
    await db.from("product_variants").insert({
      product_id: prod.id,
      label: variant_label,
      mrp,
      base_price,
      sku: sku || `${prod.slug.toUpperCase().slice(0, 8)}-${Date.now().toString().slice(-4)}`,
    });
  }

  await writeAuditLog({ actorId: user.id, action: "create", entity: "product", entityId: prod.id, after: prod });
  return ok(prod, 201);
});

export const DELETE = withAuth(["admin"], async (req, { user }) => {
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return fail("id required");
  const { error } = await db.from("products").delete().eq("id", id);
  if (error) return fail(error.message, 400);
  await writeAuditLog({ actorId: user.id, action: "delete", entity: "product", entityId: id });
  return ok({ deleted: true });
});

