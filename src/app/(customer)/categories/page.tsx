"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, ArrowUpRight, ChevronRight, Search, Sparkles } from "lucide-react";
import { CatalogImage } from "@/components/customer/CatalogImage";
import { getCardImage } from "@/components/customer/ProductCard";
import { LayoutSkeleton } from "@/components/ui/LayoutSkeleton";
import { browseDepartments, fetchBrowseCatalog } from "@/lib/catalog/browse";
import { useCartStore } from "@/stores/cartStore";
import type { Category, Product } from "@/types/db";

const CATEGORY_TINTS: Record<string, string> = {
  "fresh-produce": "#EAF4E4",
  "dairy-eggs": "#FFF2E2",
  "snacks-munchies": "#FDE8DE",
  "cold-drinks": "#EBF1FC",
  "staples-grains": "#F6EEDF",
  "instant-frozen": "#F1EAF9",
  "dairy-bread-eggs": "#FFF2E2",
  "vegetables-fruits": "#EAF4E4",
  "munchies-snacks": "#FDE8DE",
  "cold-drinks-juices": "#EBF1FC",
};

const FALLBACK_TINTS = ["#FFF2E2", "#EAF4E4", "#FDE8DE", "#EBF1FC", "#F6EEDF", "#F1EAF9"];

function productPrice(product: Product) {
  const v = product.variants?.[0];
  return v?.effective_price ?? v?.base_price ?? 0;
}

export default function CategoriesPage() {
  const [query, setQuery] = useState("");
  const [selectedSlug, setSelectedSlug] = useState<string>("all");
  const storeId = useCartStore((state) => state.storeId);
  const location = useCartStore((state) => state.location);

  const { data: catalog, isLoading } = useQuery({
    queryKey: ["home", storeId],
    queryFn: ({ signal }) => fetchBrowseCatalog(storeId, signal),
  });

  const categories = (catalog?.categories ?? [])
    .filter((c) => !c.parent_id)
    .sort((a, b) => a.sort_order - b.sort_order);

  const products = (catalog?.products ?? []).filter((p) => p.variants?.length);
  const departmentSlugs = new Set<string>(browseDepartments.map((d) => d.slug));

  const productsByCategory = new Map<string, Product[]>();
  for (const p of products) {
    if (!p.category_id) continue;
    const list = productsByCategory.get(p.category_id) ?? [];
    list.push(p);
    productsByCategory.set(p.category_id, list);
  }

  const categoryHref = (cat: Category) =>
    departmentSlugs.has(cat.slug) ? `/category/${cat.slug}` : `/search?q=${encodeURIComponent(cat.name)}`;

  const searchLower = query.trim().toLowerCase();
  const visibleCategories = categories.filter((c) => {
    const matchesChip = selectedSlug === "all" || c.slug === selectedSlug;
    if (!matchesChip) return false;
    if (!searchLower) return true;
    const catProducts = productsByCategory.get(c.id) ?? [];
    return (
      c.name.toLowerCase().includes(searchLower) ||
      catProducts.some((p) => p.name.toLowerCase().includes(searchLower))
    );
  });

  return (
    <div className="mx-auto max-w-4xl space-y-4 pb-14 text-[#3A2418]">
      {/* Brand + Location Header */}
      <header className="flex items-center justify-between gap-2 pt-1">
        <div className="flex items-center gap-2.5 min-w-0">
          <Link
            href="/"
            aria-label="Back to Home"
            className="grid size-9 shrink-0 place-items-center rounded-full border border-[#F0E4D2] bg-white text-[#3A2418] transition-colors hover:bg-[#FBE3CF]"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <span className="grid size-8 shrink-0 place-items-center overflow-hidden rounded-lg bg-[#A8421A] shadow-xs">
            <img src="/logo.png" alt="Tikk Tikk Mart" className="size-full object-cover" />
          </span>
          <span className="truncate text-[16px] font-extrabold tracking-tight text-[#3A2418]">
            Tikk Tikk <span className="text-[#A8421A]">Mart</span>
          </span>
        </div>

        <Link
          href="/checkout#delivery-address"
          className="inline-flex max-w-[170px] items-center gap-1 truncate rounded-full border border-[#F0E4D2] bg-white px-2.5 py-1 text-[11px] font-semibold text-[#8A7060] hover:border-[#A8421A]/40"
        >
          <span className="truncate">{location?.address?.split(",")[0] || "Park Street"}</span>
          <ChevronRight className="h-3 w-3 shrink-0" />
        </Link>
      </header>

      {/* Search Pill */}
      <div className="relative">
        <Search className="pointer-events-none absolute top-1/2 left-4 h-4 w-4 -translate-y-1/2 text-[#8A7060]" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search products and everyday essentials"
          aria-label="Search products and everyday essentials"
          className="h-11 w-full rounded-full border border-[#EADBC6] bg-white pr-10 pl-10 text-sm text-[#3A2418] placeholder:text-[#8A7060] focus:border-[#A8421A] focus:outline-none"
        />
        <Link
          href={query.trim() ? `/search?q=${encodeURIComponent(query.trim())}` : "/search"}
          aria-label="Open full search"
          className="absolute top-1/2 right-2 grid size-7 -translate-y-1/2 place-items-center rounded-full text-[#A8421A] hover:bg-[#FBE3CF]"
        >
          <ArrowUpRight className="h-4 w-4" />
        </Link>
      </div>

      {/* Category Filter Pills */}
      <div
        role="group"
        aria-label="Category quick filter"
        className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none]"
      >
        <button
          type="button"
          onClick={() => setSelectedSlug("all")}
          className={`shrink-0 rounded-full px-3.5 py-1.5 text-xs font-bold transition-colors ${
            selectedSlug === "all"
              ? "border border-[#A8421A] bg-[#FBE3CF] text-[#A8421A]"
              : "border border-[#EADBC6] bg-white text-[#3A2418] hover:bg-[#FBE3CF]/40"
          }`}
        >
          All categories
        </button>
        {categories.map((cat) => {
          const active = selectedSlug === cat.slug;
          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => setSelectedSlug(active ? "all" : cat.slug)}
              className={`shrink-0 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors ${
                active
                  ? "border border-[#A8421A] bg-[#FBE3CF] text-[#A8421A] font-bold"
                  : "border border-[#EADBC6] bg-white text-[#3A2418] hover:bg-[#FBE3CF]/40"
              }`}
            >
              {cat.name}
            </button>
          );
        })}
      </div>

      {isLoading ? (
        <LayoutSkeleton shape="products" label="Loading categories" />
      ) : (
        <div className="space-y-6">
          {/* Daily Essentials 3-Column Visual Grid */}
          {selectedSlug === "all" && !searchLower && categories.length > 0 && (
            <section aria-labelledby="cat-daily-essentials" className="space-y-2.5">
              <div className="flex items-center justify-between">
                <h2 id="cat-daily-essentials" className="text-[17px] font-extrabold tracking-tight text-[#3A2418]">
                  Daily essentials
                </h2>
                <Link href="/featured" className="inline-flex items-center gap-0.5 text-xs font-bold text-[#A8421A] hover:underline">
                  <Sparkles className="h-3.5 w-3.5" /> Featured
                </Link>
              </div>

              <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-6 sm:gap-3">
                {categories.map((cat, idx) => {
                  const catProducts = productsByCategory.get(cat.id) ?? [];
                  const heroProduct = catProducts[0];
                  const tint = CATEGORY_TINTS[cat.slug] ?? FALLBACK_TINTS[idx % FALLBACK_TINTS.length];
                  const minPrice = catProducts.reduce(
                    (min, p) => Math.min(min, productPrice(p) || Infinity),
                    Infinity
                  );

                  return (
                    <Link
                      key={cat.id}
                      href={categoryHref(cat)}
                      className="group flex flex-col items-center text-center"
                    >
                      <div
                        style={{ backgroundColor: tint }}
                        className="relative aspect-square w-full overflow-hidden rounded-[18px] border border-[#F0E4D2] p-2.5 transition-transform group-active:scale-[0.96]"
                      >
                        {Number.isFinite(minPrice) && (
                          <span className="absolute top-1.5 left-1.5 z-10 rounded-full bg-white/90 px-1.5 py-0.5 text-[9px] font-bold text-[#A8421A]">
                            From ₹{minPrice}
                          </span>
                        )}
                        <div className="relative h-full w-full overflow-hidden rounded-xl bg-white/70">
                          <CatalogImage src={heroProduct ? getCardImage(heroProduct) : null} />
                        </div>
                        <span
                          aria-hidden="true"
                          className="absolute right-1.5 bottom-1.5 grid size-5 place-items-center rounded-full bg-white/90 text-[#A8421A]"
                        >
                          <ArrowUpRight className="h-3 w-3" />
                        </span>
                      </div>
                      <span className="mt-1.5 line-clamp-2 text-[11.5px] font-bold leading-tight text-[#3A2418]">
                        {cat.name}
                      </span>
                    </Link>
                  );
                })}
              </div>
            </section>
          )}

          {/* Per-Category Visual Sections */}
          {visibleCategories.length === 0 ? (
            <div className="rounded-2xl border border-[#F0E4D2] bg-white p-8 text-center">
              <p className="text-sm font-bold text-[#3A2418]">No matching categories or items</p>
              <p className="mt-1 text-xs text-[#8A7060]">Try another search term or tap All categories.</p>
            </div>
          ) : (
            visibleCategories.map((cat, idx) => {
              const catProducts = (productsByCategory.get(cat.id) ?? []).filter((p) =>
                !searchLower ||
                cat.name.toLowerCase().includes(searchLower) ||
                p.name.toLowerCase().includes(searchLower)
              );
              if (!catProducts.length) return null;
              const tint = CATEGORY_TINTS[cat.slug] ?? FALLBACK_TINTS[idx % FALLBACK_TINTS.length];
              const previewProducts = catProducts.slice(0, 6);

              return (
                <section key={cat.id} aria-labelledby={`cat-sec-${cat.id}`} className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <h2 id={`cat-sec-${cat.id}`} className="text-[17px] font-extrabold tracking-tight text-[#3A2418]">
                      {cat.name}
                    </h2>
                    <Link
                      href={categoryHref(cat)}
                      className="inline-flex items-center gap-0.5 text-xs font-bold text-[#A8421A] hover:underline"
                    >
                      See all <ChevronRight className="h-3.5 w-3.5" />
                    </Link>
                  </div>

                  <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-6 sm:gap-3">
                    {previewProducts.map((product) => (
                      <Link
                        key={product.id}
                        href={`/product/${product.slug}`}
                        className="group flex flex-col items-center text-center"
                      >
                        <div
                          style={{ backgroundColor: tint }}
                          className="relative aspect-square w-full overflow-hidden rounded-[18px] border border-[#F0E4D2] p-2.5 transition-transform group-active:scale-[0.96]"
                        >
                          <div className="relative h-full w-full overflow-hidden rounded-xl bg-white/80">
                            <CatalogImage src={getCardImage(product)} />
                          </div>
                          <span
                            aria-hidden="true"
                            className="absolute right-1.5 bottom-1.5 grid size-5 place-items-center rounded-full bg-white/90 text-[#A8421A]"
                          >
                            <ArrowUpRight className="h-3 w-3" />
                          </span>
                        </div>
                        <span className="mt-1.5 line-clamp-2 text-[11px] font-semibold leading-tight text-[#3A2418]">
                          {product.name}
                        </span>
                      </Link>
                    ))}
                  </div>
                </section>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
