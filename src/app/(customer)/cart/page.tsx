"use client";
import React, { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  Minus,
  Plus,
  Tag,
  Trash2,
  ArrowRight,
  Zap,
  Sparkles,
  Heart,
  Info,
} from "lucide-react";
import { useCartStore } from "@/stores/cartStore";
import { ProductCard } from "@/components/customer/ProductCard";
import type { BillBreakdown, Product } from "@/types/db";

const QUICK_COUPONS = [
  { code: "WELCOME50", desc: "Flat ₹50 OFF (Min ₹199)", minOrder: 199 },
  { code: "TIKKTIKK20", desc: "20% OFF on munchies", minOrder: 99 },
];

export default function CartPage() {
  const { storeId, items, couponCode, tip, location, setQty, setCoupon, setTip, clearCart } =
    useCartStore();
  const [couponInput, setCouponInput] = useState(couponCode ?? "");
  const [donateFeedingIndia, setDonateFeedingIndia] = useState(false);

  const effectiveStoreId = storeId || "11111111-1111-1111-1111-111111111111";

  // Bill quote
  const { data: quote } = useQuery({
    queryKey: ["cart-quote", effectiveStoreId, items, couponCode, tip],
    enabled: items.length > 0,
    queryFn: async () => {
      const res = await fetch("/api/cart/quote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          storeId: effectiveStoreId,
          items: items.map((i) => ({ variant_id: i.variantId, quantity: i.quantity })),
          couponCode,
          tip,
        }),
      });
      const json = await res.json();
      return json?.data as { bill: BillBreakdown } | undefined;
    },
  });

  // Recommended "Before you checkout" products
  const { data: homeData } = useQuery({
    queryKey: ["home-recommended", effectiveStoreId],
    queryFn: async () => {
      const url = `/api/home?storeId=${effectiveStoreId}`;
      const res = await fetch(url);
      const json = await res.json();
      return json.data as { products: Product[] };
    },
  });

  if (!items.length) {
    return (
      <div className="max-w-md mx-auto my-8 bg-white rounded-3xl border border-gray-100 p-8 text-center space-y-5 shadow-sm">
        <div className="w-20 h-20 rounded-full bg-[#fff5ed] flex items-center justify-center mx-auto text-3xl">
          🛍️
        </div>
        <div className="space-y-1">
          <h1 className="text-xl font-black text-gray-900">Your cart is empty</h1>
          <p className="text-xs text-gray-500 max-w-xs mx-auto">
            Your daily essentials and late-night cravings delivered to your doorstep in 10 minutes.
          </p>
        </div>
        <Link
          href="/"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-[#f66002] hover:bg-[#dc5400] text-white text-xs font-black uppercase tracking-wider transition-all shadow-md active:scale-95"
        >
          Browse Products <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    );
  }

  // Instant client-side computation fallback so Bill Details is NEVER stuck
  const rawItemsTotal = items.reduce((acc, i) => acc + i.price * i.quantity, 0);
  const rawMrpTotal = items.reduce((acc, i) => acc + (i.mrp || i.price) * i.quantity, 0);
  const rawDeliveryFee = rawItemsTotal >= 199 ? 0 : 25;
  const rawHandlingFee = 5;
  const rawSmallCartFee = rawItemsTotal < 99 ? 15 : 0;
  const rawDiscount = couponCode === "WELCOME50" && rawItemsTotal >= 199 ? 50 : 0;
  const rawGrandTotal = Math.max(0, rawItemsTotal + rawDeliveryFee + rawHandlingFee + rawSmallCartFee + tip - rawDiscount);

  const bill: BillBreakdown = quote?.bill ?? {
    itemsTotal: rawItemsTotal,
    mrpTotal: rawMrpTotal,
    savings: rawMrpTotal - rawItemsTotal + rawDiscount,
    deliveryFee: rawDeliveryFee,
    handlingFee: rawHandlingFee,
    smallCartFee: rawSmallCartFee,
    tip,
    discount: rawDiscount,
    taxTotal: Math.round(rawItemsTotal * 0.05),
    grandTotal: rawGrandTotal,
    couponCode: couponCode ?? null,
  };

  const itemsTotal = bill.itemsTotal;
  const freeDeliveryThreshold = 199;
  const amountNeededForFreeDelivery = Math.max(0, freeDeliveryThreshold - itemsTotal);
  const progressPct = Math.min(100, Math.round((itemsTotal / freeDeliveryThreshold) * 100));

  const cartVariantIds = new Set(items.map((i) => i.variantId));
  const suggestedProducts = (homeData?.products ?? [])
    .filter((p) => p.variants?.some((v) => !cartVariantIds.has(v.id)))
    .slice(0, 6);

  const finalGrandTotal = (bill.grandTotal ?? itemsTotal) + (donateFeedingIndia ? 2 : 0);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-5 items-start">
      {/* Left Column: Delivery banner, items, recommendations, tip, coupon */}
      <div className="space-y-4">
        {/* Delivery ETA Header */}
        <div className="bg-[#fff5ed] border border-[#ffd8c2] rounded-2xl p-3.5 flex items-center justify-between gap-3 shadow-2xs">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#f66002] text-white flex items-center justify-center shrink-0 shadow-2xs">
              <Zap className="w-5 h-5 fill-white" />
            </div>
            <div>
              <p className="text-xs font-black text-[#f66002] tracking-tight">
                DELIVERY IN 10-15 MINS · LAST MINUTE SAVER
              </p>
              <p className="text-[11px] text-gray-600 truncate max-w-[220px] sm:max-w-md">
                {location?.address ? `Delivering to: ${location.address}` : "Park Street Dark Store"}
              </p>
            </div>
          </div>
          <span className="text-[10px] font-black uppercase bg-white text-[#f66002] px-2 py-1 rounded-md border border-[#ffd8c2] shrink-0">
            Express
          </span>
        </div>

        {/* Free Delivery Goal Tracker */}
        <div className="bg-white rounded-2xl border border-gray-100 p-4 space-y-2 shadow-2xs">
          <div className="flex items-center justify-between text-xs">
            {amountNeededForFreeDelivery > 0 ? (
              <span className="font-bold text-gray-800">
                Add <span className="text-[#f66002] font-black">₹{amountNeededForFreeDelivery}</span> more for <span className="text-[#f66002] font-black">FREE delivery</span>
              </span>
            ) : (
              <span className="font-black text-[#0c831f] flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5" /> Yay! You unlocked FREE delivery
              </span>
            )}
            <span className="text-[11px] font-bold text-gray-400">{progressPct}%</span>
          </div>
          <div className="w-full h-2 rounded-full bg-gray-100 overflow-hidden">
            <div
              className="h-full bg-[#f66002] transition-all duration-300 rounded-full"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>

        {/* Cart Items List */}
        <div className="bg-white rounded-3xl border border-gray-100 divide-y divide-gray-100 shadow-2xs overflow-hidden">
          <div className="px-4 py-3 flex items-center justify-between bg-gray-50/50">
            <h2 className="font-black text-xs uppercase tracking-wider text-gray-500">
              Items in Cart ({items.length})
            </h2>
            <button
              type="button"
              onClick={clearCart}
              className="text-[11px] font-bold text-red-600 hover:text-red-700 inline-flex items-center gap-1"
            >
              <Trash2 className="w-3 h-3" /> Clear Cart
            </button>
          </div>

          {items.map((item) => (
            <div key={item.variantId} className="p-3.5 sm:p-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-14 h-14 rounded-2xl bg-gray-50 p-1 flex items-center justify-center shrink-0 border border-gray-100">
                  {item.image ? (
                    <img src={item.image} alt={item.name} className="w-full h-full object-contain" />
                  ) : (
                    <span className="text-xl">🛍️</span>
                  )}
                </div>
                <div className="min-w-0">
                  <h3 className="text-xs sm:text-sm font-extrabold text-gray-900 truncate">
                    {item.name}
                  </h3>
                  <p className="text-[11px] font-medium text-gray-500">{item.label}</p>
                  <div className="flex items-baseline gap-1 mt-0.5">
                    <span className="text-xs sm:text-sm font-black text-gray-900">
                      ₹{item.price * item.quantity}
                    </span>
                    {item.mrp > item.price && (
                      <span className="text-[10px] text-gray-400 line-through">
                        ₹{item.mrp * item.quantity}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Tikk Tikk Mart Stepper */}
              <div className="inline-flex items-center bg-[#f66002] text-white rounded-xl overflow-hidden shadow-xs shrink-0">
                <button
                  type="button"
                  onClick={() => setQty(item.variantId, item.quantity - 1)}
                  className="p-1.5 hover:bg-[#dc5400] active:scale-90 transition-transform"
                >
                  <Minus className="w-3 h-3 stroke-[3]" />
                </button>
                <span className="px-2 text-xs font-black min-w-[20px] text-center select-none">
                  {item.quantity}
                </span>
                <button
                  type="button"
                  onClick={() => setQty(item.variantId, item.quantity + 1)}
                  className="p-1.5 hover:bg-[#dc5400] active:scale-90 transition-transform"
                >
                  <Plus className="w-3 h-3 stroke-[3]" />
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Missed Something / Recommended Shelf */}
        {suggestedProducts.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-1.5 px-1">
              <span className="text-base">⚡</span>
              <h2 className="text-sm font-black text-gray-900 tracking-tight">
                Before you checkout / Missed something?
              </h2>
            </div>
            <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2 pt-1 -mx-3 px-3 sm:mx-0 sm:px-0">
              {suggestedProducts.map((p) => (
                <ProductCard key={p.id} product={p} compact />
              ))}
            </div>
          </div>
        )}

        {/* Apply Coupon Card */}
        <div className="bg-white rounded-3xl border border-gray-100 p-4 space-y-3 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black uppercase tracking-wider text-gray-700 flex items-center gap-1.5">
              <Tag className="w-4 h-4 text-[#f66002]" /> Coupons & Offers
            </span>
            {couponCode && (
              <span className="text-[10px] font-black bg-[#fff5ed] text-[#f66002] px-2 py-0.5 rounded-full">
                Applied
              </span>
            )}
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              value={couponInput}
              onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
              placeholder="Enter coupon code"
              className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-xs sm:text-sm font-bold uppercase placeholder:normal-case placeholder:font-normal focus:outline-none focus:border-[#f66002]"
            />
            <button
              type="button"
              onClick={() => setCoupon(couponInput.trim() || null)}
              className="px-4 py-2 rounded-xl bg-[#13193b] hover:bg-black text-white text-xs font-black uppercase tracking-wider transition-colors"
            >
              Apply
            </button>
            {couponCode && (
              <button
                type="button"
                onClick={() => {
                  setCouponInput("");
                  setCoupon(null);
                }}
                className="px-3 py-2 rounded-xl border border-red-200 text-xs font-bold text-red-600 hover:bg-red-50"
              >
                Remove
              </button>
            )}
          </div>

          {/* Quick coupon suggestion chips */}
          <div className="flex flex-wrap gap-2 pt-1">
            {QUICK_COUPONS.map((qc) => (
              <button
                key={qc.code}
                type="button"
                onClick={() => {
                  setCouponInput(qc.code);
                  setCoupon(qc.code);
                }}
                className={`text-[11px] font-extrabold px-2.5 py-1 rounded-lg border transition-all text-left flex items-center gap-1.5 ${
                  couponCode === qc.code
                    ? "bg-[#fff5ed] border-[#f66002] text-[#f66002]"
                    : "bg-gray-50 border-gray-200 text-gray-700 hover:border-gray-300"
                }`}
              >
                <span className="font-mono">{qc.code}</span>
                <span className="text-[10px] text-gray-500 font-medium">{qc.desc}</span>
              </button>
            ))}
          </div>

          {bill?.couponError && (
            <p className="text-xs font-bold text-red-600">{bill.couponError}</p>
          )}
          {bill?.couponCode && !bill?.couponError && (
            <p className="text-xs font-bold text-[#0c831f]">
              🎉 Coupon {bill.couponCode} applied! Saved ₹{bill.discount}
            </p>
          )}
        </div>

        {/* Tip Delivery Partner Card */}
        <div className="bg-white rounded-3xl border border-gray-100 p-4 space-y-2.5 shadow-2xs">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xs sm:text-sm font-extrabold text-gray-900">
                Tip your delivery rider
              </h3>
              <p className="text-[11px] text-gray-500">
                100% of the tip goes directly to the partner.
              </p>
            </div>
            <span className="text-xl">🛵</span>
          </div>

          <div className="flex gap-2">
            {[0, 10, 20, 30, 50].map((amt) => (
              <button
                key={amt}
                type="button"
                onClick={() => setTip(amt)}
                className={`flex-1 py-1.5 rounded-xl border text-xs font-black transition-all ${
                  tip === amt
                    ? "bg-[#f66002] text-white border-[#f66002] shadow-2xs"
                    : "bg-white border-gray-200 text-gray-700 hover:bg-gray-50"
                }`}
              >
                {amt === 0 ? "None" : `₹${amt}`}
              </button>
            ))}
          </div>
        </div>

        {/* Feeding India / Micro Donation Checkbox */}
        <label className="bg-white rounded-2xl border border-gray-100 p-3.5 flex items-center justify-between gap-3 cursor-pointer shadow-2xs select-none">
          <div className="flex items-center gap-2.5">
            <Heart className="w-4 h-4 text-red-500 fill-red-500 shrink-0" />
            <div className="text-xs">
              <span className="font-extrabold text-gray-900">Feeding India donation</span>
              <p className="text-[11px] text-gray-500">Help feed a child with every grocery order</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-black text-gray-800">₹2</span>
            <input
              type="checkbox"
              checked={donateFeedingIndia}
              onChange={(e) => setDonateFeedingIndia(e.target.checked)}
              className="w-4 h-4 accent-[#f66002] rounded"
            />
          </div>
        </label>

        {/* Cancellation Policy Banner */}
        <div className="bg-gray-50 rounded-2xl p-3 text-[11px] text-gray-500 flex items-start gap-2 border border-gray-100">
          <Info className="w-3.5 h-3.5 text-gray-400 shrink-0 mt-0.5" />
          <span>
            Orders cannot be cancelled once packed by dark store staff to maintain our 10-minute delivery promise.
          </span>
        </div>
      </div>

      {/* Right Column: Sticky Bill Breakdown & Proceed CTA */}
      <aside className="bg-white rounded-3xl border border-gray-100 p-5 space-y-4 shadow-sm lg:sticky lg:top-24">
        <h2 className="text-sm font-black uppercase tracking-wider text-gray-800 border-b pb-2">
          Bill Details
        </h2>

        {bill ? (
          <div className="space-y-2.5 text-xs sm:text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Items Total (MRP)</span>
              <span className="font-medium">₹{bill.mrpTotal}</span>
            </div>

            {bill.mrpTotal > bill.itemsTotal && (
              <div className="flex justify-between text-[#0c831f] font-bold">
                <span>Product Discount</span>
                <span>−₹{(bill.mrpTotal - bill.itemsTotal).toFixed(0)}</span>
              </div>
            )}

            <div className="flex justify-between">
              <span className="text-gray-600">Delivery Partner Fee</span>
              <span>
                {bill.deliveryFee === 0 ? (
                  <span className="text-[#0c831f] font-black">FREE</span>
                ) : (
                  `₹${bill.deliveryFee}`
                )}
              </span>
            </div>

            <div className="flex justify-between">
              <span className="text-gray-600 flex items-center gap-1">
                Handling Charge <span className="text-[10px] text-gray-400">(bag & hygiene)</span>
              </span>
              <span className="font-medium">₹{bill.handlingFee}</span>
            </div>

            {bill.smallCartFee > 0 && (
              <div className="flex justify-between">
                <span className="text-gray-600">Small Cart Fee</span>
                <span className="font-medium">₹{bill.smallCartFee}</span>
              </div>
            )}

            {bill.tip > 0 && (
              <div className="flex justify-between">
                <span className="text-gray-600">Rider Tip</span>
                <span className="font-bold text-gray-800">₹{bill.tip}</span>
              </div>
            )}

            {donateFeedingIndia && (
              <div className="flex justify-between">
                <span className="text-gray-600">Feeding India</span>
                <span className="font-bold text-gray-800">₹2</span>
              </div>
            )}

            {bill.discount > 0 && (
              <div className="flex justify-between text-[#0c831f] font-black bg-[#e8f8ee] p-2 rounded-xl">
                <span>Coupon ({bill.couponCode})</span>
                <span>−₹{bill.discount}</span>
              </div>
            )}

            <div className="border-t pt-3 flex justify-between items-baseline font-black text-base sm:text-lg text-gray-900">
              <span>To Pay</span>
              <span className="tracking-tight text-[#f66002]">₹{finalGrandTotal.toFixed(0)}</span>
            </div>

            <p className="text-[10px] text-gray-400">
              Inclusive of ₹{bill.taxTotal} GST and all dark store handling fees.
            </p>
          </div>
        ) : (
          <div className="py-4 text-center text-xs text-gray-400">Calculating your bill...</div>
        )}

        <Link
          href="/checkout"
          className="w-full flex items-center justify-between px-5 py-3.5 rounded-2xl bg-[#f66002] hover:bg-[#dc5400] active:scale-[0.99] text-white font-black text-sm tracking-wide uppercase transition-all shadow-md"
        >
          <span>Proceed to Pay</span>
          <span className="flex items-center gap-1 font-mono">
            ₹{finalGrandTotal.toFixed(0)} <ArrowRight className="w-4 h-4" />
          </span>
        </Link>
      </aside>
    </div>
  );
}
