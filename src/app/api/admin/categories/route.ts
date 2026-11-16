import { z } from "zod";
import { db } from "@/lib/supabase/server";
import { fail, ok, withAuth, writeAuditLog } from "@/lib/auth/withAuth";

export const GET = withAuth(["admin"], async () => {
  const { data, error } = await db.from("categories").select("*").order("sort_order", { ascending: true });
  if (error) return fail(error.message, 500);
  return ok(data ?? []);
});

const createSchema = z.object({
  name: z.string().min(1).max(100),
  slug: z.string().min(1).max(100),
  parent_id: z.string().uuid().nullable().optional(),
  image_url: z.string().nullable().optional(),
  sort_order: z.number().int().optional(),
});

export const POST = withAuth(["admin"], async (req, { user }) => {
  const body = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return fail("Invalid category payload");

  const { data, error } = await db.from("categories").insert(parsed.data).select().single();
  if (error) return fail(error.message, 400);
  await writeAuditLog({ actorId: user.id, action: "create", entity: "category", entityId: data.id, after: data });
  return ok(data, 201);
});

export const DELETE = withAuth(["admin"], async (req, { user }) => {
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return fail("id required");
  const { error } = await db.from("categories").delete().eq("id", id);
  if (error) return fail(error.message, 400);
  await writeAuditLog({ actorId: user.id, action: "delete", entity: "category", entityId: id });
  return ok({ deleted: true });
});

