"use client";
import React, { Suspense, useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Search as SearchIcon, X, TrendingUp } from "lucide-react";
import { useCartStore } from "@/stores/cartStore";
import { ProductCard } from "@/components/customer/ProductCard";
import type { Product } from "@/types/db";

const POPULAR_SEARCHES = [
  "Milk",
  "Bread",
  "Eggs",
  "Butter",
  "Potato",
  "Onion",
  "Chips",
  "Maggi",
  "Coke",
  "Tomato",
  "Atta",
  "Cookies",
];

function SearchResults() {
  const router = useRouter();
  const sp = useSearchParams();
  const initialQ = sp.get("q") ?? "";
  const [searchTerm, setSearchTerm] = useState(initialQ);
  const { storeId } = useCartStore();

  useEffect(() => {
    setSearchTerm(initialQ);
  }, [initialQ]);

  const { data: products = [], isLoading } = useQuery({
    queryKey: ["search", searchTerm, storeId],
    enabled: Boolean(searchTerm.trim()),
    queryFn: async () => {
      const qs = new URLSearchParams({ q: searchTerm.trim() });
      if (storeId) qs.set("storeId", storeId);
      const res = await fetch(`/api/search?${qs.toString()}`);
      const json = await res.json();
      return (json.data ?? []) as Product[];
    },
  });

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchTerm.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchTerm.trim())}`);
    }
  };

  return (
    <div className="space-y-4 max-w-4xl mx-auto">
      {/* Top Search Bar */}
      <div className="flex items-center gap-2">
        <Link
          href="/"
          className="p-2 rounded-xl bg-white border border-gray-100 hover:bg-gray-50 text-gray-700 transition-colors shrink-0"
        >
          <ArrowLeft className="w-4 h-4 stroke-[2.5]" />
        </Link>
        <form onSubmit={handleSearchSubmit} className="relative flex-1">
          <SearchIcon className="w-4 h-4 text-gray-400 absolute left-3.5 top-3 pointer-events-none" />
          <input
            type="text"
            autoFocus
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search for milk, chips, bread, veggies..."
            className="w-full pl-10 pr-9 py-2.5 text-xs sm:text-sm font-medium rounded-2xl bg-white border border-gray-200/90 focus:border-[#f66002] focus:ring-2 focus:ring-[#f66002]/15 focus:outline-none shadow-2xs transition-all"
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => {
                setSearchTerm("");
                router.push("/search");
              }}
              className="absolute right-3 top-3 text-gray-400 hover:text-gray-700"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </form>
      </div>

      {/* When no query is entered: show Trending / Popular Searches */}
      {!searchTerm.trim() ? (
        <div className="bg-white rounded-3xl border border-gray-100 p-5 space-y-4 shadow-2xs">
          <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-gray-500">
            <TrendingUp className="w-4 h-4 text-[#f66002]" />
            <span>Popular & Trending Searches</span>
          </div>

          <div className="flex flex-wrap gap-2">
            {POPULAR_SEARCHES.map((term) => (
              <button
                key={term}
                type="button"
                onClick={() => {
                  setSearchTerm(term);
                  router.push(`/search?q=${encodeURIComponent(term)}`);
                }}
                className="px-3 py-1.5 rounded-full border border-gray-200 bg-gray-50 text-xs font-bold text-gray-700 hover:bg-[#fff0e6] hover:border-[#f66002] hover:text-[#f66002] transition-all"
              >
                {term}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <h2 className="text-xs font-bold uppercase tracking-wider text-gray-500">
            {products.length} {products.length === 1 ? "result" : "results"} for &ldquo;
            <span className="text-gray-900 font-black">{searchTerm}</span>&rdquo;
          </h2>

          {isLoading ? (
            <div className="py-12 text-center text-xs text-gray-400 font-bold uppercase tracking-wider">
              Searching dark store shelves...
            </div>
          ) : products.length === 0 ? (
            <div className="bg-white rounded-3xl border border-gray-100 p-10 text-center space-y-3 shadow-2xs">
              <span className="text-3xl">🔍</span>
              <h3 className="font-bold text-sm text-gray-800">
                No matching products found
              </h3>
              <p className="text-xs text-gray-500 max-w-xs mx-auto">
                Try searching for something else like milk, bread, chips or cold drinks.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2.5 sm:gap-3">
              {products.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense
      fallback={
        <div className="py-8 text-center text-xs text-gray-400 font-bold">
          Loading search...
        </div>
      }
    >
      <SearchResults />
    </Suspense>
  );
}
