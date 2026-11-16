"use client";
import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface CartItem {
  variantId: string;
  productId: string;
  name: string;
  label: string;
  image: string | null;
  price: number;
  mrp: number;
  maxQty: number;
  quantity: number;
}

export interface SelectedLocation {
  lat: number;
  lng: number;
  address: string;
  city?: string;
}

interface CartState {
  storeId: string | null;
  storeName: string | null;
  etaMinutes: number | null;
  serviceable: boolean | null;
  location: SelectedLocation | null;
  items: CartItem[];
  couponCode: string | null;
  tip: number;
  setServiceability: (payload: {
    location: SelectedLocation;
    serviceable: boolean;
    storeId?: string | null;
    storeName?: string | null;
    etaMinutes?: number | null;
  }) => void;
  addItem: (item: Omit<CartItem, "quantity">) => void;
  setQty: (variantId: string, quantity: number) => void;
  setCoupon: (code: string | null) => void;
  setTip: (tip: number) => void;
  clearCart: () => void;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      storeId: null,
      storeName: null,
      etaMinutes: null,
      serviceable: null,
      location: null,
      items: [],
      couponCode: null,
      tip: 0,
      setServiceability: ({ location, serviceable, storeId = null, storeName = null, etaMinutes = null }) => {
        const prevStoreId = get().storeId;
        // If store changed, keep cart only if it was empty; otherwise clear to avoid cross-store mismatch
        const storeChanged = prevStoreId && storeId && prevStoreId !== storeId;
        set({
          location,
          serviceable,
          storeId: serviceable ? storeId : null,
          storeName: serviceable ? storeName : null,
          etaMinutes: serviceable ? etaMinutes : null,
          items: storeChanged ? [] : get().items,
        });
      },
      addItem: (item) =>
        set((state) => {
          const existing = state.items.find((i) => i.variantId === item.variantId);
          if (existing) {
            if (existing.quantity >= existing.maxQty) return state;
            return {
              items: state.items.map((i) =>
                i.variantId === item.variantId ? { ...i, quantity: i.quantity + 1 } : i
              ),
            };
          }
          return { items: [...state.items, { ...item, quantity: 1 }] };
        }),
      setQty: (variantId, quantity) =>
        set((state) => {
          if (quantity <= 0) {
            return { items: state.items.filter((i) => i.variantId !== variantId) };
          }
          return {
            items: state.items.map((i) =>
              i.variantId === variantId ? { ...i, quantity: Math.min(quantity, i.maxQty) } : i
            ),
          };
        }),
      setCoupon: (couponCode) => set({ couponCode }),
      setTip: (tip) => set({ tip: Math.max(0, tip) }),
      clearCart: () => set({ items: [], couponCode: null, tip: 0 }),
    }),
    { name: "tiktikmart-cart-v1" }
  )
);

