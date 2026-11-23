"use client";

import { useEffect, useLayoutEffect, useRef, useState, type MouseEvent } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Heart, Minus, Plus, Share2, ShoppingCart } from "lucide-react";
import { AnimatedRupees, formatRupees } from "@/components/customer/AnimatedRupees";
import { showCustomerToast, signalStockLimit } from "@/components/customer/CustomerFeedback";
import { getCardImage } from "@/components/customer/ProductCard";
import { QuantityNumber } from "@/components/customer/QuantityNumber";
import { rememberCartOrigin } from "@/lib/cartEntry";
import { getProductData } from "@/lib/catalog/productQuery";
import { flyToCart } from "@/lib/catalog/flyToCart";
import { closeProductTransition, registerProductArrival } from "@/lib/catalog/productMotion";
import { useCartStore } from "@/stores/cartStore";
import { useWishlistStore } from "@/stores/wishlistStore";
import type { Product } from "@/types/db";
import {
  ProductDetails, ProductGallery, ProductShelf, ProductSkeleton, variantPricing,
  type DetailedProduct, type RelatedProducts,
} from "@/components/customer/ProductDetailSections";
import "./product-detail.css";


export default function ProductDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const storeId = useCartStore((state) => state.storeId);
  const { data: product, isPending, refetch } = useQuery({
    queryKey: ["product-detail", slug, storeId],
    queryFn: ({ signal }) => getProductData<DetailedProduct>(slug, storeId, signal),
    staleTime: 0,
  });

  if (isPending) return <ProductSkeleton />;
  if (!product) {
    return (
      <div data-product-page className="product-page product-missing">
        <h1>Product unavailable</h1>
        <Link href="/">Browse products</Link>
      </div>
    );
  }

  return <ProductDetail key={product.id} product={product} storeId={storeId} refresh={refetch} />;
}

function ProductDetail({ product, storeId, refresh }: {
  product: DetailedProduct;
  storeId: string | null;
  refresh: () => Promise<unknown>;
}) {
  const router = useRouter();
  const page = useRef<HTMLDivElement>(null);
  const ripple = useRef<HTMLSpanElement>(null);
  const { items, etaMinutes, serviceable } = useCartStore();
  const saved = useWishlistStore((state) => state.productIds.includes(product.id));
  const toggleProduct = useWishlistStore((state) => state.toggleProduct);
  const [selectedId, setSelectedId] = useState<string>();
  const [scrolled, setScrolled] = useState(false);
  const variants = product.variants ?? [];
  const variant = variants.find((item) => item.id === selectedId) ?? variants[0];
  const { price, mrp, discount } = variantPricing(variant);
  const stock = variant?.stock_available;
  const orderLimit = variant?.max_qty_per_order ?? 10;
  const maxQty = Math.min(stock ?? Infinity, orderLimit);
  const quantity = items.find((item) => item.variantId === variant?.id)?.quantity ?? 0;
  const cartCount = items.reduce((total, item) => total + item.quantity, 0);
  const rating = Number(product.rating);
  const reviews = Number(product.review_count);
  const hasRating = rating > 0 && rating <= 5 && (product.review_count == null || reviews > 0);
  const soldOut = !variant || maxQty <= 0;

  const { data: related, isPending: relatedLoading } = useQuery({
    queryKey: ["product-related", product.id, storeId],
    queryFn: ({ signal }) => getProductData<RelatedProducts>(product.id, storeId, signal, true),
  });
  const { watched, watch } = useRestockWatch(product, storeId, refresh);

  useLayoutEffect(() => {
    const swap = registerProductArrival(product.slug);
    if (!page.current) return;
    if (swap) page.current.dataset.productSwap = "";
    if (document.documentElement.hasAttribute("data-product-transition")) page.current.dataset.productShared = "";
  }, [product.slug]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY >= 240);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  function updateQuantity(change: -1 | 1, button: HTMLElement) {
    if (!variant) return;
    const { items: currentItems, setQty, addItem } = useCartStore.getState();
    const current = currentItems.find((item) => item.variantId === variant.id)?.quantity ?? 0;
    const next = current + change;
    const limits = { maxQty, stockLimit: stock };

    if (change > 0 && next > maxQty) {
      if (current > maxQty) setQty(variant.id, maxQty, limits);
      signalStockLimit(button, stock ?? Infinity, orderLimit);
      return;
    }
    if (current > 0) setQty(variant.id, Math.min(next, maxQty), limits);
    else if (next > 0) addItem({
      variantId: variant.id, productId: product.id, name: product.name,
      label: variant.label, image: getCardImage(product), price, mrp, ...limits,
    });
    if (change > 0) flyToCart(button);
  }

  function add(event: MouseEvent<HTMLButtonElement>) {
    const dot = ripple.current;
    if (dot && !matchMedia("(prefers-reduced-motion: reduce)").matches) {
      const bounds = event.currentTarget.getBoundingClientRect();
      dot.style.left = `${event.detail ? event.clientX - bounds.left : bounds.width / 2}px`;
      dot.style.top = `${event.detail ? event.clientY - bounds.top : bounds.height / 2}px`;
      dot.animate([
        { transform: "translate(-50%, -50%) scale(0)", opacity: .45 },
        { transform: "translate(-50%, -50%) scale(22)", opacity: 0 },
      ], { duration: 420, easing: "ease-out" });
    }
    updateQuantity(1, event.currentTarget);
  }

  async function share() {
    const url = new URL(`/product/${product.slug}`, window.location.origin).href;
    try {
      if (!navigator.clipboard?.writeText) throw new Error("Clipboard unavailable");
      await navigator.clipboard.writeText(url);
      showCustomerToast("Link copied");
    } catch {
      try {
        if (!navigator.share) throw new Error("Sharing unavailable");
        await navigator.share({ title: product.name, url });
        showCustomerToast("Link shared");
      } catch (error) {
        if (!(error instanceof DOMException && error.name === "AbortError")) showCustomerToast("Couldn’t share the link");
      }
    }
  }

  return (
    <div className="product-page" data-product-page ref={page}>
      <header className="product-header" data-solid={scrolled ? "" : undefined}>
        <button type="button" aria-label="Back" className="product-header-button"
          onClick={() => closeProductTransition(product.slug, () => router.back(), () => router.push("/"))}>
          <ArrowLeft aria-hidden="true" size={21} />
        </button>
        <span className="product-header-title" aria-hidden="true">{product.name}</span>
        <button type="button" aria-label={saved ? "Remove from wishlist" : "Add to wishlist"}
          aria-pressed={saved} className="product-header-button product-heart"
          onClick={() => {
            const wasSaved = useWishlistStore.getState().productIds.includes(product.id);
            toggleProduct(product.id);
            showCustomerToast(wasSaved ? "Removed from wishlist" : "Added to wishlist");
          }}>
          <Heart aria-hidden="true" size={21} />
        </button>
        <button type="button" aria-label="Share product" className="product-header-button" onClick={share}>
          <Share2 aria-hidden="true" size={20} />
        </button>
        <Link href="/cart" onNavigate={rememberCartOrigin} aria-label={`Cart, ${cartCount} ${cartCount === 1 ? "item" : "items"}`}
          className="product-header-button" data-product-cart>
          <ShoppingCart aria-hidden="true" size={21} />
          <span aria-hidden="true" data-product-cart-count className="product-cart-count">{cartCount}</span>
        </Link>
      </header>

      <div className="product-content">
        <ProductGallery product={product} discount={discount} />
        <div className="product-body">
          <section aria-labelledby="product-name" className="product-info">
            {etaMinutes != null && serviceable !== false && <span className="product-eta">Delivery in {etaMinutes} min</span>}
            <h1 id="product-name">{product.name}</h1>
            {hasRating && (
              <div className="product-rating">
                <strong aria-label={`${rating} out of 5 stars`}>★ {rating.toFixed(1)}</strong>
                {reviews > 0 && <span>{reviews.toLocaleString("en-IN")} {reviews === 1 ? "rating" : "ratings"}</span>}
              </div>
            )}
            {variants.length > 1 && (
              <div role="group" aria-label="Pack size" className="product-variants">
                {variants.map((option) => (
                  <button key={option.id} type="button" aria-pressed={option.id === variant?.id}
                    onClick={() => setSelectedId(option.id)}>
                    <strong>{option.label}</strong>
                    <span>{formatRupees(variantPricing(option).price)}</span>
                  </button>
                ))}
              </div>
            )}
            {variant && (
              <>
                <div className="product-price">
                  <strong><AnimatedRupees value={price} duration={420} /></strong>
                  {mrp > price && <s aria-label={`MRP ${formatRupees(mrp)}`}>{formatRupees(mrp)}</s>}
                  {discount > 0 && <span className="product-price-discount">{discount}% off</span>}
                </div>
                <p className="product-tax">Inclusive of all taxes</p>
              </>
            )}
          </section>
          <ProductDetails product={product} />
          <ProductShelf title="Similar products" products={related?.similar} loading={relatedLoading} />
          <ProductShelf title="People also bought" products={related?.alsoBought} loading={relatedLoading} />
        </div>
      </div>

      <div className="product-buy-bar">
        {variant && <div className="product-bar-price">Price<strong><AnimatedRupees value={price} duration={420} /></strong></div>}
        {soldOut ? (
          <div className="product-sold-controls">
            <button type="button" className="product-purchase" disabled>Out of stock</button>
            {variant && <button type="button" className="product-notify" disabled={watched.includes(variant.id)}
              onClick={() => watch(variant.id)}>{watched.includes(variant.id) ? "Watching stock" : "Notify me"}</button>}
          </div>
        ) : (
          <div className="product-buy-controls">
            {quantity > 0 ? (
              <div className="product-purchase product-stepper">
                <button type="button" aria-label="Decrease quantity" onClick={(event) => updateQuantity(-1, event.currentTarget)}>
                  <Minus aria-hidden="true" size={21} />
                </button>
                <QuantityNumber key={variant.id} value={quantity} />
                <button type="button" aria-label="Increase quantity" onClick={(event) => updateQuantity(1, event.currentTarget)}>
                  <Plus aria-hidden="true" size={21} />
                </button>
              </div>
            ) : <button type="button" className="product-purchase" onClick={add}>Add to cart</button>}
            <span className="product-ripple-mask" aria-hidden="true"><span ref={ripple} /></span>
          </div>
        )}
      </div>
    </div>
  );
}

function useRestockWatch(product: Product, storeId: string | null, refresh: () => Promise<unknown>) {
  const storageKey = `tiktikmart-restock:${storeId ?? "catalog"}:${product.id}`;
  const [subscription, setSubscription] = useState({ key: "", variants: [] as string[] });
  const watched = subscription.key === storageKey ? subscription.variants : [];

  useEffect(() => {
    let variants: string[] = [];
    try {
      const stored: unknown = JSON.parse(localStorage.getItem(storageKey) ?? "[]");
      if (Array.isArray(stored)) variants = stored.filter((id): id is string => typeof id === "string");
    } catch {}
    setSubscription({ key: storageKey, variants });
  }, [storageKey]);

  function save(variants: string[]) {
    setSubscription({ key: storageKey, variants });
    try { localStorage.setItem(storageKey, JSON.stringify(variants)); } catch {}
  }

  useEffect(() => {
    if (!watched.length) return;
    const interval = window.setInterval(() => {
      if (document.visibilityState === "visible") void refresh();
    }, 30_000);
    return () => window.clearInterval(interval);
  }, [refresh, watched.length]);

  useEffect(() => {
    if (subscription.key !== storageKey || !subscription.variants.length) return;
    const inStock = (product.variants ?? []).filter((variant) =>
      subscription.variants.includes(variant.id) && (variant.stock_available ?? 0) > 0
      && (variant.max_qty_per_order ?? 10) > 0);
    if (!inStock.length) return;
    const restocked = new Set(inStock.map((variant) => variant.id));
    const remaining = subscription.variants.filter((id) => !restocked.has(id));
    setSubscription({ key: storageKey, variants: remaining });
    try { localStorage.setItem(storageKey, JSON.stringify(remaining)); } catch {}
    showCustomerToast(`${product.name} is back in stock`);
  }, [product.name, product.variants, storageKey, subscription]);

  return {
    watched,
    watch: (variantId: string) => {
      if (watched.includes(variantId)) return;
      save([...watched, variantId]);
      showCustomerToast("We’ll let you know here when it’s back in stock");
    },
  };
}
