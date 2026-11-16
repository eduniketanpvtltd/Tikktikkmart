"use client";
import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  ChevronRight,
  Zap,
  ShieldCheck,
  Clock,
  Sparkles,
  ArrowRight,
} from "lucide-react";
import { useCartStore } from "@/stores/cartStore";
import { ProductCard } from "@/components/customer/ProductCard";
import type { Category, Product } from "@/types/db";

// Curated pastel background themes for category tiles matching brand accents
const CATEGORY_COLORS: Record<string, { bg: string; border: string }> = {
  "vegetables-fruits": { bg: "bg-[#eef9f2]", border: "border-[#d2f0db]" },
  "dairy-bread-eggs": { bg: "bg-[#f0f7ff]", border: "border-[#d6e7ff]" },
  "munchies-snacks": { bg: "bg-[#fff7ed]", border: "border-[#ffedd5]" },
  "cold-drinks-juices": { bg: "bg-[#fef2f2]", border: "border-[#fee2e2]" },
  "atta-rice-dal": { bg: "bg-[#fefce8]", border: "border-[#fef08a]" },
  "instant-frozen": { bg: "bg-[#faf5ff]", border: "border-[#f3e8ff]" },
};

const PROMO_SLIDES = [
  {
    id: "promo-1",
    badge: "LAST MINUTE SAVER",
    title: "TIKK TIKK MART — 10 Mins Delivery",
    subtitle: "Fresh milk, bread, eggs, veggies & chilled drinks at your door",
    cta: "Shop Essentials",
    link: "/category/dairy-bread-eggs",
    bgGradient: "from-[#f66002] via-[#ff6f14] to-[#d64f00]",
    textColor: "text-white",
  },
  {
    id: "promo-2",
    badge: "FLAT ₹50 OFF",
    title: "First Order Discount with WELCOME50",
    subtitle: "Use code WELCOME50 on checkout for instant ₹50 discount",
    cta: "Claim Discount",
    link: "/cart",
    bgGradient: "from-[#13193b] via-[#1a234f] to-[#13193b]",
    textColor: "text-white",
  },
  {
    id: "promo-3",
    badge: "MIDNIGHT CRAVINGS",
    title: "Snacks, Cold Drinks & Munchies",
    subtitle: "Kurkure, chips, ice cold Coke & 2-minute Maggi in minutes",
    cta: "Explore Munchies",
    link: "/category/munchies-snacks",
    bgGradient: "from-[#ff7a29] to-[#ea580c]",
    textColor: "text-white",
  },
];

export default function CustomerHomePage() {
  const { storeId, serviceable, setServiceability } = useCartStore();
  const [activeBanner, setActiveBanner] = useState(0);

  // Auto-slide banner carousel
  useEffect(() => {
    const timer = setInterval(() => {
      setActiveBanner((prev) => (prev + 1) % PROMO_SLIDES.length);
    }, 4500);
    return () => clearInterval(timer);
  }, []);

  // On first visit, auto-detect location or default to Kolkata pilot store coordinates
  useEffect(() => {
    if (serviceable === null) {
      fetch("/api/serviceability?lat=22.5726&lng=88.3639")
        .then((r) => r.json())
        .then((json) => {
          if (json?.ok && json.data?.serviceable) {
            setServiceability({
              location: { lat: 22.5726, lng: 88.3639, address: "Park Street, Kolkata" },
              serviceable: true,
              storeId: json.data.storeId,
              storeName: json.data.storeName,
              etaMinutes: json.data.etaMinutes,
            });
          }
        })
        .catch(() => {});
    }
  }, [serviceable, setServiceability]);

  const { data, isLoading } = useQuery({
    queryKey: ["home", storeId],
    queryFn: async () => {
      const url = storeId ? `/api/home?storeId=${storeId}` : "/api/home";
      const res = await fetch(url);
      const json = await res.json();
      return json.data as {
        banners: Array<{ id: string; image_url: string; link_type: string; link_value: string }>;
        categories: Category[];
        products: Product[];
      };
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-44 sm:h-52 rounded-3xl bg-gray-200" />
        <div className="grid grid-cols-4 sm:grid-cols-6 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-28 rounded-2xl bg-gray-200" />
          ))}
        </div>
        <div className="h-60 rounded-3xl bg-gray-200" />
      </div>
    );
  }

  const categories = data?.categories ?? [];
  const products = data?.products ?? [];

  // Group products into shelves
  const dairyProducts = products.filter((p) => p.category_id === "22222222-2222-2222-2222-222222222202");
  const snackProducts = products.filter((p) => p.category_id === "22222222-2222-2222-2222-222222222203");
  const drinkProducts = products.filter((p) => p.category_id === "22222222-2222-2222-2222-222222222204");
  const vegProducts = products.filter((p) => p.category_id === "22222222-2222-2222-2222-222222222201");
  const stapleProducts = products.filter(
    (p) =>
      p.category_id === "22222222-2222-2222-2222-222222222205" ||
      p.category_id === "22222222-2222-2222-2222-222222222206"
  );

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Location warning if out of bounds */}
      {serviceable === false && (
        <div className="rounded-2xl bg-amber-50 border border-amber-200 p-4 text-xs sm:text-sm text-amber-900 flex items-center justify-between gap-3 shadow-2xs">
          <span>
            📍 We are not delivering to your selected pin yet. Tap location above to pick Park Street, Kolkata.
          </span>
          <span className="font-bold underline shrink-0 cursor-pointer">Change</span>
        </div>
      )}

      {/* Hero Banner Carousel (Tikk Tikk Mart Colors) */}
      <section className="relative overflow-hidden rounded-3xl shadow-[0_8px_25px_rgba(246,96,2,0.12)]">
        <div
          className="flex transition-transform duration-500 ease-out"
          style={{ transform: `translateX(-${activeBanner * 100}%)` }}
        >
          {PROMO_SLIDES.map((slide) => (
            <div
              key={slide.id}
              className={`w-full shrink-0 bg-gradient-to-r ${slide.bgGradient} ${slide.textColor} p-5 sm:p-7 min-h-[160px] sm:min-h-[190px] flex flex-col justify-between relative overflow-hidden`}
            >
              {/* Speed line ambient decor */}
              <div className="absolute right-[-20px] bottom-[-20px] w-52 h-52 bg-white/10 rounded-full blur-2xl pointer-events-none" />

              <div className="space-y-1 relative z-10 max-w-md">
                <span className="inline-block bg-[#ffd269] text-[#13193b] text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full mb-1">
                  {slide.badge}
                </span>
                <h1 className="text-lg sm:text-2xl font-black tracking-tight leading-tight">
                  {slide.title}
                </h1>
                <p className="text-xs sm:text-sm font-medium opacity-90 line-clamp-2">
                  {slide.subtitle}
                </p>
              </div>

              <div className="relative z-10 pt-2">
                <Link
                  href={slide.link}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white text-[#13193b] font-black text-xs hover:bg-[#fff5ed] transition-colors shadow-xs"
                >
                  {slide.cta} <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          ))}
        </div>

        {/* Carousel indicators */}
        <div className="absolute bottom-2.5 right-4 flex items-center gap-1.5 z-20">
          {PROMO_SLIDES.map((_, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => setActiveBanner(idx)}
              className={`h-1.5 rounded-full transition-all ${
                activeBanner === idx ? "w-5 bg-white" : "w-1.5 bg-white/50"
              }`}
            />
          ))}
        </div>
      </section>

      {/* Explore Categories Matrix */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-lg">🛍️</span>
            <h2 className="text-base sm:text-lg font-black text-[#13193b] tracking-tight">
              Explore by Category
            </h2>
          </div>
          <Link
            href="/category/dairy-bread-eggs"
            className="text-xs font-black text-[#f66002] hover:underline flex items-center"
          >
            SEE ALL <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2.5 sm:gap-3">
          {categories.map((c) => {
            const style = CATEGORY_COLORS[c.slug] || { bg: "bg-white", border: "border-gray-100" };
            return (
              <Link
                key={c.id}
                href={`/category/${c.slug}`}
                className={`group ${style.bg} border ${style.border} rounded-2xl p-2.5 sm:p-3 flex flex-col items-center text-center gap-1.5 shadow-[0_2px_6px_rgba(19,25,59,0.02)] hover:shadow-[0_6px_16px_rgba(246,96,2,0.08)] hover:scale-[1.02] transition-all duration-150`}
              >
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl overflow-hidden flex items-center justify-center mix-blend-multiply p-1">
                  {c.image_url ? (
                    <img
                      src={c.image_url}
                      alt={c.name}
                      className="w-full h-full object-contain group-hover:scale-110 transition-transform duration-300"
                    />
                  ) : (
                    <span className="text-2xl">🛒</span>
                  )}
                </div>
                <span className="text-[11px] sm:text-xs font-bold text-gray-800 line-clamp-2 leading-tight group-hover:text-[#f66002]">
                  {c.name}
                </span>
              </Link>
            );
          })}
        </div>
      </section>

      {/* Shelf 1: Dairy, Bread & Eggs */}
      {dairyProducts.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <div className="flex items-center gap-1.5">
                <span className="text-lg">🥛</span>
                <h2 className="text-base sm:text-lg font-black text-[#13193b] tracking-tight">
                  Dairy, Bread & Eggs
                </h2>
              </div>
              <p className="text-[11px] text-gray-500 font-medium">Fresh morning essentials in 10 mins</p>
            </div>
            <Link
              href="/category/dairy-bread-eggs"
              className="text-xs font-black text-[#f66002] hover:underline flex items-center"
            >
              SEE ALL <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2 pt-1 -mx-3 px-3 sm:mx-0 sm:px-0">
            {dairyProducts.map((p) => (
              <ProductCard key={p.id} product={p} compact />
            ))}
          </div>
        </section>
      )}

      {/* Shelf 2: Munchies & Snacks */}
      {snackProducts.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <div className="flex items-center gap-1.5">
                <span className="text-lg">🍿</span>
                <h2 className="text-base sm:text-lg font-black text-[#13193b] tracking-tight">
                  Munchies & Snacks
                </h2>
              </div>
              <p className="text-[11px] text-gray-500 font-medium">Chips, namkeen, cookies & crisps</p>
            </div>
            <Link
              href="/category/munchies-snacks"
              className="text-xs font-black text-[#f66002] hover:underline flex items-center"
            >
              SEE ALL <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2 pt-1 -mx-3 px-3 sm:mx-0 sm:px-0">
            {snackProducts.map((p) => (
              <ProductCard key={p.id} product={p} compact />
            ))}
          </div>
        </section>
      )}

      {/* Mid-Page Promo Card: TIKK TIKK Navy & Orange Express Banner */}
      <div className="bg-[#13193b] text-white rounded-3xl p-5 sm:p-6 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm border border-[#1f2752]">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-[#f66002] text-white flex items-center justify-center shrink-0 shadow-xs">
            <Zap className="w-6 h-6 fill-white" />
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-[#ffd269]">
              <span className="text-[10px] font-black uppercase tracking-wider">
                TIKK TIKK MART EXPRESS
              </span>
            </div>
            <h3 className="text-sm sm:text-base font-black">
              No minimum order · Free delivery above ₹199
            </h3>
            <p className="text-xs text-gray-300">
              Dispatched from your hyper-local dark store within 60 seconds
            </p>
          </div>
        </div>
        <Link
          href="/category/vegetables-fruits"
          className="shrink-0 w-full sm:w-auto text-center px-5 py-2.5 rounded-xl bg-[#f66002] text-white text-xs font-black uppercase tracking-wider hover:bg-[#dc5400] transition-colors shadow-xs"
        >
          Shop Fresh Produce
        </Link>
      </div>

      {/* Shelf 3: Cold Drinks & Juices */}
      {drinkProducts.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <div className="flex items-center gap-1.5">
                <span className="text-lg">🥤</span>
                <h2 className="text-base sm:text-lg font-black text-[#13193b] tracking-tight">
                  Cold Drinks & Juices
                </h2>
              </div>
              <p className="text-[11px] text-gray-500 font-medium">Chilled fizzy sodas, cans & juices</p>
            </div>
            <Link
              href="/category/cold-drinks-juices"
              className="text-xs font-black text-[#f66002] hover:underline flex items-center"
            >
              SEE ALL <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2 pt-1 -mx-3 px-3 sm:mx-0 sm:px-0">
            {drinkProducts.map((p) => (
              <ProductCard key={p.id} product={p} compact />
            ))}
          </div>
        </section>
      )}

      {/* Shelf 4: Fresh Vegetables & Fruits */}
      {vegProducts.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <div className="flex items-center gap-1.5">
                <span className="text-lg">🥦</span>
                <h2 className="text-base sm:text-lg font-black text-[#13193b] tracking-tight">
                  Fresh Vegetables & Fruits
                </h2>
              </div>
              <p className="text-[11px] text-gray-500 font-medium">Farm-fresh daily harvested produce</p>
            </div>
            <Link
              href="/category/vegetables-fruits"
              className="text-xs font-black text-[#f66002] hover:underline flex items-center"
            >
              SEE ALL <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2 pt-1 -mx-3 px-3 sm:mx-0 sm:px-0">
            {vegProducts.map((p) => (
              <ProductCard key={p.id} product={p} compact />
            ))}
          </div>
        </section>
      )}

      {/* Shelf 5: Atta, Rice, Dal & Instant */}
      {stapleProducts.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <div className="flex items-center gap-1.5">
                <span className="text-lg">🍚</span>
                <h2 className="text-base sm:text-lg font-black text-[#13193b] tracking-tight">
                  Atta, Rice, Dal & Instant Food
                </h2>
              </div>
              <p className="text-[11px] text-gray-500 font-medium">Daily kitchen staples and noodles</p>
            </div>
            <Link
              href="/category/atta-rice-dal"
              className="text-xs font-black text-[#f66002] hover:underline flex items-center"
            >
              SEE ALL <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2 pt-1 -mx-3 px-3 sm:mx-0 sm:px-0">
            {stapleProducts.map((p) => (
              <ProductCard key={p.id} product={p} compact />
            ))}
          </div>
        </section>
      )}

      {/* Why Tikk Tikk Mart Trust Section */}
      <section className="bg-white rounded-3xl border border-gray-100 p-5 sm:p-6 space-y-4 shadow-xs">
        <h3 className="text-xs font-black uppercase tracking-wider text-gray-400">
          Why Tikk Tikk Mart — Last Minute Saver
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#fff5ed] text-[#f66002] flex items-center justify-center shrink-0">
              <Clock className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <h4 className="text-xs sm:text-sm font-extrabold text-gray-900">
                10-Minute Delivery
              </h4>
              <p className="text-[11px] text-gray-500 mt-0.5">
                Dark stores located within 2 km of your doorstep.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#e8f8ee] text-[#0c831f] flex items-center justify-center shrink-0">
              <Sparkles className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <h4 className="text-xs sm:text-sm font-extrabold text-gray-900">
                Supermarket Prices
              </h4>
              <p className="text-[11px] text-gray-500 mt-0.5">
                Best discounts and MRP reductions daily.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#f0f7ff] text-[#256fef] flex items-center justify-center shrink-0">
              <ShieldCheck className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <h4 className="text-xs sm:text-sm font-extrabold text-gray-900">
                100% Quality Assured
              </h4>
              <p className="text-[11px] text-gray-500 mt-0.5">
                Hygienically packed and inspected fresh items.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
