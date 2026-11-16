import { NextRequest } from "next/server";
import { db } from "@/lib/supabase/server";
import { fail, ok } from "@/lib/auth/withAuth";

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.get("authorization") !== `Bearer ${secret}`) {
    return fail("unauthorized", 401);
  }
  const { data, error } = await db.rpc("release_expired_reservations");
  if (error) return fail(error.message, 500);
  return ok({ released: data });
}

