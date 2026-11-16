"use client";
import React, { useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, SlidersHorizontal } from "lucide-react";
import { useCartStore } from "@/stores/cartStore";
import { ProductCard } from "@/components/customer/ProductCard";
import type { Category, Product } from "@/types/db";

export default function CategoryPage() {
  const { slug } = useParams<{ slug: string }>();
  const { storeId } = useCartStore();
  const [sortBy, setSortBy] = useState<"relevance" | "price_low" | "price_high" | "discount">("relevance");

  // Fetch all categories for the left sidebar
  const { data: allCategories = [] } = useQuery({
    queryKey: ["all-categories"],
    queryFn: async () => {
      const res = await fetch("/api/categories");
      const json = await res.json();
      return (json.data ?? []) as Category[];
    },
  });

  const { data, isLoading } = useQuery({
    queryKey: ["category-detail", slug, storeId],
    queryFn: async () => {
      const qs = storeId ? `?storeId=${storeId}` : "";
      const res = await fetch(`/api/categories/${slug}/products${qs}`);
      const json = await res.json();
      return json.data as { category: Category; subcategories: Category[]; products: Product[] };
    },
  });

  if (isLoading) {
    return (
      <div className="py-12 flex flex-col items-center justify-center gap-3">
        <div className="w-8 h-8 rounded-full border-2 border-[#f66002] border-t-transparent animate-spin" />
        <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">
          Loading fresh items...
        </p>
      </div>
    );
  }

  const category = data?.category;
  let products = data?.products ?? [];

  // Client sort
  if (sortBy === "price_low") {
    products = [...products].sort((a, b) => {
      const pa = a.variants?.[0]?.effective_price ?? a.variants?.[0]?.base_price ?? 0;
      const pb = b.variants?.[0]?.effective_price ?? b.variants?.[0]?.base_price ?? 0;
      return pa - pb;
    });
  } else if (sortBy === "price_high") {
    products = [...products].sort((a, b) => {
      const pa = a.variants?.[0]?.effective_price ?? a.variants?.[0]?.base_price ?? 0;
      const pb = b.variants?.[0]?.effective_price ?? b.variants?.[0]?.base_price ?? 0;
      return pb - pa;
    });
  } else if (sortBy === "discount") {
    products = [...products].sort((a, b) => {
      const da = ((a.variants?.[0]?.mrp ?? 0) - (a.variants?.[0]?.base_price ?? 0));
      const db = ((b.variants?.[0]?.mrp ?? 0) - (b.variants?.[0]?.base_price ?? 0));
      return db - da;
    });
  }

  return (
    <div className="space-y-4">
      {/* Top Header */}
      <div className="flex items-center justify-between gap-3 bg-white p-3 sm:p-4 rounded-2xl border border-gray-100 shadow-2xs">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="p-2 rounded-xl bg-gray-50 hover:bg-gray-100 text-gray-700 transition-colors shrink-0"
          >
            <ArrowLeft className="w-4 h-4 stroke-[2.5]" />
          </Link>
          <div>
            <h1 className="text-base sm:text-lg font-black text-gray-900 leading-tight">
              {category?.name ?? "Category"}
            </h1>
            <p className="text-[11px] text-gray-500 font-medium">
              {products.length} products available for 10-min delivery
            </p>
          </div>
        </div>

        {/* Sort selector */}
        <div className="flex items-center gap-1 text-xs">
          <SlidersHorizontal className="w-3.5 h-3.5 text-gray-400 hidden sm:block" />
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="border border-gray-200 rounded-xl px-2.5 py-1.5 bg-gray-50 text-xs font-bold text-gray-700 focus:outline-none focus:border-[#f66002]"
          >
            <option value="relevance">Popularity</option>
            <option value="price_low">Price: Low to High</option>
            <option value="price_high">Price: High to Low</option>
            <option value="discount">Highest Discount</option>
          </select>
        </div>
      </div>

      {/* Blinkit Split Layout: Left Rail + Product Grid */}
      <div className="grid grid-cols-1 md:grid-cols-[200px_1fr] gap-4 items-start">
        {/* Left Categories Rail */}
        <aside className="bg-white rounded-2xl border border-gray-100 p-2 shadow-2xs flex md:flex-col gap-1 overflow-x-auto no-scrollbar md:sticky md:top-24">
          <p className="text-[10px] font-black uppercase tracking-wider text-gray-400 px-3 py-1 hidden md:block">
            Categories
          </p>
          {allCategories.map((c) => {
            const isCurrent = c.slug === slug;
            return (
              <Link
                key={c.id}
                href={`/category/${c.slug}`}
                className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap shrink-0 ${
                  isCurrent
                    ? "bg-[#fff0e6] text-[#f66002] border-l-4 border-[#f66002] shadow-2xs font-black"
                    : "text-gray-700 hover:bg-gray-50 hover:text-gray-950"
                }`}
              >
                {c.image_url && (
                  <img
                    src={c.image_url}
                    alt={c.name}
                    className="w-6 h-6 rounded-md object-contain shrink-0"
                  />
                )}
                <span className="truncate">{c.name}</span>
              </Link>
            );
          })}
        </aside>

        {/* Right Product Grid */}
        <section className="space-y-4">
          {products.length === 0 ? (
            <div className="bg-white rounded-2xl border p-12 text-center space-y-3">
              <span className="text-3xl">🥦</span>
              <h3 className="font-bold text-base text-gray-800">No products in this category</h3>
              <p className="text-xs text-gray-500">
                Check back soon or explore other categories.
              </p>
              <Link
                href="/"
                className="inline-block px-4 py-2.5 rounded-xl bg-[#f66002] hover:bg-[#dd5500] text-white text-xs font-bold transition-colors shadow-sm"
              >
                Explore Homepage
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5 sm:gap-3">
              {products.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
