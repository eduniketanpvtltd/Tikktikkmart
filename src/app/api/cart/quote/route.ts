import { z } from "zod";
import { NextRequest } from "next/server";
import { computeBillBreakdown } from "@/lib/pricing/calculator";
import { fail, ok } from "@/lib/auth/withAuth";

const schema = z.object({
  storeId: z.union([z.guid(), z.literal(""), z.null(), z.undefined()]).optional(),
  items: z.array(z.object({ variant_id: z.guid(), quantity: z.number().int().min(1) })),
  couponCode: z.string().nullable().optional(),
  tip: z.number().min(0).max(500).optional(),
});

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return fail("Invalid cart quote request: " + JSON.stringify(parsed.error.flatten()));
  }

  const effectiveStoreId =
    parsed.data.storeId && parsed.data.storeId.length === 36
      ? parsed.data.storeId
      : "11111111-1111-1111-1111-111111111111";

  const { bill, resolvedItems } = await computeBillBreakdown({
    storeId: effectiveStoreId,
    items: parsed.data.items,
    couponCode: parsed.data.couponCode,
    tip: parsed.data.tip,
  });

  return ok({ bill, items: resolvedItems });
}

