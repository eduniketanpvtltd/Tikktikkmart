"use client";

import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, ChevronRight, Clock3, MapPin, Tag } from "lucide-react";
import { useCartStore, type CartItem } from "@/stores/cartStore";
import { CartRow } from "@/components/customer/CartRows";
import { CartSuggestions } from "@/components/customer/CartSuggestions";
import { EmptyCartBasket, FreeDeliveryProgress } from "@/components/customer/CartIndicators";
import { AnimatedRupees, formatRupees } from "@/components/customer/AnimatedRupees";
import { showCustomerToast } from "@/components/customer/CustomerFeedback";
import { consumeProductCartOrigin, getCartOrigin } from "@/lib/cartEntry";
import { cartQuoteKey, PILOT_STORE_ID, requestCartQuote, useCartQuote } from "@/lib/pricing/useCartQuote";
import {
  DEFAULT_DELIVERY_FEE,
  DEFAULT_FREE_DELIVERY_ABOVE,
  DEFAULT_HANDLING_FEE,
  DEFAULT_MIN_CART_VALUE,
  DEFAULT_SMALL_CART_FEE,
} from "@/lib/pricing/constants";
import type { BillBreakdown, Product, ProductVariant } from "@/types/db";

const welcomeCoupon = "WELCOME50";

function estimateBill(items: CartItem[], couponCode: string | null, tip: number): BillBreakdown {
  const itemsTotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const mrpTotal = items.reduce((sum, item) => sum + item.mrp * item.quantity, 0);
  const handlingFee = itemsTotal > 0 ? DEFAULT_HANDLING_FEE : 0;
  const deliveryFee = itemsTotal > 0 && itemsTotal < DEFAULT_FREE_DELIVERY_ABOVE ? DEFAULT_DELIVERY_FEE : 0;
  const smallCartFee = itemsTotal > 0 && itemsTotal < DEFAULT_MIN_CART_VALUE ? DEFAULT_SMALL_CART_FEE : 0;
  const discount = couponCode === welcomeCoupon && itemsTotal >= DEFAULT_FREE_DELIVERY_ABOVE ? 50 : 0;
  const savings = Math.max(0, mrpTotal - itemsTotal + discount);

  return {
    itemsTotal, mrpTotal, handlingFee, deliveryFee, smallCartFee, discount, savings,
    tip,
    taxTotal: 0,
    grandTotal: Math.max(0, itemsTotal - discount + handlingFee + deliveryFee + smallCartFee + tip),
    couponCode: discount ? welcomeCoupon : null,
  };
}

export default function CartPage() {
  const router = useRouter();
  const { storeId, items, couponCode, tip, location, etaMinutes, serviceable, setCoupon, setTip } = useCartStore();
  const queryClient = useQueryClient();
  const effectiveStore = storeId || PILOT_STORE_ID;
  const count = items.reduce((sum, item) => sum + item.quantity, 0);
  const [hasShadow, setHasShadow] = useState(false);
  const [backHref, setBackHref] = useState("/");
  const openedFromProduct = useRef(false);
  const [couponOpen, setCouponOpen] = useState(false);
  const [couponDraft, setCouponDraft] = useState<string>();
  const [applying, setApplying] = useState(false);
  const { data: quote } = useCartQuote();

  const { data: catalog } = useQuery({
    queryKey: ["home-recommended", effectiveStore],
    enabled: count > 0,
    queryFn: async ({ signal }) => {
      const response = await fetch(`/api/home?storeId=${encodeURIComponent(effectiveStore)}`, { signal });
      const result = await response.json();
      if (!response.ok || !result.ok) throw new Error("Suggestions unavailable");
      return result.data as { products: Product[] };
    },
  });

  useEffect(() => {
    openedFromProduct.current ||= consumeProductCartOrigin();
    setBackHref(getCartOrigin());
    const update = () => setHasShadow(window.scrollY > 8);
    update();
    window.addEventListener("scroll", update, { passive: true });
    return () => window.removeEventListener("scroll", update);
  }, []);

  const bill = quote?.bill ?? estimateBill(items, couponCode, tip);
  const variants = new Map(catalog?.products.flatMap((product) =>
    (product.variants ?? []).map((variant) => [variant.id, variant] as const)));

  async function applyCoupon(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (applying) return;
    const code = (couponDraft ?? couponCode ?? "").trim().toUpperCase();
    if (code !== welcomeCoupon) {
      showCustomerToast("Invalid coupon code");
      return;
    }

    const snapshot = useCartStore.getState();
    setApplying(true);
    try {
      const result = await requestCartQuote(effectiveStore, snapshot.items, code, snapshot.tip);
      const current = useCartStore.getState();
      if (current.items !== snapshot.items || current.storeId !== snapshot.storeId || current.tip !== snapshot.tip || current.couponCode !== snapshot.couponCode) {
        showCustomerToast("Cart changed. Try applying the coupon again.");
        return;
      }
      if (result.bill.couponCode !== code || result.bill.couponError) {
        showCustomerToast(result.bill.couponError || "Coupon unavailable for this cart");
        return;
      }
      queryClient.setQueryData(cartQuoteKey(effectiveStore, snapshot.items, code, snapshot.tip), result);
      setCoupon(code);
      setCouponDraft(code);
      setCouponOpen(false);
      showCustomerToast(`${formatRupees(result.bill.discount)} coupon applied`);
    } catch {
      showCustomerToast("Couldn’t check the coupon. Try again.");
    } finally {
      setApplying(false);
    }
  }

  return (
    <div data-cart-page className="cart-review-page mx-auto min-h-svh max-w-[540px] bg-[#FBF6EE] text-[#3A2418]">
      <header className="cart-review-header cart-screen-entry sticky top-0 z-30 flex items-center gap-3 bg-[#FBF6EE]" data-shadow={hasShadow ? "" : undefined}>
        <Link href={backHref} replace aria-label="Back" className="grid size-10 shrink-0 place-items-center rounded-full bg-[#FBE3CF] text-[#A8421A] hover:bg-[#F5D3B6]"
          onNavigate={(event) => {
            if (!openedFromProduct.current) return;
            event.preventDefault();
            router.back();
          }}>
          <ArrowLeft aria-hidden="true" className="size-5" />
        </Link>
        <div>
          <p className="market-checkout-step">Step 1 of 2</p>
          <h1 className="text-[19px] leading-tight font-extrabold tracking-tight text-[#3A2418]">My cart</h1>
          <p className="mt-0.5 text-xs text-[#8A7060]">{count} {count === 1 ? "item" : "items"}</p>
        </div>
      </header>

      {count > 0 ? (
        <div className="cart-screen-entry space-y-3 px-[14px] pt-3">
          <section aria-labelledby="cart-delivery" className="cart-review-card bg-white">
            <div className="flex items-center gap-3 p-[14px]">
              <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#FBE3CF] text-[#A8421A]">
                <Clock3 aria-hidden="true" className="cart-delivery-clock size-5" />
              </span>
              <div>
                <h2 id="cart-delivery" className="text-base leading-tight font-extrabold text-[#3A2418]">
                  {serviceable === false ? "Choose a delivery address" : `Delivery in ${etaMinutes ?? 20} minutes`}
                </h2>
                <p className="mt-1 text-xs text-[#8A7060]">Shipment of {count} {count === 1 ? "item" : "items"}</p>
              </div>
            </div>
            <Link href="/checkout#delivery-address" className="market-cart-address flex items-center gap-3 px-[14px] py-3.5 hover:bg-[#FBF6EE]">
              <span className="grid size-9 shrink-0 place-items-center rounded-[10px] bg-[#FBE3CF] text-[#A8421A]"><MapPin aria-hidden="true" className="size-4" /></span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-bold text-[#3A2418]">Delivery area</span>
                <span className="mt-0.5 block truncate text-xs text-[#8A7060]">{location?.address || "Choose an address at checkout"}</span>
              </span>
              <ChevronRight aria-hidden="true" className="size-5 shrink-0 text-[#8A7060]" />
            </Link>
            <FreeDeliveryProgress subtotal={bill.itemsTotal} />
          </section>

          <CartItems items={items} variants={variants} />

          <section aria-label="Coupons" className="cart-review-card bg-white">
            <button
              type="button"
              aria-expanded={couponOpen}
              aria-controls="cart-coupon-form"
              onClick={() => setCouponOpen((open) => !open)}
              className="flex w-full items-center gap-3 px-[14px] py-3.5 text-left hover:bg-[#FBF6EE]"
            >
              <span className="grid size-9 shrink-0 place-items-center rounded-[10px] bg-[#FBE3CF] text-[#A8421A]"><Tag aria-hidden="true" className="size-4" /></span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-bold text-[#3A2418]">Use coupons</span>
                <span className="mt-0.5 block text-xs text-[#8A7060]">
                  {bill.couponCode ? `${bill.couponCode} applied` : bill.couponError || "Save ₹50 with WELCOME50 on eligible orders"}
                </span>
              </span>
              <ChevronRight aria-hidden="true" className={`size-5 shrink-0 text-[#8A7060] motion-safe:transition-transform ${couponOpen ? "rotate-90" : ""}`} />
            </button>

            <form id="cart-coupon-form" hidden={!couponOpen} onSubmit={applyCoupon}>
              <div className="flex flex-wrap gap-2 px-[14px] pb-[14px]">
                <input
                  type="text"
                  aria-label="Coupon code"
                  autoCapitalize="characters"
                  maxLength={32}
                  value={couponDraft ?? couponCode ?? ""}
                  onChange={(event) => setCouponDraft(event.target.value)}
                  placeholder="Enter coupon code"
                  className="h-11 min-w-0 flex-1 rounded-xl border border-[#EADBC6] bg-[#FBF6EE] px-3 text-base font-semibold text-[#3A2418] focus:outline-2 focus:outline-[#A8421A]/40"
                />
                <button type="submit" disabled={applying} className="min-h-11 rounded-xl bg-[#A8421A] px-4 text-sm font-bold text-white hover:bg-[#8E3513] disabled:opacity-60">
                  {applying ? "Checking…" : "Apply"}
                </button>
                {couponCode && <button type="button" onClick={() => { setCoupon(null); setCouponDraft(""); }} className="w-full text-left text-xs font-bold text-[#A8421A]">Remove coupon</button>}
              </div>
            </form>

          </section>

          {catalog && <CartSuggestions key={effectiveStore} products={catalog.products} />}

          <section aria-labelledby="cart-bill" className="cart-review-card bg-white p-[14px]">
            <h2 id="cart-bill" className="mb-2 text-[15px] font-extrabold text-[#3A2418]">Bill details</h2>
            <dl className="space-y-2.5 text-[13px]">
              <BillRow label="Items total">
                {bill.mrpTotal > bill.itemsTotal && <s className="mr-1.5 text-xs font-normal text-[#8A7060]">{formatRupees(bill.mrpTotal)}</s>}
                <AnimatedRupees value={bill.itemsTotal} />
              </BillRow>
              <BillRow label="Delivery charge">
                {bill.deliveryFee === 0 ? <span className="font-extrabold text-[#2E7D4F]">FREE</span> : formatRupees(bill.deliveryFee)}
              </BillRow>
              <BillRow label="Handling charge">{formatRupees(bill.handlingFee)}</BillRow>
              {bill.smallCartFee > 0 && <BillRow label="Small cart fee">{formatRupees(bill.smallCartFee)}</BillRow>}
              {bill.tip > 0 && (
                <BillRow label={<span className="flex items-center gap-2">Rider tip <button type="button" onClick={() => setTip(0)} className="text-xs font-semibold text-[#A8421A] underline">Remove</button></span>}>
                  {formatRupees(bill.tip)}
                </BillRow>
              )}
              {bill.couponCode && bill.discount > 0 && <BillRow label="Coupon discount"><span className="text-[#2E7D4F]">−{formatRupees(bill.discount)}</span></BillRow>}
              <div className="flex items-baseline justify-between gap-3 border-t border-dashed border-[#F0E4D2] pt-3 text-base font-extrabold text-[#3A2418]">
                <dt>Grand total</dt>
                <dd className="text-lg"><AnimatedRupees value={bill.grandTotal} /></dd>
              </div>
              <div className="flex items-center justify-between gap-2 rounded-xl bg-[#E3F0DA] px-3 py-2.5 text-xs font-bold text-[#2E7D4F]">
                <dt>Your total savings</dt>
                <dd><AnimatedRupees value={bill.savings} /></dd>
              </div>
            </dl>
          </section>

          <section aria-labelledby="cart-policy" className="cart-review-card bg-white p-[14px] text-xs leading-relaxed text-[#8A7060]">
            <h2 id="cart-policy" className="font-bold text-[#3A2418]">Cancellation policy</h2>
            <p>Orders can be cancelled until the store packs them.</p>
          </section>
        </div>
      ) : (
        <div className="cart-screen-entry space-y-4 px-[14px] pt-22 text-center">
          <EmptyCartBasket />
          <h2 className="text-lg font-extrabold text-[#3A2418]">Your cart is empty</h2>
          <Link href="/" className="inline-flex min-h-11 items-center justify-center rounded-full bg-[#A8421A] px-6 text-sm font-bold text-white hover:bg-[#8E3513]">
            Browse products
          </Link>
        </div>
      )}

      <CheckoutBar total={count > 0 ? bill.grandTotal : 0} hidden={count === 0} checkingCoupon={applying} />
    </div>
  );
}

function CartItems({ items, variants }: { items: CartItem[]; variants: Map<string, ProductVariant> }) {
  const [initial] = useState(() => new Map(items.map(({ variantId }, index) => [variantId, index])));
  return (
    <section aria-labelledby="market-basket-title" className="cart-review-card">
      <h2 id="market-basket-title" className="px-[14px] pt-[14px] text-base font-extrabold">Your basket</h2>
      {items.map((item) => {
        const variant = variants.get(item.variantId);
        return <CartRow key={item.variantId} item={item} initialIndex={initial.get(item.variantId)} stock={variant?.stock_available} orderLimit={variant?.max_qty_per_order} />;
      })}
    </section>
  );
}

function BillRow({ label, children }: { label: ReactNode; children: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="text-[#8A7060]">{label}</dt>
      <dd className="shrink-0 font-bold text-[#3A2418] tabular-nums">{children}</dd>
    </div>
  );
}

function CheckoutBar({ total, hidden, checkingCoupon }: { total: number; hidden: boolean; checkingCoupon: boolean }) {
  const router = useRouter();
  const ripple = useRef<HTMLSpanElement>(null);
  const shouldDelay = useRef(false);
  const timer = useRef<number>(undefined);
  useEffect(() => () => window.clearTimeout(timer.current), []);

  return (
    <div data-cart-checkout-bar data-empty={hidden ? "" : undefined} aria-hidden={hidden} inert={hidden}
      className="cart-checkout-bar fixed inset-x-0 bottom-0 z-40 mx-auto flex w-full max-w-[540px] items-center gap-4 rounded-t-[20px] border-t border-[#F0E4D2] bg-white shadow-[0_-6px_22px_rgba(58,36,24,0.08)]"
    >
      <div className="min-w-17">
        <p className="text-xs text-[#8A7060]">Total</p>
        <p className="text-xl font-black leading-tight text-[#3A2418]"><AnimatedRupees value={total} /></p>
      </div>
      <Link
        href="/checkout"
        aria-disabled={checkingCoupon}
        className="relative flex h-[52px] min-w-0 flex-1 items-center justify-center gap-2 overflow-hidden rounded-[14px] bg-[#A8421A] px-3 text-[15px] font-bold text-white hover:bg-[#8E3513] aria-disabled:opacity-60 motion-safe:transition-transform motion-safe:active:scale-[.97]"
        onClick={(event) => {
          shouldDelay.current = false;
          const marker = ripple.current;
          if (checkingCoupon || !marker || !event.detail || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
          const rect = event.currentTarget.getBoundingClientRect();
          marker.style.left = `${event.clientX - rect.left}px`;
          marker.style.top = `${event.clientY - rect.top}px`;
          marker.animate([
            { transform: "translate(-50%, -50%) scale(.1)", opacity: .5 },
            { transform: "translate(-50%, -50%) scale(10)", opacity: 0 },
          ], { duration: 420, easing: "ease-out" });
          shouldDelay.current = true;
        }}
        onNavigate={(event) => {
          if (checkingCoupon) {
            event.preventDefault();
            return;
          }
          if (!shouldDelay.current) return;
          event.preventDefault();
          if (timer.current != null) return;
          timer.current = window.setTimeout(() => router.push("/checkout"), 110);
        }}
      >
        Continue to checkout <ChevronRight aria-hidden="true" className="size-5 shrink-0" />
        <span ref={ripple} aria-hidden="true" className="pointer-events-none absolute size-8 rounded-full bg-[var(--white)] opacity-0" />
      </Link>
    </div>
  );
}
