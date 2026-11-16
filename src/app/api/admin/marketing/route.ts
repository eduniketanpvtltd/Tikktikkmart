import { z } from "zod";
import { db } from "@/lib/supabase/server";
import { fail, ok, withAuth } from "@/lib/auth/withAuth";

export const GET = withAuth(["admin"], async () => {
  const [{ data: coupons }, { data: banners }] = await Promise.all([
    db.from("coupons").select("*").order("code", { ascending: true }),
    db.from("banners").select("*").order("sort_order", { ascending: true }),
  ]);
  return ok({ coupons: coupons ?? [], banners: banners ?? [] });
});

const couponSchema = z.object({
  kind: z.literal("coupon"),
  code: z.string().min(2).max(30),
  description: z.string().max(200).optional(),
  type: z.enum(["flat", "percent"]),
  value: z.number().positive(),
  max_discount: z.number().positive().nullable().optional(),
  min_order: z.number().min(0).default(0),
});

const bannerSchema = z.object({
  kind: z.literal("banner"),
  image_url: z.string().url(),
  link_type: z.string().optional(),
  link_value: z.string().optional(),
  sort_order: z.number().int().default(0),
});

export const POST = withAuth(["admin"], async (req) => {
  const body = await req.json().catch(() => null);
  if (body?.kind === "coupon") {
    const parsed = couponSchema.safeParse(body);
    if (!parsed.success) return fail("Invalid coupon");
    const { kind: _k, ...rest } = parsed.data;
    const { data, error } = await db
      .from("coupons")
      .insert({ ...rest, code: rest.code.toUpperCase() })
      .select()
      .single();
    if (error) return fail(error.message, 400);
    return ok(data, 201);
  }
  if (body?.kind === "banner") {
    const parsed = bannerSchema.safeParse(body);
    if (!parsed.success) return fail("Invalid banner");
    const { kind: _k, ...rest } = parsed.data;
    const { data, error } = await db.from("banners").insert(rest).select().single();
    if (error) return fail(error.message, 400);
    return ok(data, 201);
  }
  return fail("Unsupported marketing entity");
});

export const DELETE = withAuth(["admin"], async (req) => {
  const kind = req.nextUrl.searchParams.get("kind");
  const id = req.nextUrl.searchParams.get("id");
  if (!id || !kind) return fail("kind and id required");
  const table = kind === "coupon" ? "coupons" : "banners";
  const { error } = await db.from(table).delete().eq("id", id);
  if (error) return fail(error.message, 400);
  return ok({ deleted: true });
});

