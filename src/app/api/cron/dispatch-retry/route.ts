import { NextRequest } from "next/server";
import { db } from "@/lib/supabase/server";
import { fail, ok } from "@/lib/auth/withAuth";
import { dispatchOrderToRider } from "@/lib/orders/dispatch";

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.get("authorization") !== `Bearer ${secret}`) {
    return fail("unauthorized", 401);
  }

  const { data: orders } = await db
    .from("orders")
    .select("id")
    .in("status", ["picking", "packed"])
    .is("rider_id", null)
    .limit(20);

  const results = [];
  for (const o of orders ?? []) {
    results.push({ orderId: o.id, ...(await dispatchOrderToRider(o.id)) });
  }
  return ok({ processed: results.length, results });
}

