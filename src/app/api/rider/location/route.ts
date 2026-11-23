import { z } from "zod";
import { db } from "@/lib/supabase/server";
import { fail, ok, withAuth } from "@/lib/auth/withAuth";
import { activeRouteStatuses } from "@/lib/orders/tracking";

const schema = z.object({
  orderId: z.uuid(),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  heading: z.number().optional(),
  speed: z.number().optional(),
});

export const POST = withAuth(["rider", "admin"], async (req, { user }) => {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return fail("Invalid location");

  const { orderId, lat, lng, heading, speed } = parsed.data;
  const { data: assignment, error: lookupError } = await db.from("orders").select("id")
    .eq("id", orderId).eq("rider_id", user.id).in("status", activeRouteStatuses).maybeSingle();
  if (lookupError) return fail("Could not verify the active delivery", 503);
  if (!assignment) return fail("The delivery is no longer active", 409);
  const { error } = await db.from("rider_locations").upsert(
    {
      rider_id: user.id,
      location: `SRID=4326;POINT(${lng} ${lat})`,
      heading: heading ?? 0,
      speed: speed ?? 0,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "rider_id" }
  );
  if (error) return fail(error.message, 500);
  return ok({ updated: true });
});

