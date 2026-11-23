"use client";

import { useRef, type CSSProperties } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { formatRupees } from "@/components/customer/AnimatedRupees";
import { BrowseProductCard, BrowseView } from "@/components/customer/BrowseView";
import { CatalogImage } from "@/components/customer/CatalogImage";
import { FeaturedCarousel } from "@/components/customer/FeaturedCarousel";
import { getCardImage } from "@/components/customer/ProductCard";
import { useCartStore } from "@/stores/cartStore";
import { browseDiscount, featuredAssortment, featuredHref, fetchBrowseCatalog } from "@/lib/catalog/browse";
import { useOpenProduct } from "@/lib/catalog/productMotion";
import type { Product } from "@/types/db";

export default function FeaturedPage() {
  const { storeId, etaMinutes, serviceable } = useCartStore();
  const { data, isPending, isError: loadFailed, refetch } = useQuery({
    queryKey: ["home", storeId],
    queryFn: ({ signal }) => fetchBrowseCatalog(storeId, signal),
  });
  const isError = loadFailed && !data;
  const { heroes, newLaunches, deals, trending } = featuredAssortment(data);

  return (
    <BrowseView path={featuredHref}>
      <div className="browse-featured">
        <h1>Featured this week</h1>
        {isPending ? (
          <div role="status" aria-label="Loading featured products" className="storefront-skeleton browse-hero-placeholder" />
        ) : isError ? (
          <div className="browse-empty">
            <p>Featured products couldn’t load.</p>
            <button type="button" onClick={() => void refetch()}>Try again</button>
          </div>
        ) : !newLaunches.length ? (
          <p className="browse-empty">No featured products are available right now.</p>
        ) : (
          <>
            {!!heroes.length && (
              <FeaturedCarousel>
                {heroes.map((entry) => <FeaturedHero key={entry.product.id} {...entry} eta={serviceable === false ? null : etaMinutes} />)}
              </FeaturedCarousel>
            )}
            <FeaturedShelf title="New launches" products={newLaunches} />
            <FeaturedShelf title="Deals under ₹50" products={deals} />
            <FeaturedShelf title="Trending now" products={trending} />
          </>
        )}
      </div>
    </BrowseView>
  );
}

function FeaturedHero({ product, department, index, eta }: {
  product: Product; department: string; index: number; eta: number | null;
}) {
  const openProduct = useOpenProduct();
  const image = useRef<HTMLSpanElement>(null);
  const source = getCardImage(product);
  const discount = browseDiscount(product);
  const startingPrice = Math.min(...(product.variants ?? []).filter((option) => (option.stock_available ?? 1) > 0)
    .map((option) => option.effective_price ?? option.base_price));
  const caption = index === 1 && discount > 0 ? `${discount}% off` :
    index === 2 && eta != null ? `Delivered in ${eta} min` : `Starting ${formatRupees(startingPrice)}`;
  return (
    <Link href={`/product/${product.slug}`} className="browse-hero" data-hero={index}
      onNavigate={(event) => {
        event.preventDefault();
        openProduct(product, image.current);
      }}>
      <span className="browse-hero-copy">
        <span>{department}</span>
        <strong>{product.name}</strong>
        <span>{caption}</span>
      </span>
      {source && (
        <span ref={image} data-card-image={product.slug} className="browse-hero-image">
          <CatalogImage src={source} />
        </span>
      )}
    </Link>
  );
}

function FeaturedShelf({ title, products }: { title: string; products: Product[] }) {
  if (!products.length) return null;
  return (
    <section aria-label={title} className="browse-featured-shelf">
      <h2>{title}</h2>
      <div className="storefront-row browse-shelf">
        {products.map((product, index) => (
          <div key={product.id} className="browse-card-enter" style={{ "--browse-card-index": index } as CSSProperties}>
            <BrowseProductCard product={product} />
          </div>
        ))}
      </div>
    </section>
  );
}
