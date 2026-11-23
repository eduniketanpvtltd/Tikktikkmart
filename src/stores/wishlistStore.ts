"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

interface WishlistState {
  productIds: string[];
  toggleProduct: (productId: string) => void;
}

export const useWishlistStore = create<WishlistState>()(
  persist(
    (set) => ({
      productIds: [],
      toggleProduct: (productId) => set(({ productIds }) => ({
        productIds: productIds.includes(productId)
          ? productIds.filter((id) => id !== productId)
          : [...productIds, productId],
      })),
    }),
    { name: "tiktikmart-wishlist" },
  ),
);
