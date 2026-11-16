"use client";
import React from "react";
import Link from "next/link";
import { ChevronRight, ShoppingBag } from "lucide-react";
import { useCartStore } from "@/stores/cartStore";

export function FloatingCartBar() {
  const { items } = useCartStore();
  if (!items.length) return null;

  const totalCount = items.reduce((acc, i) => acc + i.quantity, 0);
  const totalAmount = items.reduce((acc, i) => acc + i.price * i.quantity, 0);
  const totalMrp = items.reduce((acc, i) => acc + i.mrp * i.quantity, 0);
  const totalSavings = Math.max(0, totalMrp - totalAmount);

  const previewImages = items.slice(0, 3);

  return (
    <aside
      aria-label="Active cart summary"
      className="fixed bottom-16 sm:bottom-4 inset-x-0 z-40 px-3 sm:px-4 pointer-events-none"
    >
      <div className="max-w-md mx-auto pointer-events-auto">
        <Link
          href="/cart"
          className="flex items-center justify-between bg-[#f66002] hover:bg-[#dc5400] active:scale-[0.99] text-white px-3.5 sm:px-4 py-2.5 sm:py-3 rounded-2xl shadow-[0_10px_25px_rgba(246,96,2,0.38)] transition-all duration-150 border border-orange-400/30"
        >
          {/* Left Preview & Details */}
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            {/* Stacked Images or Bag Icon */}
            <div className="flex -space-x-2 shrink-0">
              {previewImages.map((it, idx) => (
                <div
                  key={it.variantId || idx}
                  className="w-8 h-8 rounded-full bg-white border-2 border-[#f66002] overflow-hidden flex items-center justify-center shadow-xs"
                >
                  {it.image ? (
                    <img src={it.image} alt={it.name} className="w-full h-full object-contain p-0.5" />
                  ) : (
                    <ShoppingBag className="w-3.5 h-3.5 text-[#f66002]" />
                  )}
                </div>
              ))}
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] font-bold text-orange-100 uppercase tracking-wide">
                  {totalCount} {totalCount === 1 ? "item" : "items"}
                </span>
                {totalSavings > 0 && (
                  <span className="bg-[#13193b] text-[#ffd269] text-[9px] font-black px-1.5 py-0.2 rounded font-mono">
                    SAVED ₹{totalSavings}
                  </span>
                )}
              </div>
              <p className="text-sm sm:text-base font-black tracking-tight leading-none mt-0.5">
                ₹{totalAmount.toFixed(0)}
              </p>
            </div>
          </div>

          {/* Right CTA */}
          <div className="flex items-center gap-1 bg-white/20 hover:bg-white/25 px-3 py-1.5 rounded-xl transition-colors shrink-0">
            <span className="text-xs sm:text-sm font-black tracking-wide uppercase">
              View Cart
            </span>
            <ChevronRight className="w-4 h-4 stroke-[3]" />
          </div>
        </Link>
      </div>
    </aside>
  );
}
