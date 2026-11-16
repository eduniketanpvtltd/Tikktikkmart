"use client";
import React from "react";
import Link from "next/link";
import { Plus, Minus, Zap } from "lucide-react";
import type { Product } from "@/types/db";
import { useCartStore } from "@/stores/cartStore";

interface ProductCardProps {
  product: Product;
  compact?: boolean;
}

export function ProductCard({ product, compact = false }: ProductCardProps) {
  const { items, addItem, setQty } = useCartStore();
  const variant = product.variants?.[0];
  if (!variant) return null;

  const price = variant.effective_price ?? variant.base_price;
  const mrp = variant.mrp;
  const discountPct = mrp > price ? Math.round(((mrp - price) / mrp) * 100) : 0;
  const stock = variant.stock_available ?? 99;
  const inCart = items.find((i) => i.variantId === variant.id);

  const handleAdd = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    addItem({
      variantId: variant.id,
      productId: product.id,
      name: product.name,
      label: variant.label,
      image: product.images?.[0] ?? null,
      price,
      mrp,
      maxQty: variant.max_qty_per_order ?? 10,
    });
  };

  const handleMinus = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (inCart) setQty(variant.id, inCart.quantity - 1);
  };

  const handlePlus = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (inCart) setQty(variant.id, inCart.quantity + 1);
  };

  return (
    <div
      className={`group relative bg-white rounded-2xl border border-gray-100 p-2.5 sm:p-3 flex flex-col justify-between shadow-[0_2px_8px_rgba(19,25,59,0.03)] hover:shadow-[0_8px_20px_rgba(246,96,2,0.08)] hover:border-[#ffd8c2] transition-all duration-200 ${
        compact ? "w-[145px] sm:w-[165px] shrink-0" : "w-full"
      }`}
    >
      <Link href={`/product/${product.slug}`} className="block">
        {/* Top Badges & Image Box */}
        <div className="relative aspect-square w-full rounded-xl bg-[#f8f9fa] flex items-center justify-center overflow-hidden mb-2">
          {/* 10 MINS Lightning Tag */}
          <div className="absolute top-1.5 left-1.5 z-10 bg-white/95 backdrop-blur-xs px-1.5 py-0.5 rounded shadow-[0_1px_3px_rgba(0,0,0,0.08)] flex items-center gap-0.5 border border-gray-100">
            <Zap className="w-2.5 h-2.5 text-[#f66002] fill-[#f66002]" />
            <span className="text-[9px] font-black tracking-tight text-gray-800">10 MINS</span>
          </div>

          {/* Discount Tag */}
          {discountPct > 0 && (
            <div className="absolute bottom-1.5 left-1.5 z-10 bg-[#13193b] text-[#ffd269] text-[9px] font-black px-1.5 py-0.5 rounded-sm uppercase tracking-wider shadow-xs">
              {discountPct}% OFF
            </div>
          )}

          {/* Image */}
          {product.images?.[0] ? (
            <img
              src={product.images[0]}
              alt={product.name}
              className="w-full h-full object-contain p-2 group-hover:scale-105 transition-transform duration-300"
              loading="lazy"
            />
          ) : (
            <span className="text-xs text-gray-400 font-medium">Grocery</span>
          )}
        </div>

        {/* Product Details */}
        <div className="space-y-1">
          <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-tight truncate">
            {variant.label}
          </p>
          <h3 className="text-xs sm:text-[13px] font-bold text-gray-900 line-clamp-2 leading-snug min-h-[34px] group-hover:text-[#f66002] transition-colors">
            {product.name}
          </h3>
        </div>
      </Link>

      {/* Price & Tikk Tikk Mart Add Button */}
      <div className="flex items-center justify-between pt-2 mt-2 border-t border-gray-50 gap-1.5">
        <div className="min-w-0">
          <div className="flex items-baseline gap-1">
            <span className="text-xs sm:text-sm font-extrabold text-gray-900 tracking-tight">
              ₹{price}
            </span>
            {mrp > price && (
              <span className="text-[10px] text-gray-400 line-through font-medium">
                ₹{mrp}
              </span>
            )}
          </div>
        </div>

        {stock <= 0 ? (
          <span className="text-[10px] font-bold text-gray-400 px-2 py-1 rounded-md bg-gray-100 uppercase tracking-tight">
            Out of Stock
          </span>
        ) : inCart ? (
          /* Active stepper: solid orange pill */
          <div className="inline-flex items-center bg-[#f66002] text-white rounded-lg overflow-hidden shadow-xs shrink-0">
            <button
              type="button"
              onClick={handleMinus}
              aria-label="Decrease quantity"
              className="p-1 sm:p-1.5 hover:bg-[#dc5400] active:scale-90 transition-transform"
            >
              <Minus className="w-3 h-3 stroke-[3]" />
            </button>
            <span className="px-1.5 text-xs font-black min-w-[16px] text-center select-none">
              {inCart.quantity}
            </span>
            <button
              type="button"
              onClick={handlePlus}
              aria-label="Increase quantity"
              className="p-1 sm:p-1.5 hover:bg-[#dc5400] active:scale-90 transition-transform"
            >
              <Plus className="w-3 h-3 stroke-[3]" />
            </button>
          </div>
        ) : (
          /* Inactive ADD button: Warm cream card with orange border */
          <button
            type="button"
            onClick={handleAdd}
            className="relative px-3 sm:px-4 py-1.5 rounded-lg border-[1.5px] border-[#f66002] bg-[#fff5ed] hover:bg-[#f66002] hover:text-white text-[#f66002] font-black text-[11px] sm:text-xs uppercase tracking-wider transition-all duration-150 active:scale-95 shadow-2xs shrink-0"
          >
            ADD
            <span className="absolute -top-1 -right-1 text-[10px] text-[#f66002] group-hover:text-white font-bold">
              +
            </span>
          </button>
        )}
      </div>
    </div>
  );
}
