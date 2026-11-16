"use client";
import React, { useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  Minus,
  Plus,
  Zap,
  ShieldCheck,
  Clock,
  Sparkles,
  Share2,
} from "lucide-react";
import { useCartStore } from "@/stores/cartStore";
import { ProductCard } from "@/components/customer/ProductCard";
import type { Product } from "@/types/db";

export default function ProductDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const { storeId, items, addItem, setQty } = useCartStore();
  const [selectedIdx, setSelectedIdx] = useState(0);

  const { data: product, isLoading } = useQuery({
    queryKey: ["product-detail", slug, storeId],
    queryFn: async () => {
      const qs = storeId ? `?storeId=${storeId}` : "";
      const res = await fetch(`/api/products/${slug}${qs}`);
      const json = await res.json();
      return json.data as Product;
    },
  });

  // Recommended products in same category
  const { data: categoryData } = useQuery({
    queryKey: ["category-similars", product?.category_id, storeId],
    enabled: Boolean(product?.category_id),
    queryFn: async () => {
      const qs = storeId ? `?storeId=${storeId}` : "";
      const res = await fetch(`/api/home${qs}`);
      const json = await res.json();
      return (json.data?.products ?? []) as Product[];
    },
  });

  if (isLoading) {
    return (
      <div className="py-16 text-center text-xs text-gray-400 font-bold uppercase tracking-wider">
        Loading product details...
      </div>
    );
  }

  if (!product) {
    return (
      <div className="max-w-md mx-auto my-8 bg-white rounded-3xl border p-8 text-center space-y-3">
        <p className="font-bold text-gray-800">Product not found.</p>
        <Link href="/" className="inline-block px-4 py-2 rounded-xl bg-[#0c831f] text-white text-xs font-bold">
          Back to Store
        </Link>
      </div>
    );
  }

  const variants = product.variants ?? [];
  const variant = variants[selectedIdx] ?? variants[0];
  const inCart = variant ? items.find((i) => i.variantId === variant.id) : undefined;
  const price = variant ? variant.effective_price ?? variant.base_price : 0;
  const mrp = variant?.mrp ?? price;
  const discountPct = mrp > price ? Math.round(((mrp - price) / mrp) * 100) : 0;

  const similarProducts = (categoryData ?? [])
    .filter((p) => p.id !== product.id && p.category_id === product.category_id)
    .slice(0, 5);

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Back button */}
      <div className="flex items-center justify-between">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs font-black text-gray-700 hover:text-black p-1"
        >
          <ArrowLeft className="w-4 h-4 stroke-[2.5]" /> Back
        </Link>
      </div>

      {/* Main Product Card */}
      <div className="bg-white rounded-3xl border border-gray-100 p-5 sm:p-7 grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8 shadow-sm">
        {/* Left: Product Image Box */}
        <div className="relative aspect-square rounded-2xl bg-[#f8f9fa] flex items-center justify-center p-6 border border-gray-100 overflow-hidden">
          {/* 10 MINS Badge */}
          <div className="absolute top-3 left-3 bg-white/95 backdrop-blur-xs px-2 py-1 rounded-md shadow-2xs border border-gray-100 flex items-center gap-1">
            <Zap className="w-3 h-3 text-[#f66002] fill-[#f66002]" />
            <span className="text-[10px] font-black text-gray-800">10 MINS</span>
          </div>

          {discountPct > 0 && (
            <div className="absolute bottom-3 left-3 bg-[#13193b] text-[#ffd269] text-[10px] font-black px-2 py-0.5 rounded-sm uppercase tracking-wider">
              {discountPct}% OFF
            </div>
          )}

          {product.images?.[0] ? (
            <img
              src={product.images[0]}
              alt={product.name}
              className="w-full h-full object-contain hover:scale-105 transition-transform duration-300"
            />
          ) : (
            <span className="text-3xl">🛍️</span>
          )}
        </div>

        {/* Right: Product Details & Purchase CTA */}
        <div className="flex flex-col justify-between space-y-5">
          <div className="space-y-3">
            <div>
              <p className="text-xs font-black text-gray-400 uppercase tracking-wider">
                {product.brand || "TIKK TIKK MART"}
              </p>
              <h1 className="text-lg sm:text-2xl font-black text-gray-900 tracking-tight leading-snug mt-1">
                {product.name}
              </h1>
            </div>

            {/* Pack Size / Variant selection pills */}
            {variants.length > 0 && (
              <div className="space-y-2 pt-1">
                <p className="text-[11px] font-black uppercase tracking-wider text-gray-500">
                  Select Unit / Pack Size
                </p>
                <div className="flex flex-wrap gap-2">
                  {variants.map((v, idx) => {
                    const isSelected = idx === selectedIdx;
                    return (
                      <button
                        key={v.id}
                        type="button"
                        onClick={() => setSelectedIdx(idx)}
                        className={`px-3 py-2 rounded-xl border text-left transition-all ${
                          isSelected
                            ? "border-[#f66002] bg-[#fff0e6] text-[#f66002] shadow-2xs ring-1 ring-[#f66002]"
                            : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
                        }`}
                      >
                        <div className="text-xs font-black">{v.label}</div>
                        <div className="text-[11px] font-bold text-gray-900 mt-0.5">
                          ₹{v.effective_price ?? v.base_price}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Price Box */}
            <div className="pt-2">
              <div className="flex items-baseline gap-2">
                <span className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">
                  ₹{price}
                </span>
                {mrp > price && (
                  <span className="text-sm sm:text-base text-gray-400 line-through font-medium">
                    MRP ₹{mrp}
                  </span>
                )}
                {discountPct > 0 && (
                  <span className="text-xs font-black text-[#f66002] bg-[#fff0e6] px-2 py-0.5 rounded-md">
                    Save ₹{mrp - price}
                  </span>
                )}
              </div>
              <p className="text-[10px] text-gray-400 mt-0.5 font-medium">
                (Inclusive of all taxes)
              </p>
            </div>

            {/* Blinkit 10-min Guarantee note */}
            <div className="p-3 bg-[#fff4eb] border border-[#ffd269] rounded-2xl flex items-center gap-2.5 text-xs text-[#13193b] font-bold">
              <Clock className="w-4 h-4 text-[#f66002] shrink-0" />
              <span>Sourced & packaged from nearest dark store · 10 min arrival</span>
            </div>
          </div>

          {/* Add to Cart Bar */}
          <div className="pt-4 border-t border-gray-100 flex items-center justify-between gap-4">
            {(variant?.stock_available ?? 99) <= 0 ? (
              <span className="w-full py-3 rounded-2xl bg-gray-100 text-gray-400 text-center font-bold text-sm uppercase tracking-wider">
                Out of Stock
              </span>
            ) : inCart ? (
              <div className="w-full flex items-center justify-between bg-[#f66002] text-white rounded-2xl p-2 shadow-md">
                <button
                  type="button"
                  onClick={() => setQty(variant.id, inCart.quantity - 1)}
                  className="p-2 hover:bg-[#dd5500] rounded-xl transition-colors active:scale-90"
                >
                  <Minus className="w-4 h-4 stroke-[3]" />
                </button>
                <div className="text-center">
                  <span className="text-sm font-black">{inCart.quantity} in cart</span>
                  <p className="text-[10px] text-orange-200">Tap + to add more</p>
                </div>
                <button
                  type="button"
                  onClick={() => setQty(variant.id, inCart.quantity + 1)}
                  className="p-2 hover:bg-[#dd5500] rounded-xl transition-colors active:scale-90"
                >
                  <Plus className="w-4 h-4 stroke-[3]" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() =>
                  addItem({
                    variantId: variant.id,
                    productId: product.id,
                    name: product.name,
                    label: variant.label,
                    image: product.images?.[0] ?? null,
                    price,
                    mrp: variant.mrp,
                    maxQty: variant.max_qty_per_order ?? 10,
                  })
                }
                className="w-full py-3.5 rounded-2xl bg-[#f66002] hover:bg-[#dd5500] active:scale-[0.99] text-white font-black text-sm uppercase tracking-wider transition-all shadow-md shadow-orange-500/20 flex items-center justify-center gap-2"
              >
                <span>Add to Cart</span>
                <span className="font-mono text-xs opacity-90">· ₹{price}</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Product Details & Specifications */}
      <div className="bg-white rounded-3xl border border-gray-100 p-5 sm:p-6 space-y-4 shadow-2xs">
        <h2 className="text-xs font-black uppercase tracking-wider text-gray-400">
          Product Details
        </h2>

        {product.description && (
          <div className="space-y-1">
            <h3 className="text-xs font-extrabold text-gray-900">Description</h3>
            <p className="text-xs sm:text-sm text-gray-600 leading-relaxed">
              {product.description}
            </p>
          </div>
        )}

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2 text-xs">
          <div className="bg-gray-50 p-3 rounded-2xl">
            <span className="text-gray-400 font-medium">Brand</span>
            <p className="font-bold text-gray-800 mt-0.5">{product.brand || "TikTikMart"}</p>
          </div>
          <div className="bg-gray-50 p-3 rounded-2xl">
            <span className="text-gray-400 font-medium">Country of Origin</span>
            <p className="font-bold text-gray-800 mt-0.5">India</p>
          </div>
          <div className="bg-gray-50 p-3 rounded-2xl">
            <span className="text-gray-400 font-medium">Shelf Life</span>
            <p className="font-bold text-gray-800 mt-0.5">Fresh Guarantee</p>
          </div>
        </div>
      </div>

      {/* Similar Products Shelf */}
      {similarProducts.length > 0 && (
        <div className="space-y-3 pt-2">
          <div className="flex items-center gap-2">
            <span className="text-lg">🛒</span>
            <h2 className="text-base font-black text-gray-900 tracking-tight">
              Similar Products in this Category
            </h2>
          </div>
          <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2 pt-1 -mx-3 px-3 sm:mx-0 sm:px-0">
            {similarProducts.map((p) => (
              <ProductCard key={p.id} product={p} compact />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
