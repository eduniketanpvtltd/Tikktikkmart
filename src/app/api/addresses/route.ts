import { readCoordinates } from "@/lib/maps/coordinates";
import { z } from "zod";
import { db } from "@/lib/supabase/server";
import { fail, ok, withAuth } from "@/lib/auth/withAuth";

const createSchema = z.object({
  label: z.string().max(30).optional(),
  receiver_name: z.string().min(1).max(100),
  receiver_phone: z.string().min(8).max(20),
  line1: z.string().min(2).max(250),
  line2: z.string().max(250).optional(),
  landmark: z.string().max(150).optional(),
  city: z.string().max(100).optional(),
  state: z.string().max(100).optional(),
  pincode: z.string().max(20).optional(),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  is_default: z.boolean().optional(),
});

export const GET = withAuth(null, async (_req, { user }) => {
  const { data, error } = await db
    .from("addresses")
    .select("id, user_id, label, receiver_name, receiver_phone, line1, line2, landmark, city, state, pincode, is_default, created_at, location")
    .eq("user_id", user.id)
    .order("is_default", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) return fail(error.message, 500);
  return ok((data ?? []).map(({ location, ...address }) => ({ ...address, ...readCoordinates(location) })));
});

export const POST = withAuth(null, async (req, { user }) => {
  const body = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return fail("Invalid address fields");

  const { lat, lng, is_default, ...rest } = parsed.data;
  if (is_default) {
    await db.from("addresses").update({ is_default: false }).eq("user_id", user.id);
  }

  const { data, error } = await db
    .from("addresses")
    .insert({
      ...rest,
      user_id: user.id,
      is_default: Boolean(is_default),
      location: `SRID=4326;POINT(${lng} ${lat})`,
    })
    .select("id, user_id, label, receiver_name, receiver_phone, line1, line2, landmark, city, state, pincode, is_default")
    .single();

  if (error) return fail(error.message, 500);
  return ok(data, 201);
});

