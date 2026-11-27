"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ArrowUpRight, ChevronRight, Copy } from "lucide-react";
import { CatalogImage } from "@/components/customer/CatalogImage";
import { BrowseProductCard } from "@/components/customer/BrowseView";
import { showCustomerToast } from "@/components/customer/CustomerFeedback";
import { StorefrontRefresh } from "@/components/customer/StorefrontRefresh";
import { StorefrontBackToTop } from "@/components/customer/StorefrontBackToTop";
import { browseDiscount, fetchBrowseCatalog } from "@/lib/catalog/browse";
import { useCartStore } from "@/stores/cartStore";
import { useWishlistStore } from "@/stores/wishlistStore";
import type { Category } from "@/types/db";

const essentialSlugs = [
  "fresh-red-onions", "farm-fresh-white-eggs", "cavendish-banana",
  "fresh-jyoti-potato", "amul-taaza-milk", "brown-sandwich-bread",
  "fresh-hybrid-tomato", "oreo-original-cookies", "aashirvaad-shudh-chakki-atta",
];
const essentialPriority = new Map(essentialSlugs.map((slug, index) => [slug, index]));
const aisleLabels: Record<string, string> = {
  "vegetables-fruits": "Fresh produce",
  "dairy-bread-eggs": "Dairy & eggs",
  "munchies-snacks": "Packaged food",
  "cold-drinks-juices": "Cold drinks",
  "atta-rice-dal": "Staples & rice",
  "instant-frozen": "Instant & frozen",
};
const aisleTints = ["#E3F0DA", "#FFF0DA", "#FDE3D6", "#E3EEFF", "#F3EBD6", "#F7DCE0"];
const aisleImages: Record<string, string> = {
  "vegetables-fruits": "/storefront/tomatoes.webp",
  "dairy-bread-eggs": "/storefront/eggs.webp",
  "munchies-snacks": "/storefront/oreo.jpg",
  "cold-drinks-juices": "/storefront/red-bull.webp",
  "atta-rice-dal": "/storefront/essentials/fresh-jyoti-potato.jpg",
  "instant-frozen": "/storefront/essentials/brown-sandwich-bread.jpg",
};

const heroSlides = [
  {
    eyebrow: "RIGHT NOW",
    headline: "The morning shop",
    subtitle: "Milk, eggs, bread and fruit.",
    cta: "Shop essentials",
    href: "#essentials",
    image: "/storefront/fresh-shop.webp",
    bg: "linear-gradient(135deg, #FFE7C2, #FFD0A0)",
    eyebrowColor: "#8A5A3A",
    ctaBg: "#A8421A",
    textColor: "#3A2418",
  },
  {
    eyebrow: "SNACK O'CLOCK",
    headline: "Chips & biscuits",
    subtitle: "For the tea break.",
    cta: "Shop snacks",
    href: "/category/munchies-snacks",
    image: "/storefront/oreo.jpg",
    bg: "linear-gradient(135deg, #FFE0D6, #FFC4B0)",
    eyebrowColor: "#9A4A3A",
    ctaBg: "#A8421A",
    textColor: "#3A2418",
  },
  {
    eyebrow: "COLD TREATS",
    headline: "Cold drinks",
    subtitle: "Juices, sodas and energy drinks.",
    cta: "Shop drinks",
    href: "/category/cold-drinks-juices",
    image: "/storefront/red-bull.webp",
    bg: "linear-gradient(135deg, #E3EEFF, #C7DCFA)",
    eyebrowColor: "#4A6288",
    ctaBg: "#3F6FB5",
    textColor: "#2B3A55",
  },
];

export default function CustomerHomePage() {
  const storefront = useRef<HTMLDivElement>(null);
  const storeId = useCartStore((state) => state.storeId);
  const serviceable = useCartStore((state) => state.serviceable);
  const setServiceability = useCartStore((state) => state.setServiceability);
  const savedIds = useWishlistStore((state) => state.productIds);
  const [heroIndex, setHeroIndex] = useState(0);
  const [spotlightSlug, setSpotlightSlug] = useState("vegetables-fruits");
  const resumeAfter = useRef(0);
  const swipeStartX = useRef<number | null>(null);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const timer = window.setInterval(() => {
      if (document.hidden || Date.now() < resumeAfter.current ||
          storefront.current?.querySelector(".market-carousel-wrap:focus-within") ||
          (storefront.current?.querySelector(".market-carousel-wrap")?.getBoundingClientRect().bottom ?? 0) <= 0) return;
      setHeroIndex((current) => (current + 1) % heroSlides.length);
    }, 5000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (serviceable !== null || useCartStore.getState().location) return;
    const request = new AbortController();
    fetch("/api/serviceability?lat=22.5726&lng=88.3639", { signal: request.signal })
      .then((response) => response.json())
      .then(({ ok, data }) => {
        const current = useCartStore.getState();
        if (!ok || !data?.serviceable || current.serviceable !== null || current.location) return;
        setServiceability({
          location: { lat: 22.5726, lng: 88.3639, address: "Park Street, Kolkata" },
          serviceable: true,
          storeId: data.storeId,
          storeName: data.storeName,
          etaMinutes: data.etaMinutes,
        });
      })
      .catch(() => {});
    return () => request.abort();
  }, [serviceable, setServiceability]);

  const catalog = useQuery({
    queryKey: ["home", storeId],
    queryFn: ({ signal }) => fetchBrowseCatalog(storeId, signal),
    // Keep the first catalogue visible while the initial delivery store resolves.
    placeholderData: (previous, previousQuery) => previousQuery?.queryKey[1] == null ? previous : undefined,
  });
  const categories = catalog.data?.categories ?? [];
  const products = (catalog.data?.products ?? []).filter((product) => product.variants?.length);
  const available = products.filter((product) => (product.variants?.[0]?.stock_available ?? 1) > 0);
  const essentials = [...available].sort((a, b) => {
    return (essentialPriority.get(a.slug) ?? essentialSlugs.length) - (essentialPriority.get(b.slug) ?? essentialSlugs.length);
  }).slice(0, 9);
  const essentialIds = new Set(essentials.map(({ id }) => id));
  const deals = available.filter((product) => browseDiscount(product) > 0 && !essentialIds.has(product.id))
    .sort((a, b) => browseDiscount(b) - browseDiscount(a)).slice(0, 9);
  const saved = products.filter(({ id }) => savedIds.includes(id));

  const categoryById = new Map(categories.map((cat) => [cat.id, cat.slug]));
  const slugOf = (categoryId: string | null) => (categoryId ? categoryById.get(categoryId) : undefined);
  const spotlightTabs = [
    { slug: "vegetables-fruits", label: "Fresh Produce" },
    { slug: "dairy-bread-eggs", label: "Dairy & Eggs" },
    { slug: "munchies-snacks", label: "Snacks" },
    { slug: "cold-drinks-juices", label: "Cold Drinks" },
  ];
  const spotlightProducts = available
    .filter((product) => slugOf(product.category_id) === spotlightSlug)
    .slice(0, 3);

  useEffect(() => {
    const root = storefront.current;
    if (!root || !("IntersectionObserver" in window)) return;

    const campaign = root.querySelector<HTMLElement>(".market-hero");
    const watching = root.querySelectorAll<HTMLElement>("[data-market-reveal]:not([data-market-revealed])");
    const observer = new IntersectionObserver((entries) => {
      for (const { target, isIntersecting } of entries) {
        if (!(target instanceof HTMLElement)) continue;

        if (target === campaign) {
          target.toggleAttribute("data-hero-visible", isIntersecting);
        } else if (isIntersecting) {
          target.dataset.marketRevealed = "";
          observer.unobserve(target);
        }
      }
    }, { threshold: 0.12 });

    if (campaign) observer.observe(campaign);
    watching.forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, [catalog.data, savedIds.length]);

  return (
    <div ref={storefront} data-pull-refresh className="market-home">
      <StorefrontRefresh storefront={storefront} refresh={catalog.refetch} />
      <section
        className="market-carousel-wrap"
        aria-roledescription="carousel"
        aria-label="Featured promotions"
        onPointerDown={(event) => {
          resumeAfter.current = Date.now() + 6000;
          swipeStartX.current = event.clientX;
        }}
        onPointerUp={(event) => {
          if (swipeStartX.current == null) return;
          const delta = event.clientX - swipeStartX.current;
          swipeStartX.current = null;
          if (Math.abs(delta) > 30) {
            setHeroIndex((current) => (current + (delta < 0 ? 1 : -1) + heroSlides.length) % heroSlides.length);
          }
        }}
      >
        <div className="market-carousel-track" style={{ transform: `translateX(-${heroIndex * 100}%)` }}>
          {heroSlides.map((slide, index) => (
            <div
              key={slide.eyebrow}
              className="market-slide"
              data-active={index === heroIndex ? "" : undefined}
              inert={index !== heroIndex}
              style={{ background: slide.bg, color: slide.textColor }}
            >
              <div className="market-slide-visual" aria-hidden="true">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={slide.image} alt="" fetchPriority={index === 0 ? "high" : undefined} />
              </div>
              <h1 id={index === 0 ? "market-promo" : undefined}>{slide.headline}</h1>
              <p className="market-slide-sub">{slide.subtitle}</p>
              <Link href={slide.href} className="market-slide-cta" style={{ background: slide.ctaBg }}>
                {slide.cta}
              </Link>
            </div>
          ))}
        </div>
        <div className="market-carousel-dots" role="tablist" aria-label="Slide controls">
          {heroSlides.map((slide, index) => (
            <button
              key={slide.eyebrow}
              type="button"
              role="tab"
              aria-selected={index === heroIndex}
              aria-label={`Slide ${index + 1}: ${slide.eyebrow}`}
              className={index === heroIndex ? "is-active" : undefined}
              onClick={() => setHeroIndex(index)}
            />
          ))}
        </div>
      </section>

      {serviceable === false && <p role="status" className="market-service-status">Delivery is unavailable here. Choose another address above.</p>}

      <section id="categories" data-market-reveal className="market-section" aria-labelledby="market-category-title">
        <div className="market-section-heading">
          <h2 id="market-category-title">Aisles</h2>
          <Link href="/search?all=1">See all <ArrowUpRight size={14} aria-hidden="true" /></Link>
        </div>
        {categories.length > 0 && (
          <div className="market-category-grid">
            {categories.map((category, index) => <CategoryTile key={category.id} category={category} index={index} />)}
          </div>
        )}
      </section>

      <section id="essentials" className="market-section" aria-labelledby="market-essentials-title">
        <div className="market-section-heading">
          <h2 id="market-essentials-title">Everyday essentials</h2>
          <Link href="/search?all=1">Shop all <ArrowUpRight size={14} aria-hidden="true" /></Link>
        </div>
        {catalog.isLoading ? <div className="market-product-grid" role="status" aria-label="Loading essentials">{essentialSlugs.map((slug) => <i key={slug} aria-hidden="true" className="layout-block market-essential-skeleton" />)}</div> : catalog.isError && !catalog.data ? (
          <div className="market-service-status" role="status">
            <p>We couldn’t load the catalogue.</p>
            <button type="button" onClick={() => void catalog.refetch()}>Try again</button>
          </div>
        ) : essentials.length ? (
          <div className="market-product-grid">{essentials.map((product) => <BrowseProductCard key={product.id} product={product} />)}</div>
        ) : <p className="market-empty">No essentials are available right now.</p>}
      </section>

      <aside className="market-order-offer" aria-label="First order coupon">
        <div><strong>₹50 off your first order</strong><p>On eligible orders at checkout.</p></div>
        <button type="button" aria-label="Copy coupon WELCOME50" onClick={async () => {
          try {
            await navigator.clipboard.writeText("WELCOME50");
            showCustomerToast("WELCOME50 copied");
          } catch {
            showCustomerToast("Enter WELCOME50 at checkout");
          }
        }}>WELCOME50 <Copy size={14} aria-hidden="true" /></button>
      </aside>

      {deals.length > 0 && <section id="featured" data-market-reveal className="market-section" aria-labelledby="market-deals-title">
        <div className="market-section-heading">
          <h2 id="market-deals-title">Price drops</h2>
          <Link href="/featured">See offers <ArrowUpRight size={14} aria-hidden="true" /></Link>
        </div>
        <div className="market-product-grid">{deals.map((product) => <BrowseProductCard key={product.id} product={product} />)}</div>
      </section>}

      {available.length > 0 && (
        <section data-market-reveal className="market-spotlight" aria-labelledby="market-spotlight-title">
          <div className="market-spotlight-banner">
            <h2 id="market-spotlight-title">Browse an aisle</h2>
          </div>
          <div className="market-spotlight-tabs" role="tablist" aria-label="Spotlight aisles">
            {spotlightTabs.map((tab) => (
              <button
                key={tab.slug}
                type="button"
                role="tab"
                aria-selected={spotlightSlug === tab.slug}
                className={spotlightSlug === tab.slug ? "is-active" : undefined}
                onClick={() => setSpotlightSlug(tab.slug)}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <div className="market-spotlight-body">
            {spotlightProducts.length > 0 ? (
              <div className="market-product-grid">
                {spotlightProducts.map((product) => <BrowseProductCard key={product.id} product={product} />)}
              </div>
            ) : (
              <p className="market-empty">No items in this aisle right now.</p>
            )}
            <Link href={`/category/${spotlightSlug}`} className="market-see-all-bar">
              <span>Explore {spotlightTabs.find((t) => t.slug === spotlightSlug)?.label}</span>
              <ChevronRight size={14} aria-hidden="true" />
            </Link>
          </div>
        </section>
      )}

      {saved.length > 0 && <section data-market-reveal className="market-section" aria-labelledby="market-saved-title">
        <div className="market-section-heading"><h2 id="market-saved-title">Saved for later</h2></div>
        <div className="market-product-grid">{saved.map((product) => <BrowseProductCard key={product.id} product={product} />)}</div>
      </section>}
      <StorefrontBackToTop />
    </div>
  );
}

function CategoryTile({ category, index }: { category: Category; index: number }) {
  const tint = aisleTints[index % aisleTints.length];
  const src = category.image_url || aisleImages[category.slug] || "/storefront/fresh-shop.webp";
  return (
    <Link href={`/category/${category.slug}`} className="market-category-card" style={{ background: tint }}>
      <span>{aisleLabels[category.slug] ?? category.name}</span>
      <div className="market-category-thumb media-frame">
        <CatalogImage src={src} className="object-cover" />
      </div>
    </Link>
  );
}
