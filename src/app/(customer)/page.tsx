"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ChevronRight } from "lucide-react";
import { CatalogImage } from "@/components/customer/CatalogImage";
import { CollectionTiles, FrequentlyBought } from "@/components/customer/HomeCollections";
import { getCardImage, ProductCard } from "@/components/customer/ProductCard";
import { FeaturedCarousel } from "@/components/customer/FeaturedCarousel";
import { showCustomerToast } from "@/components/customer/CustomerFeedback";
import { StorefrontRefresh } from "@/components/customer/StorefrontRefresh";
import { pressTilt, useOpenProduct } from "@/lib/catalog/productMotion";
import { fetchBrowseCatalog } from "@/lib/catalog/browse";
import { StorefrontBackToTop } from "@/components/customer/StorefrontBackToTop";
import { StorefrontPromotions } from "@/components/customer/StorefrontPromotions";
import { useCartStore } from "@/stores/cartStore";
import { useWishlistStore } from "@/stores/wishlistStore";
import type { Category, Product } from "@/types/db";

const quickShopSlugs = ["dairy-bread-eggs", "vegetables-fruits", "munchies-snacks"];

const snackSlugs = new Set(["munchies-snacks", "cold-drinks-juices"]);

export default function CustomerHomePage() {
  const storefront = useRef<HTMLDivElement>(null);
  const openProduct = useOpenProduct();

  useEffect(() => {
    const page = storefront.current;
    const surface = page?.closest<HTMLElement>("[data-customer-app]");
    const end = page?.querySelector<HTMLElement>("[data-theme-gradient-end]");
    if (!page || !surface || !end) return;

    const measure = () => {
      const height = Math.round(end.getBoundingClientRect().top - surface.getBoundingClientRect().top);
      if (height > 0) surface.style.setProperty("--theme-gradient-end", `${height}px`);
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(page);
    const header = surface.querySelector(".customer-store-header");
    if (header) observer.observe(header);
    return () => {
      observer.disconnect();
      surface.style.removeProperty("--theme-gradient-end");
    };
  }, []);

  const storeId = useCartStore((state) => state.storeId);
  const serviceable = useCartStore((state) => state.serviceable);
  const setServiceability = useCartStore((state) => state.setServiceability);
  const { productIds, toggleProduct } = useWishlistStore();

  // On first visit, auto-detect location or default to Kolkata pilot store coordinates
  useEffect(() => {
    const initial = useCartStore.getState();
    if (initial.serviceable === null && !initial.location) {
      fetch("/api/serviceability?lat=22.5726&lng=88.3639")
        .then((r) => r.json())
        .then((json) => {
          const current = useCartStore.getState();
          if (current.serviceable === null && !current.location && json?.ok && json.data?.serviceable) {
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

  const { data, isLoading, isError: loadFailed, refetch } = useQuery({
    queryKey: ["home", storeId],
    queryFn: ({ signal }) => fetchBrowseCatalog(storeId, signal),
  });
  const isError = loadFailed && !data;

  useEffect(() => {
    const root = storefront.current;
    if (!root || !("IntersectionObserver" in window) || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    root.querySelectorAll("[data-storefront-stagger]").forEach((row) => {
      Array.from(row.children).forEach((tile, index) => {
        (tile as HTMLElement).style.setProperty("--tile-order", String(index));
      });
    });

    const sections = [...root.querySelectorAll<HTMLElement>("[data-storefront-reveal]:not([data-storefront-revealed])")];
    const observer = new IntersectionObserver((entries) => {
      for (const { target, isIntersecting } of entries) {
        if (!isIntersecting) continue;
        const section = target as HTMLElement;
        section.dataset.storefrontRevealed = "";
        delete section.dataset.storefrontPending;
        observer.unobserve(section);
      }
    }, { threshold: 0.12 });

    for (const section of sections) {
      section.dataset.storefrontPending = "";
      observer.observe(section);
    }

    return () => {
      observer.disconnect();
      sections.forEach((section) => delete section.dataset.storefrontPending);
    };
  }, [data, productIds.length]);

  const categories = data?.categories ?? [];
  const products = data?.products ?? [];
  const departments = [
    { title: "Grocery & Kitchen", categories: categories.filter((category) => !snackSlugs.has(category.slug)) },
    { title: "Snacks & Drinks", categories: categories.filter((category) => snackSlugs.has(category.slug)) },
  ].filter((department) => department.categories.length > 0);
  const shelves = categories
    .map((category) => ({
      category,
      products: products.filter((product) => product.category_id === category.id && product.variants?.length),
    }))
    .filter((shelf) => shelf.products.length > 0);

  const quickShop = quickShopSlugs.flatMap((slug) => shelves.filter(({ category }) => category.slug === slug));
  const featured = shelves.flatMap(({ category, products }) =>
    products.filter((product) => (product.variants?.[0]?.stock_available ?? 1) > 0 && getCardImage(product))
      .slice(0, 1).map((product) => ({ category, product })),
  );
  const sparse = shelves.filter(({ products }) => products.length < 3).map(({ category }) => category);
  const sparseCategories = sparse.length
    ? [...sparse, ...categories.filter((category) => !sparse.some(({ id }) => category.id === id))].slice(0, 4)
    : [];
  const savedProducts = products.filter((product) => product.variants?.length && productIds.includes(product.id));

  const renderCard = (product: Product) => (
    <ProductCard
      key={product.id}
      product={product}
      compact
      saved={productIds.includes(product.id)}
      onToggleSaved={() => {
        const wasSaved = useWishlistStore.getState().productIds.includes(product.id);
        toggleProduct(product.id);
        showCustomerToast(wasSaved ? "Removed from wishlist" : "Added to wishlist");
      }}
    />
  );

  return (
    <div ref={storefront} data-pull-refresh className="space-y-5 sm:space-y-7">
      <StorefrontRefresh storefront={storefront} refresh={refetch} />
      <div className="storefront-promo-section">
        <StorefrontPromotions />
        <div className="storefront-promo-followup mx-auto max-w-5xl px-3 sm:px-4">
          {isLoading ? <HomeShelfPlaceholder /> : <FrequentlyBought aisles={quickShop} />}
        </div>
      </div>

      {serviceable === false && (
        <p role="status" className="rounded-xl border border-[color:var(--theme-warning)] bg-[var(--theme-warning-bg)] px-4 py-3 text-sm text-[color:var(--theme-warning)]">
          Delivery is unavailable at this address. Select another location above.
        </p>
      )}

      <div id="featured" className="scroll-mt-48 lg:scroll-mt-36">
        {isLoading ? <HomeShelfPlaceholder featured /> : featured.length > 0 && (
          <section data-storefront-reveal aria-labelledby="featured-title" className="space-y-2">
            <h2 id="featured-title" className="text-lg font-extrabold tracking-tight text-[color:var(--theme-ink)] sm:text-xl">Featured this week</h2>
            <FeaturedCarousel>
              {featured.map(({ category, product }) => (
                <Link
                  key={product.id}
                  href={`/product/${product.slug}`}
                  {...pressTilt}
                  onNavigate={(event) => {
                    event.preventDefault();
                    const source = storefront.current?.querySelector<HTMLElement>(`[data-feature-image="${CSS.escape(product.slug)}"]`) ?? null;
                    openProduct(product, source);
                  }}
                  className="press-tilt relative flex w-[44%] shrink-0 snap-start flex-col overflow-hidden rounded-2xl border-2 border-[color:var(--border-orange)] bg-[var(--peach-light)] p-2.5 text-center sm:w-[24%]"
                >
                  <span className="absolute left-1/2 top-0 max-w-[95%] -translate-x-1/2 truncate rounded-b-lg bg-[var(--navy)] px-2 py-1 text-[10px] font-bold text-white">{category.name}</span>
                  <span className="mt-6 line-clamp-2 min-h-9 text-sm font-bold leading-[18px] text-[color:var(--theme-ink)]">{product.name}</span>
                  <div data-storefront-tile data-feature-image={product.slug} data-card-image={product.slug} className="relative mt-2 grid aspect-[5/4] place-items-center overflow-hidden rounded-xl bg-[var(--white)]">
                    <CatalogImage src={getCardImage(product)} className="object-contain p-1" />
                  </div>
                </Link>
              ))}
            </FeaturedCarousel>
          </section>
        )}
      </div>

      <section id="categories" data-theme-gradient-end aria-labelledby="category-title" className="scroll-mt-48 lg:scroll-mt-36 space-y-5 sm:space-y-6">
        <h1 id="category-title" className="sr-only">All grocery departments</h1>
        {isLoading ? (
          <div role="status" aria-label="Loading categories" className="grid grid-cols-4 gap-2">
            {Array.from({ length: 6 }, (_, index) => (
              <div key={index} className="storefront-skeleton relative h-24 overflow-hidden rounded-xl bg-[var(--theme-skeleton)] sm:h-32" />
            ))}
          </div>
        ) : isError ? (
          <div className="rounded-xl border border-[color:var(--theme-line)] bg-[var(--white)] p-4 text-sm">
            <p role="status">The catalog couldn’t load.</p>
            <button type="button" onClick={() => void refetch()} className="mt-1 min-h-11 font-bold text-[color:var(--theme-orange-text)]">
              Try again
            </button>
          </div>
        ) : categories.length === 0 ? (
          <p className="text-sm text-[color:var(--theme-muted)]">No categories are available right now.</p>
        ) : (
          <div className="space-y-5 lg:grid lg:grid-cols-[2fr_1fr] lg:gap-6 lg:space-y-0">
            {departments.map((department) => (
              <section data-storefront-reveal key={department.title} className="space-y-2.5">
                <h2 className="text-lg font-extrabold leading-tight tracking-tight text-[color:var(--theme-ink)] sm:text-xl">{department.title}</h2>
                <div data-storefront-stagger className="grid grid-cols-4 gap-2.5">
                  {department.categories.map((category) => (
                    <CategoryTile key={category.id} category={category} />
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </section>

      {!isLoading && !isError && products.length > 0 && (
        <section data-storefront-reveal aria-labelledby="wishlist-title" className="space-y-2">
          <h2 id="wishlist-title" className="text-lg font-extrabold tracking-tight text-[color:var(--theme-ink)] sm:text-xl">Your wishlist</h2>
          {savedProducts.length ? (
            <div data-storefront-stagger className="storefront-row">{savedProducts.map(renderCard)}</div>
          ) : (
            <p className="rounded-xl border border-[color:var(--theme-line)] bg-[var(--peach-light)] px-4 py-3 text-sm text-[color:var(--theme-muted)]">Tap a heart to save a product here.</p>
          )}
        </section>
      )}

      <CollectionTiles aisles={shelves} kind="spotlight" />
      <CollectionTiles aisles={shelves} kind="lifestyle" />

      {sparseCategories.length > 0 && (
        <section data-storefront-reveal aria-labelledby="more-categories-title" className="space-y-2.5">
          <h2 id="more-categories-title" className="text-lg font-extrabold tracking-tight text-[color:var(--theme-ink)] sm:text-xl">Browse more categories</h2>
          <div data-storefront-stagger className="grid grid-cols-4 gap-2.5">
            {sparseCategories.map((category) => <CategoryTile key={category.id} category={category} />)}
          </div>
        </section>
      )}

      {shelves.filter(({ products }) => products.length >= 3).map(({ category, products: shelfProducts }) => (
        <section data-storefront-reveal key={category.id} aria-labelledby={`shelf-${category.slug}`} className="space-y-1">
          <div className="flex min-h-11 items-center justify-between gap-3">
            <h2 id={`shelf-${category.slug}`} className="text-lg font-extrabold leading-tight tracking-tight text-[color:var(--theme-ink)] sm:text-xl">
              {category.slug === "munchies-snacks" ? "Crunch on chips" : category.name}
            </h2>
            <Link
              href={`/category/${category.slug}`}
              aria-label={`See all ${category.name}`}
              className="inline-flex min-h-11 shrink-0 items-center gap-0.5 text-xs font-bold text-[color:var(--theme-orange-text)] hover:underline sm:text-sm"
            >
              See all <ChevronRight aria-hidden="true" className="size-4" />
            </Link>
          </div>
          <div data-storefront-stagger className="storefront-row">
            {shelfProducts.map(renderCard)}
          </div>
        </section>
      ))}
      <StorefrontBackToTop />
    </div>
  );
}


function HomeShelfPlaceholder({ featured = false }: { featured?: boolean }) {
  return (
    <div aria-hidden="true" className={featured ? "space-y-2" : "space-y-3"}>
      <div className="relative h-5 w-36 overflow-hidden rounded bg-[var(--theme-skeleton)] storefront-skeleton sm:h-7" />
      <div className="storefront-row">
        {[0, 1, 2].map((index) => (
          <div
            key={index}
            className={featured
              ? "w-[44%] shrink-0 rounded-2xl border-2 border-transparent p-2.5 sm:w-[24%]"
              : "w-[30%] min-w-27 shrink-0 rounded-2xl border border-transparent p-1.5 sm:p-2.5"}
          >
            {featured ? (
              <>
                <div className="mt-6 h-9 rounded bg-[var(--theme-skeleton)]" />
                <div className="relative mt-2 aspect-[5/4] overflow-hidden rounded-xl bg-[var(--theme-skeleton)] storefront-skeleton" />
              </>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-1">
                  <div className="aspect-square max-h-22 rounded-lg bg-[var(--theme-skeleton)]" />
                  <div className="aspect-square max-h-22 rounded-lg bg-[var(--theme-skeleton)]" />
                </div>
                <div className="mt-4 h-7 rounded bg-[var(--theme-skeleton)]" />
              </>
            )}
          </div>
        ))}
      </div>
      <div className={featured ? "h-6" : "h-12 rounded-xl bg-[var(--theme-skeleton)]"} />
    </div>
  );
}

function CategoryTile({ category }: { category: Category }) {
  return (
    <Link href={`/category/${category.slug}`} {...pressTilt} className="press-tilt group flex min-w-0 flex-col gap-1.5 text-center">
      <div data-storefront-tile className="relative aspect-[1.05] overflow-hidden rounded-xl bg-[var(--peach)]">
        <CatalogImage src={category.image_url} className="object-cover" />
      </div>
      <span className="text-[11px] font-bold leading-tight text-[color:var(--theme-ink)] group-hover:text-[color:var(--theme-orange-text)] sm:text-sm">{category.name}</span>
    </Link>
  );
}
