"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useQueryClient } from "@tanstack/react-query";
import { useIntentPrefetch } from "@/lib/ui/useIntentPrefetch";
import { getProductData } from "@/lib/catalog/productQuery";
import { Heart, Minus, Plus, X } from "lucide-react";
import { CatalogImage } from "@/components/customer/CatalogImage";
import { signalStockLimit } from "@/components/customer/CustomerFeedback";
import { QuantityNumber } from "@/components/customer/QuantityNumber";
import { SwipeableSheet } from "@/components/ui/SwipeableSheet";
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
  // Illustrative replacements for the seeded catalogue only. Uploaded photos keep priority.
  "fresh-red-onions": { original: "photo-1618512496248-a07fe83aa8cb", replacement: "/storefront/essentials/fresh-red-onions.jpg" },
  "farm-fresh-white-eggs": { original: "photo-1516467508483-a7212febe31a", replacement: "/storefront/essentials/farm-fresh-white-eggs.jpg" },
  "cavendish-banana": { original: "photo-1571771894821-ce9b6c11b08e", replacement: "/storefront/essentials/cavendish-banana.jpg" },
  "fresh-jyoti-potato": { original: "photo-1518977676601-b53f82aba655", replacement: "/storefront/essentials/fresh-jyoti-potato.jpg" },
  "amul-taaza-milk": { original: "photo-1563636619-e9143da7973b", replacement: "/storefront/essentials/amul-taaza-milk.jpg" },
  "brown-sandwich-bread": { original: "photo-1509440159596-0249088772ff", replacement: "/storefront/essentials/brown-sandwich-bread.jpg" },
  "fresh-hybrid-tomato": { original: "photo-1546470427-e26264be0b0d", replacement: "/storefront/tomatoes.webp" },
  // 250 ml packshot from the manufacturer's India catalog.
  "red-bull-energy-drink": { original: "photo-1551024709-8f23befc6f87", replacement: "/storefront/red-bull.webp" },
  "thums-up-can": { original: "photo-1622483767028-3f66f32aef97", replacement: null },
  // Evan-Amos, public domain: https://commons.wikimedia.org/wiki/File:Oreo-Two-Cookies.jpg
  "oreo-original-cookies": { original: "photo-1568051243851-f9b136146e97", replacement: "/storefront/oreo.jpg" },
};

export function isIllustrativeCatalogImage(source?: string | null) {
  return source?.startsWith("/storefront/essentials/") ?? false;
}

export function getCardImage(product: Product) {
  const source = product.images?.[0];
  const override = catalogImageOverrides[product.slug];

  // Some demo records reuse another SKU's local packshot.
  if (source?.startsWith("/storefront/essentials/") &&
      source.split("/").pop()?.replace(/\.(jpg|webp)$/, "") !== product.slug) return null;
  if (source === "/storefront/fresh-shop.webp") return null;
  if (source === "/storefront/tomatoes.webp" && product.slug !== "fresh-hybrid-tomato") return null;

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
  const cartItems = useCartStore((state) => state.items);
  const [variantSheetOpen, setVariantSheetOpen] = useState(false);
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

  const buyControls = (
    <div className={`flex items-end gap-1 ${browse ? "market-product-action" : "order-2 -mt-[18px] justify-between"}`}>
      {!browse && <span className="min-w-0 truncate self-end pt-6 text-xs font-medium text-[color:var(--theme-muted)]">{variant.label}</span>}
      <div className="product-card-buy relative z-10 -mr-1.5 max-w-full shrink-0 rounded-lg">
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
            className="product-card-add relative inline-flex h-11 min-w-14 shrink-0 items-center justify-center flex-col gap-0 rounded-lg border-[1.5px] border-[color:var(--border-orange)] bg-[var(--white)] px-2 text-xs font-bold text-[color:var(--theme-orange-text)] transition-colors hover:bg-[var(--peach)] motion-safe:active:scale-95"
          >
            <span className="flex items-center gap-0.5">{browse ? "Add" : "ADD"} <Plus aria-hidden="true" className="size-3" /></span>
            {!browse && options > 1 && <span className="text-[9px] leading-3 text-[color:var(--theme-ink)]">{options} options</span>}
          </button>
        )}
        <span aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden rounded-lg">
          <span ref={ripple} className="product-card-ripple absolute size-7 rounded-full bg-[var(--white)] opacity-0" />
        </span>
      </div>
    </div>
  );
  const priceLine = (
    <div className="product-card-price order-3 flex items-baseline gap-1 pt-1.5">
      <span className="text-sm font-extrabold leading-tight tabular-nums text-[color:var(--theme-ink)]">₹{price}</span>
      {mrp > price && <s className="text-[11px] leading-tight tabular-nums text-[color:var(--theme-muted)]">₹{mrp}</s>}
    </div>
  );

  return (
    <article {...pressTilt} data-market-product={browse ? "" : undefined} className={`press-tilt group relative flex min-w-0 flex-col rounded-xl ${browse ? "browse-product w-full" : compact ? "w-[32%] min-w-[116px] shrink-0 snap-start bg-[var(--white)] sm:w-[166px]" : "w-full border border-[color:var(--theme-line)] bg-[var(--white)] p-2 sm:p-3"}`}>
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
      {browse ? (
        <>
          <Link {...intent} href={href} prefetch={false} aria-label={product.name} className="order-1 block rounded-xl after:absolute after:inset-0 after:z-[1] after:rounded-xl" onNavigate={(event) => {
            event.preventDefault();
            openProduct(product, imageFrame.current);
          }}>
            <div ref={imageFrame} data-card-image={product.slug} data-storefront-tile className="relative flex aspect-square items-center justify-center overflow-hidden rounded-xl border border-[#F0E4D2] bg-[var(--white)]">
              <CatalogImage src={image} className={isIllustrativeCatalogImage(image) ? "object-cover" : "object-contain p-1"} />

            </div>
          </Link>

          <div className="market-pack-controls">
            <span className="market-pack-label">
              {variant.label}
            </span>
            <div className="relative z-10 shrink-0">
              {maxQty <= 0 && quantity === 0 ? (
                <span className="inline-block rounded-md bg-[#F3E9DA] px-1.5 py-1 text-[10px] font-semibold text-[#8A7060]">Sold out</span>
              ) : quantity > 0 ? (
                <div className="market-card-stepper">
                  <button
                    type="button"
                    onClick={() => setQty(variant.id, quantity - 1)}
                    aria-label={`Decrease quantity of ${product.name}`}
                  >
                    <Minus aria-hidden="true" className="size-3" />
                  </button>
                  <QuantityNumber value={quantity} />
                  <button
                    type="button"
                    onClick={(event) => {
                      if (quantity >= maxQty) signalStockLimit(event.currentTarget, stock ?? Infinity, orderLimit);
                      else setQty(variant.id, quantity + 1);
                    }}
                    aria-label={`Increase quantity of ${product.name}`}
                  >
                    <Plus aria-hidden="true" className="size-3" />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  aria-label={options > 1 ? `Choose size for ${product.name}` : `Add ${product.name} to cart`}
                  onClick={(event) => {
                    if (options > 1) {
                      setVariantSheetOpen(true);
                      return;
                    }
                    addItem({ variantId: variant.id, productId: product.id, name: product.name, label: variant.label, image, price, mrp, maxQty, stockLimit: stock });
                    flyToCart(event.currentTarget);
                  }}
                  className={`market-card-add ${options > 1 ? "has-more" : ""}`}
                >
                  <span>ADD</span>
                  {options > 1 && <small>{options} sizes</small>}
                </button>
              )}
            </div>
          </div>

          {priceLine}
          {discount > 0 && (
            <span className="order-4 text-[10px] font-bold leading-tight text-[#A8421A]">
              Save {discount}%
            </span>
          )}
          <h3 className="layout-wrap order-5 mt-0.5 line-clamp-2 min-h-[2.4em] text-[11.5px] font-semibold leading-[1.22] text-[#3A2418]">
            {product.name}
          </h3>
          {hasRating && <div className="order-6 mt-0.5 flex flex-wrap items-center gap-1 text-[9.5px] text-[#8A7060]">
            <span
              className="flex items-center gap-0.5"
              aria-label={hasRating ? `${rating} out of 5 stars${product.review_count == null ? "" : `, ${product.review_count} reviews`}` : "No ratings yet"}
            >
              <span aria-hidden="true" className={hasRating ? "text-[#F59E0B]" : "text-[#D4C3AF]"}>
                {hasRating ? `${"★".repeat(stars)}${"☆".repeat(5 - stars)}` : "☆☆☆☆☆"}
              </span>
              {hasRating && product.review_count != null && (
                <span>({product.review_count.toLocaleString("en-IN")})</span>
              )}
            </span>
            {hasRating && rating >= 4.5 && (
              <span className="rounded bg-[#FFF0DA] px-1 py-0.5 text-[8.5px] font-semibold text-[#8A5A3A]">Top rated</span>
            )}
          </div>}
          <div className="order-7 mt-0.5 flex flex-wrap items-center gap-1 text-[10px] font-medium text-[#8A7060]">
            <span>{serviceable === false ? "Check delivery" : `◐ ${etaMinutes ?? 20} mins`}</span>
            {stock != null && stock > 0 && stock <= 3 && (
              <span className="rounded bg-[#FBE3CF] px-1 py-0.5 text-[9px] font-semibold text-[#3A2418]">{stock} left</span>
            )}
          </div>
          {variantSheetOpen && options > 1 && (
            <SwipeableSheet onClose={() => setVariantSheetOpen(false)} labelledBy={`variant-sheet-${product.id}`}>
              <div className="space-y-3 p-4 text-[#3A2418]">
                <div className="flex items-center justify-between gap-2">
                  <h4 id={`variant-sheet-${product.id}`} className="text-sm font-bold">{product.name}</h4>
                  <button
                    type="button"
                    aria-label="Close size picker"
                    onClick={() => setVariantSheetOpen(false)}
                    className="grid size-8 place-items-center rounded-full bg-[#FBF6EE] text-[#3A2418]"
                  >
                    <X size={16} aria-hidden="true" />
                  </button>
                </div>
                <div className="space-y-2">
                  {product.variants?.map((item) => {
                    const itemPrice = item.effective_price ?? item.base_price;
                    const itemQty = cartItems.find((entry) => entry.variantId === item.id)?.quantity ?? 0;
                    const itemMax = Math.min(item.stock_available ?? Infinity, item.max_qty_per_order ?? 10);
                    return (
                      <div key={item.id} className="flex items-center justify-between gap-3 rounded-xl border border-[#F0E4D2] bg-white p-2.5">
                        <div className="min-w-0">
                          <p className="text-xs font-bold">{item.label}</p>
                          <p className="text-xs font-extrabold">
                            ₹{itemPrice}{" "}
                            {item.mrp > itemPrice && <s className="text-[10px] font-normal text-[#A89484]">₹{item.mrp}</s>}
                          </p>
                        </div>
                        {itemMax <= 0 && itemQty === 0 ? (
                          <span className="rounded bg-[#F3E9DA] px-2 py-1 text-[10px] font-semibold text-[#8A7060]">Sold out</span>
                        ) : itemQty > 0 ? (
                          <div className="market-card-stepper">
                            <button type="button" onClick={() => setQty(item.id, itemQty - 1)} aria-label={`Decrease ${item.label}`}>
                              <Minus size={12} aria-hidden="true" />
                            </button>
                            <QuantityNumber value={itemQty} />
                            <button
                              type="button"
                              onClick={(event) => {
                                if (itemQty >= itemMax) signalStockLimit(event.currentTarget, item.stock_available ?? Infinity, item.max_qty_per_order ?? 10);
                                else setQty(item.id, itemQty + 1);
                              }}
                              aria-label={`Increase ${item.label}`}
                            >
                              <Plus size={12} aria-hidden="true" />
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => addItem({
                              variantId: item.id,
                              productId: product.id,
                              name: product.name,
                              label: item.label,
                              image,
                              price: itemPrice,
                              mrp: item.mrp,
                              maxQty: itemMax,
                              stockLimit: item.stock_available,
                            })}
                            className="market-card-add"
                          >
                            ADD
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </SwipeableSheet>
          )}
        </>
      ) : (
        <>
          <Link {...intent} href={href} prefetch={false} aria-label={product.name} className="order-1 block rounded-xl after:absolute after:inset-0 after:z-[1] after:rounded-xl" onNavigate={(event) => {
            event.preventDefault();
            openProduct(product, imageFrame.current);
          }}>
            <div ref={imageFrame} data-card-image={product.slug} data-storefront-tile className={`relative flex items-center justify-center overflow-hidden rounded-xl border border-[color:var(--theme-line)] bg-[var(--white)] ${compact ? "aspect-square" : "aspect-[5/4]"}`}>
              <CatalogImage src={image} className="object-contain p-1" />
              <div aria-hidden="true" className="absolute bottom-2 left-2 flex gap-1 rounded-full bg-[var(--white)] px-1.5 py-1">
                <i className="size-1.5 rounded-full bg-[var(--navy)]" />
                <i className="size-1.5 rounded-full bg-[var(--theme-skeleton)]" />
                <i className="size-1.5 rounded-full bg-[var(--theme-skeleton)]" />
              </div>
              {discount > 0 && (
                <span className="product-card-discount absolute left-1.5 top-1.5 rounded bg-[var(--navy)] px-1.5 py-0.5 text-[10px] font-bold text-[color:var(--theme-on-navy)]">
                  {discount}% off
                </span>
              )}
            </div>
          </Link>
          {buyControls}
          {priceLine}
          <h3 className="layout-wrap order-4 mt-1 min-h-9 text-[13px] font-bold leading-[18px] text-[color:var(--theme-ink)] group-hover:text-[color:var(--theme-orange-text)]">
            {product.name}
          </h3>
          <div className="order-5 flex min-h-4 items-center gap-1 text-[10px] text-[color:var(--theme-muted)]" aria-label={hasRating ? `${rating} out of 5 stars${product.review_count == null ? "" : `, ${product.review_count} reviews`}` : "Unrated"}>
            <span aria-hidden="true" className={hasRating ? "text-[color:var(--theme-orange-text)]" : "text-[color:var(--theme-muted)]"}>{"★".repeat(stars)}{"☆".repeat(5 - stars)}</span>
            {hasRating ? product.review_count?.toLocaleString("en-IN") : "Unrated"}
          </div>
          <span className="order-6 mt-1 w-fit rounded-full bg-[var(--peach-light)] px-1.5 py-0.5 text-[10px] font-semibold text-[color:var(--theme-ink)]">
            {serviceable === false ? "Check delivery" : <><span aria-hidden="true">◐ </span>{etaMinutes ?? 20} mins</>}
          </span>
        </>
      )}
    </article>
  );
}
