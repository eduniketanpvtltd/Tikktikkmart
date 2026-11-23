"use client";

import { useState } from "react";
import Link from "next/link";
import { CatalogImage } from "@/components/customer/CatalogImage";
import { formatRupees } from "@/components/customer/AnimatedRupees";
import { showCustomerToast } from "@/components/customer/CustomerFeedback";
import { getCardImage } from "@/components/customer/ProductCard";
import { useOpenProduct } from "@/lib/catalog/productMotion";
import { useCartStore } from "@/stores/cartStore";
import type { Product } from "@/types/db";

export function CartSuggestions({ products }: { products: Product[] }) {
  const openProduct = useOpenProduct();
  const items = useCartStore((state) => state.items);
  const [initialIds] = useState(() => new Set(useCartStore.getState().items.map((item) => item.productId)));
  const suggestions = products.flatMap((product) => {
    if (initialIds.has(product.id)) return [];
    const variant = product.variants?.find((option) =>
      (option.stock_available ?? 1) > 0 && (option.max_qty_per_order ?? 1) > 0);
    return variant ? [{ product, variant }] : [];
  }).slice(0, 6);

  if (!suggestions.length) return null;

  return (
    <section aria-labelledby="cart-suggestions" className="cart-review-card">
      <h2 id="cart-suggestions" className="px-[14px] pt-[14px] pb-2 text-[15px] font-extrabold">Before you checkout</h2>
      <div className="no-scrollbar flex snap-x snap-mandatory gap-2.5 overflow-x-auto scroll-px-[14px] px-[14px] pb-[14px]">
        {suggestions.map(({ product, variant }) => {
          const added = items.some((item) => item.productId === product.id);
          const price = variant.effective_price ?? variant.base_price;
          const image = getCardImage(product);

          return (
            <article key={product.id} className="w-28 shrink-0 snap-start">
              <Link href={`/product/${product.slug}`} aria-label={product.name} onNavigate={(event) => {
                event.preventDefault();
                openProduct(product, null);
              }}>
                <div className="relative aspect-square overflow-hidden rounded-[14px] border border-[color:var(--theme-line)] bg-[var(--white)]">
                  <CatalogImage src={image} className="object-contain p-1.5" />
                </div>
                <h3 className="mt-1.5 line-clamp-2 h-8 text-xs leading-4 font-semibold">{product.name}</h3>
              </Link>
              <div className="mt-1 flex items-center justify-between gap-1">
                <span className="text-xs font-extrabold tabular-nums">{formatRupees(price)}</span>
                <button
                  type="button"
                  disabled={added}
                  aria-label={added ? `${product.name} added` : `Add ${product.name} to cart`}
                  className="min-h-8 rounded-[9px] border-[1.5px] border-[color:var(--border-orange)] bg-[var(--white)] px-2 text-xs font-bold text-[color:var(--theme-orange-text)] enabled:hover:bg-[var(--peach)] disabled:border-transparent disabled:bg-[var(--peach-light)] disabled:text-[color:var(--theme-ink)]"
                  onClick={() => {
                    const cart = useCartStore.getState();
                    if (cart.items.some((item) => item.productId === product.id)) return;
                    cart.addItem({
                      productId: product.id,
                      variantId: variant.id,
                      name: product.name,
                      label: variant.label,
                      price,
                      mrp: variant.mrp,
                      image,
                      maxQty: Math.min(variant.stock_available ?? Infinity, variant.max_qty_per_order ?? 10),
                      stockLimit: variant.stock_available,
                    });
                    showCustomerToast("Added to cart");
                  }}
                >
                  {added ? "Added" : "Add"}
                </button>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
