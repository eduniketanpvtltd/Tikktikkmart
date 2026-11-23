"use client";

import { useLayoutEffect, useRef, type ReactNode } from "react";
import { browseDepartments, featuredHref } from "@/lib/catalog/browse";
import { useWishlistStore } from "@/stores/wishlistStore";
import { ProductCard } from "./ProductCard";
import { showCustomerToast } from "./CustomerFeedback";
import type { Product } from "@/types/db";

const routes = ["/", featuredHref, ...browseDepartments.map(({ slug }) => `/category/${slug}`)];
let previous = 0;

export function BrowseView({ path, children }: { path: string; children: ReactNode }) {
  const view = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const index = routes.indexOf(path);
    if (index < 0 || !view.current) return;
    if (index !== previous) view.current.dataset.browseEntry = index > previous ? "right" : "left";
    previous = index;
  }, [path]);

  return <div ref={view}>{children}</div>;
}

export function BrowseProductCard({ product }: { product: Product }) {
  const saved = useWishlistStore((state) => state.productIds.includes(product.id));
  return (
    <ProductCard product={product} browse saved={saved} onToggleSaved={() => {
      const wishlist = useWishlistStore.getState();
      const wasSaved = wishlist.productIds.includes(product.id);
      wishlist.toggleProduct(product.id);
      showCustomerToast(wasSaved ? "Removed from wishlist" : "Added to wishlist");
    }} />
  );
}
