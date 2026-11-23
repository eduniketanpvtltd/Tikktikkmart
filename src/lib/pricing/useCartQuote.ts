"use client";

import { useQuery } from "@tanstack/react-query";
import { useCartStore, type CartItem } from "@/stores/cartStore";
import type { BillBreakdown } from "@/types/db";

export const PILOT_STORE_ID = "11111111-1111-1111-1111-111111111111";

export function cartQuoteKey(storeId: string, items: CartItem[], couponCode: string | null, tip: number) {
  return ["cart-quote", storeId, items, couponCode, tip] as const;
}

export async function requestCartQuote(storeId: string, items: CartItem[], couponCode: string | null, tip: number, signal?: AbortSignal) {
  const response = await fetch("/api/cart/quote", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    signal,
    body: JSON.stringify({
      storeId,
      items: items.map((item) => ({ variant_id: item.variantId, quantity: item.quantity })),
      couponCode,
      tip,
    }),
  });
  const result = await response.json();
  if (!response.ok || !result.ok) throw new Error("Cart quote unavailable");
  return result.data as { bill: BillBreakdown };
}

export function useCartQuote() {
  const { storeId, items, couponCode, tip } = useCartStore();
  const effectiveStoreId = storeId || PILOT_STORE_ID;
  return useQuery({
    queryKey: cartQuoteKey(effectiveStoreId, items, couponCode, tip),
    enabled: items.length > 0,
    queryFn: ({ signal }) => requestCartQuote(effectiveStoreId, items, couponCode, tip, signal),
  });
}
