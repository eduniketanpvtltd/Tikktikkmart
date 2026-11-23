"use client";

import { useRef } from "react";
import Link from "next/link";
import { useQueryClient } from "@tanstack/react-query";
import { useIntentPrefetch } from "@/lib/ui/useIntentPrefetch";
import { getProductData } from "@/lib/catalog/productQuery";
import { Heart, Minus, Plus } from "lucide-react";
import { CatalogImage } from "@/components/customer/CatalogImage";
import { signalStockLimit } from "@/components/customer/CustomerFeedback";
import { QuantityNumber } from "@/components/customer/QuantityNumber";
import { pressTilt, useOpenProduct } from "@/lib/catalog/productMotion";
import { flyToCart } from "@/lib/catalog/flyToCart";
import { useCartStore } from "@/stores/cartStore";
import type { Product } from "@/types/db";

interface ProductCardProps {
  product: Product;
  compact?: boolean;
  browse?: boolean;
  saved?: boolean;
  onToggleSaved?: () => void;
}

const catalogImageOverrides: Record<string, { original: string; replacement: string | null }> = {
  "farm-fresh-white-eggs": { original: "photo-1516467508483-a7212febe31a", replacement: "/storefront/eggs.webp" },
  "fresh-hybrid-tomato": { original: "photo-1546470427-e26264be0b0d", replacement: "/storefront/tomatoes.webp" },
  // 250 ml packshot from the manufacturer's India catalog.
  "red-bull-energy-drink": { original: "photo-1551024709-8f23befc6f87", replacement: "/storefront/red-bull.webp" },
  "thums-up-can": { original: "photo-1622483767028-3f66f32aef97", replacement: null },
  // Evan-Amos, public domain: https://commons.wikimedia.org/wiki/File:Oreo-Two-Cookies.jpg
  "oreo-original-cookies": { original: "photo-1568051243851-f9b136146e97", replacement: "/storefront/oreo.jpg" },
};

export function getCardImage(product: Product) {
  const source = product.images?.[0];
  const override = catalogImageOverrides[product.slug];

  return source && override && source.includes(override.original)
    ? override.replacement
    : (source ?? null);
}

export function ProductCard({ product, compact = false, browse = false, saved = false, onToggleSaved }: ProductCardProps) {
  const openProduct = useOpenProduct();
  const query = useQueryClient();
  const href = `/product/${product.slug}`;
  const intent = useIntentPrefetch(href, () => {
    const { storeId } = useCartStore.getState();
    void query.prefetchQuery({
      queryKey: ["product-detail", product.slug, storeId],
      queryFn: ({ signal }) => getProductData<Product>(product.slug, storeId, signal),
    });
  });
  const imageFrame = useRef<HTMLDivElement>(null);
  const variant = product.variants?.[0];
  const quantity = useCartStore((state) => state.items.find((item) => item.variantId === variant?.id)?.quantity ?? 0);
  const addItem = useCartStore((state) => state.addItem);
  const setQty = useCartStore((state) => state.setQty);
  const etaMinutes = useCartStore((state) => state.etaMinutes);
  const serviceable = useCartStore((state) => state.serviceable);
  const ripple = useRef<HTMLSpanElement>(null);
  if (!variant) return null;

  const image = getCardImage(product);
  const options = product.variants?.length ?? 0;
  const rating = product.rating;
  const hasRating = typeof rating === "number" && rating > 0 && rating <= 5;
  const stars = hasRating ? Math.round(rating) : 0;
  const price = variant.effective_price ?? variant.base_price;
  const mrp = variant.mrp;
  const discount = mrp > price ? Math.round(((mrp - price) / mrp) * 100) : 0;
  const stock = variant.stock_available;
  const orderLimit = variant.max_qty_per_order ?? 10;
  const maxQty = Math.min(stock ?? Infinity, orderLimit);

  return (
    <article {...pressTilt} className={`press-tilt group relative flex min-w-0 flex-col rounded-xl ${browse ? "browse-product w-full" : compact ? "w-[32%] min-w-[116px] shrink-0 snap-start bg-[var(--white)] sm:w-[166px]" : "w-full border border-[color:var(--theme-line)] bg-[var(--white)] p-2 sm:p-3"}`}>
      {onToggleSaved && (
        <button
          type="button"
          aria-label={`${saved ? "Remove" : "Save"} ${product.name} ${saved ? "from" : "to"} wishlist`}
          aria-pressed={saved}
          onClick={onToggleSaved}
          className="hit-area storefront-heart absolute right-1.5 top-1.5 z-10 grid size-9 place-items-center rounded-full bg-[var(--white)] text-[color:var(--theme-orange-text)] shadow-xs hover:bg-[var(--peach-light)] sm:right-3 sm:top-3"
        >
          <Heart aria-hidden="true" className={`size-4 ${saved ? "fill-current" : ""}`} />
        </button>
      )}
      <Link {...intent} href={href} prefetch={false} aria-label={product.name} className="order-1 block rounded-xl after:absolute after:inset-0 after:z-[1] after:rounded-xl" onNavigate={(event) => {
        event.preventDefault();
        openProduct(product, imageFrame.current);
      }}>
        <div ref={imageFrame} data-card-image={product.slug} data-storefront-tile className={`relative flex items-center justify-center overflow-hidden rounded-xl border border-[color:var(--theme-line)] bg-[var(--white)] ${compact || browse ? "aspect-square" : "aspect-[5/4]"}`}>
          <CatalogImage src={image} className="object-contain p-1" />
          {!browse && <div aria-hidden="true" className="absolute bottom-2 left-2 flex gap-1 rounded-full bg-[var(--white)] px-1.5 py-1">
            <i className="size-1.5 rounded-full bg-[var(--navy)]" />
            <i className="size-1.5 rounded-full bg-[var(--theme-skeleton)]" />
            <i className="size-1.5 rounded-full bg-[var(--theme-skeleton)]" />
          </div>}
          {discount > 0 && (
            <span className="absolute left-1.5 top-1.5 rounded bg-[var(--navy)] px-1.5 py-0.5 text-[10px] font-bold text-[color:var(--theme-on-navy)]">
              {discount}% off
            </span>
          )}
        </div>
      </Link>

      <div className={`order-2 flex items-end gap-1 ${browse ? "browse-product-action -mt-[23px] justify-end" : "-mt-[18px] justify-between"}`}>
        {!browse && <span className="min-w-0 truncate self-end pt-6 text-xs font-medium text-[color:var(--theme-muted)]">{variant.label}</span>}
        <div className="relative z-10 -mr-1.5 max-w-full shrink-0 rounded-lg">
          {maxQty <= 0 && quantity === 0 ? (
            <span className="relative self-center rounded bg-[var(--theme-skeleton)] px-1.5 py-1 text-[10px] font-semibold text-[color:var(--theme-muted)]">Sold out</span>
          ) : quantity > 0 ? (
            <div className="product-card-stepper relative inline-flex h-11 max-w-full items-center rounded-lg bg-[var(--theme-orange-fill)] text-white">
              <button
                type="button"
                onClick={() => setQty(variant.id, quantity - 1)}
                aria-label={`Decrease quantity of ${product.name}`}
                className="grid min-h-11 min-w-11 place-items-center rounded-l-lg hover:bg-white/20"
              >
                <Minus aria-hidden="true" className="size-3.5" />
              </button>
              <QuantityNumber value={quantity} />
              <button
                type="button"
                onClick={(event) => {
                  if (quantity >= maxQty) signalStockLimit(event.currentTarget, stock ?? Infinity, orderLimit);
                  else setQty(variant.id, quantity + 1);
                }}
                aria-label={`Increase quantity of ${product.name}`}
                className="grid min-h-11 min-w-11 place-items-center rounded-r-lg hover:bg-white/20 disabled:opacity-50"
              >
                <Plus aria-hidden="true" className="size-3.5" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              aria-label={`Add ${product.name} to cart`}
              onClick={(event) => {
                const dot = ripple.current;
                if (dot && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
                  const bounds = event.currentTarget.getBoundingClientRect();
                  const x = event.detail ? event.clientX - bounds.left : bounds.width / 2;
                  const y = event.detail ? event.clientY - bounds.top : bounds.height / 2;
                  dot.style.left = `${x}px`;
                  dot.style.top = `${y}px`;
                  dot.animate([
                    { transform: "translate(-50%, -50%) scale(.1)", opacity: .5 },
                    { transform: "translate(-50%, -50%) scale(5)", opacity: 0 },
                  ], { duration: 420, easing: "ease-out" });
                }
                addItem({ variantId: variant.id, productId: product.id, name: product.name, label: variant.label, image, price, mrp, maxQty, stockLimit: stock });
                flyToCart(event.currentTarget);
              }}
              className="relative inline-flex h-11 min-w-14 shrink-0 items-center justify-center flex-col gap-0 rounded-lg border-[1.5px] border-[color:var(--border-orange)] bg-[var(--white)] px-2 text-xs font-bold text-[color:var(--theme-orange-text)] transition-colors hover:bg-[var(--peach)] motion-safe:active:scale-95"
            >
              <span className="flex items-center gap-0.5">ADD <Plus aria-hidden="true" className="size-3" /></span>
              {options > 1 && <span className="text-[9px] leading-3 text-[color:var(--theme-ink)]">{options} options</span>}
            </button>
          )}
          <span aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden rounded-lg">
            <span ref={ripple} className="absolute size-7 rounded-full bg-[var(--white)] opacity-0" />
          </span>
        </div>
      </div>
      <div className="product-card-price order-3 flex items-baseline gap-1 pt-1.5">
        <span className="text-sm font-extrabold leading-tight tabular-nums text-[color:var(--theme-ink)]">₹{price}</span>
        {mrp > price && <s className="text-[11px] leading-tight tabular-nums text-[color:var(--theme-muted)]">₹{mrp}</s>}
      </div>
      <h3 className="layout-wrap order-4 mt-1 min-h-9 text-[13px] font-bold leading-[18px] text-[color:var(--theme-ink)] group-hover:text-[color:var(--theme-orange-text)]">
        {product.name}
      </h3>
      {(!browse || hasRating) && <div className="order-5 flex min-h-4 items-center gap-1 text-[10px] text-[color:var(--theme-muted)]" aria-label={hasRating ? `${rating} out of 5 stars${product.review_count == null ? "" : `, ${product.review_count} reviews`}` : "Unrated"}>
        <span aria-hidden="true" className={hasRating ? "text-[color:var(--theme-orange-text)]" : "text-[color:var(--theme-muted)]"}>{"★".repeat(stars)}{"☆".repeat(5 - stars)}</span>
        {hasRating ? product.review_count?.toLocaleString("en-IN") : "Unrated"}
      </div>}
      <span className={`order-6 mt-1 w-fit text-[10px] ${browse ? "text-[color:var(--theme-muted)]" : "rounded-full bg-[var(--peach-light)] px-1.5 py-0.5 font-semibold text-[color:var(--theme-ink)]"}`}>
        {browse && variant.label}
        {browse && (etaMinutes != null || serviceable === false) && <span aria-hidden="true"> · </span>}
        {serviceable === false ? "Check delivery" : (!browse || etaMinutes != null) && <><span aria-hidden="true">◐ </span>{etaMinutes ?? 20} mins</>}
      </span>
    </article>
  );
}
