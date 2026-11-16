import { z } from "zod";
import { db } from "@/lib/supabase/server";
import { fail, ok, withAuth } from "@/lib/auth/withAuth";

const schema = z.object({
  product_id: z.string().uuid(),
  label: z.string().min(1).max(60),
  sku: z.string().max(60).optional(),
  barcode: z.string().max(60).optional(),
  mrp: z.number().positive(),
  base_price: z.number().positive(),
  max_qty_per_order: z.number().int().min(1).max(100).optional(),
});

export const POST = withAuth(["admin"], async (req) => {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return fail("Invalid variant payload");

  const { data, error } = await db.from("product_variants").insert(parsed.data).select().single();
  if (error) return fail(error.message, 400);
  return ok(data, 201);
});

