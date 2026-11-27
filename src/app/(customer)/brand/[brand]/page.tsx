"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Search, Store, Zap } from "lucide-react";
import { BrowseProductCard } from "@/components/customer/BrowseView";
import { LayoutSkeleton } from "@/components/ui/LayoutSkeleton";
import { useCartStore } from "@/stores/cartStore";
import type { Product } from "@/types/db";

type BrandFilter = "all" | "under50" | "deals";

function productPrice(product: Product) {
  const variant = product.variants?.[0];
  const price = variant?.effective_price ?? variant?.base_price ?? 0;
  const mrp = variant?.mrp ?? price;
  const discount = mrp > price ? Math.round((1 - price / mrp) * 100) : 0;
  return { price, mrp, discount };
}

export default function BrandStorePage() {
  const { brand } = useParams<{ brand: string }>();
  const router = useRouter();
  const brandName = decodeURIComponent(brand || "").trim();
  const storeId = useCartStore((state) => state.storeId);
  const etaMinutes = useCartStore((state) => state.etaMinutes);
  const [filter, setFilter] = useState<BrandFilter>("all");

  const { data: products = [], isLoading, isError, refetch } = useQuery({
    queryKey: ["brand-store", brandName, storeId],
    enabled: Boolean(brandName),
    queryFn: async ({ signal }) => {
      const qs = new URLSearchParams({ brand: brandName });
      if (storeId) qs.set("storeId", storeId);
      const response = await fetch(`/api/search?${qs}`, { signal });
      const result = await response.json();
      if (!response.ok || !result.ok) throw new Error("Could not load store products");
      return (result.data ?? []) as Product[];
    },
  });

  const activeProducts = products.filter((product) => product.variants?.length);
  const maxDiscount = activeProducts.reduce((best, p) => Math.max(best, productPrice(p).discount), 0);
  const ratings = activeProducts.map((p) => Number(p.rating)).filter((r) => r > 0 && r <= 5);
  const avgRating = ratings.length
    ? (ratings.reduce((sum, r) => sum + r, 0) / ratings.length).toFixed(1)
    : "4.5";

  const filteredProducts = activeProducts
    .filter((product) => {
      const { price, discount } = productPrice(product);
      if (filter === "under50") return price <= 50;
      if (filter === "deals") return discount > 0;
      return true;
    })
    .sort((a, b) => (filter === "deals" ? productPrice(b).discount - productPrice(a).discount : 0));

  return (
    <div className="mx-auto max-w-4xl space-y-3.5 pb-10 text-[#3A2418]">
      {/* Top Bar */}
      <header className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => router.back()}
          aria-label="Back"
          className="grid size-10 shrink-0 place-items-center rounded-full border border-[#F0E4D2] bg-white text-[#3A2418] transition-colors hover:bg-[#FBE3CF]"
        >
          <ArrowLeft size={18} aria-hidden="true" />
        </button>
        <h1 className="min-w-0 flex-1 truncate text-[18px] font-bold tracking-tight text-[#3A2418]">
          {brandName || "Brand Store"}
        </h1>
        <Link
          href={`/search?brand=${encodeURIComponent(brandName)}&q=${encodeURIComponent(brandName)}`}
          aria-label={`Search in ${brandName}`}
          className="grid size-10 shrink-0 place-items-center rounded-full border border-[#F0E4D2] bg-white text-[#3A2418] transition-colors hover:bg-[#FBE3CF]"
        >
          <Search size={18} aria-hidden="true" />
        </Link>
      </header>

      {/* Hero Brand Banner */}
      <section className="relative overflow-hidden rounded-[20px] border border-[#F0DFC2] bg-gradient-to-br from-[#FBF0DC] to-[#F5DFB8] p-4">
        <Store
          aria-hidden="true"
          size={112}
          strokeWidth={1.3}
          className="pointer-events-none absolute -right-3 -bottom-5 text-[#3A2418]/[0.07]"
        />
        <div className="relative flex items-center gap-3.5">
          <span className="grid size-16 shrink-0 place-items-center rounded-2xl bg-[#D98A0F] text-2xl font-extrabold text-white shadow-xs">
            {(brandName || "S").charAt(0).toUpperCase()}
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-[20px] font-extrabold leading-tight text-[#3A2418]">
              {brandName || "Brand Store"}
            </h2>
            <p className="mt-0.5 text-xs font-medium text-[#8A7060]">
              Official brand store
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[11px] font-semibold text-[#3A2418]">
              <span className="rounded-full bg-white/90 px-2.5 py-0.5">{avgRating}</span>
              <span className="rounded-full bg-white/90 px-2.5 py-0.5">
                {isLoading ? "…" : `${activeProducts.length} ${activeProducts.length === 1 ? "product" : "products"}`}
              </span>
              <span className="rounded-full bg-white/90 px-2.5 py-0.5">
                {etaMinutes ?? 14} min
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Promo Strip */}
      <div className="flex items-center gap-3 rounded-2xl border border-[#F0E4D2] bg-white px-3.5 py-3">
        <span className="grid size-9 shrink-0 place-items-center rounded-full bg-[#FBE3CF] text-[#A8421A]">
          <Zap size={16} aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <p className="text-[13px] font-bold text-[#3A2418]">
            {maxDiscount > 0 ? `Up to ${maxDiscount}% off on ${brandName}` : `Fresh picks from ${brandName}`}
          </p>
          <p className="text-xs text-[#8A7060]">Free delivery above ₹199</p>
        </div>
      </div>

      {/* Filter Chips */}
      <div role="group" aria-label="Filter store products" className="flex flex-wrap items-center gap-2">
        {(
          [
            { id: "all", label: "All" },
            { id: "under50", label: "Under ₹50" },
            { id: "deals", label: "Top deals" },
          ] as const
        ).map((chip) => {
          const active = filter === chip.id;
          return (
            <button
              key={chip.id}
              type="button"
              aria-pressed={active}
              onClick={() => setFilter(chip.id)}
              className={`rounded-full px-4 py-1.5 text-xs font-semibold transition-colors ${
                active
                  ? "bg-[#A8421A] text-white"
                  : "border border-[#EADBC6] bg-white text-[#3A2418] hover:bg-[#FBE3CF]/50"
              }`}
            >
              {chip.label}
            </button>
          );
        })}
      </div>

      {/* Product Grid */}
      {isLoading ? (
        <LayoutSkeleton shape="products" label={`Loading ${brandName} products`} />
      ) : isError ? (
        <div className="rounded-2xl border border-[#F0E4D2] bg-white p-8 text-center space-y-3">
          <p className="text-sm font-bold text-[#3A2418]">Couldn&apos;t load {brandName} products</p>
          <button
            type="button"
            onClick={() => void refetch()}
            className="inline-flex min-h-10 items-center justify-center rounded-full bg-[#A8421A] px-5 text-xs font-bold text-white hover:bg-[#8E3513]"
          >
            Try again
          </button>
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="rounded-2xl border border-[#F0E4D2] bg-white p-8 text-center space-y-3">
          <span className="mx-auto grid size-12 place-items-center rounded-full bg-[#FBE3CF] text-[#A8421A]">
            <Store size={22} aria-hidden="true" />
          </span>
          <h2 className="text-base font-extrabold text-[#3A2418]">
            {activeProducts.length === 0 ? `No products found for ${brandName}` : "No products match this filter"}
          </h2>
          <p className="text-xs text-[#8A7060]">
            {activeProducts.length === 0 ? "Check out other fresh groceries available right now." : "Try switching back to All products."}
          </p>
          {activeProducts.length > 0 ? (
            <button
              type="button"
              onClick={() => setFilter("all")}
              className="inline-flex min-h-10 items-center justify-center rounded-full bg-[#A8421A] px-5 text-xs font-bold text-white hover:bg-[#8E3513]"
            >
              Show all
            </button>
          ) : (
            <Link
              href="/"
              className="inline-flex min-h-10 items-center justify-center rounded-full bg-[#A8421A] px-5 text-xs font-bold text-white hover:bg-[#8E3513]"
            >
              Browse home
            </Link>
          )}
        </div>
      ) : (
        <section aria-label={`${brandName} products`} className="space-y-2.5">
          <p className="text-xs font-medium text-[#8A7060]">
            Showing {filteredProducts.length} of {activeProducts.length} products
          </p>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 sm:gap-3">
            {filteredProducts.map((product) => (
              <BrowseProductCard key={product.id} product={product} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
