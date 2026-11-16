import { z } from "zod";
import { db } from "@/lib/supabase/server";
import { fail, ok, withAuth, writeAuditLog } from "@/lib/auth/withAuth";

export const GET = withAuth(["admin"], async () => {
  const { data, error } = await db
    .from("stores")
    .select("*, staff:store_staff(user:users(id, name, email))")
    .order("created_at", { ascending: false });
  if (error) return fail(error.message, 500);
  return ok(data ?? []);
});

const createSchema = z.object({
  name: z.string().min(2).max(120),
  code: z.string().min(2).max(40),
  address: z.string().max(300).optional(),
  phone: z.string().max(30).optional(),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  service_radius_m: z.number().int().min(500).max(50000).default(3000),
  prep_time_min: z.number().int().min(1).max(60).default(5),
  manager_email: z.string().email().optional(),
});

export const POST = withAuth(["admin"], async (req, { user }) => {
  const body = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return fail("Invalid store payload");

  const { lat, lng, manager_email, ...rest } = parsed.data;
  const { data: store, error } = await db
    .from("stores")
    .insert({
      ...rest,
      location: `SRID=4326;POINT(${lng} ${lat})`,
    })
    .select()
    .single();
  if (error) return fail(error.message, 400);

  if (manager_email) {
    const { data: mgr } = await db.from("users").select("id, role").eq("email", manager_email.toLowerCase()).maybeSingle();
    if (mgr) {
      await db.from("store_staff").upsert({ store_id: store.id, user_id: mgr.id });
      if (mgr.role === "customer") {
        await db.from("users").update({ role: "store_manager" }).eq("id", mgr.id);
      }
    }
  }

  await writeAuditLog({ actorId: user.id, action: "create", entity: "store", entityId: store.id, after: store });
  return ok(store, 201);
});

export const PATCH = withAuth(["admin"], async (req, { user }) => {
  const body = await req.json().catch(() => null);
  if (!body?.id) return fail("id required");

  const updates: Record<string, unknown> = {};
  if (typeof body.is_active === "boolean") updates.is_active = body.is_active;
  if (typeof body.is_accepting_orders === "boolean") updates.is_accepting_orders = body.is_accepting_orders;
  if (typeof body.service_radius_m === "number") updates.service_radius_m = body.service_radius_m;

  const { data, error } = await db.from("stores").update(updates).eq("id", body.id).select().single();
  if (error) return fail(error.message, 400);
  await writeAuditLog({ actorId: user.id, action: "update", entity: "store", entityId: body.id, after: data });
  return ok(data);
});

