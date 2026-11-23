"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { CatalogImage } from "@/components/customer/CatalogImage";
import { getCardImage } from "@/components/customer/ProductCard";
import { pressTilt } from "@/lib/catalog/productMotion";
import type { Category, Product } from "@/types/db";

type Aisle = { category: Category; products: Product[] };

export function FrequentlyBought({ aisles }: { aisles: Aisle[] }) {
  if (!aisles.length) return null;
  const thumbnails = aisles.map(({ category, products }) =>
    products.map(getCardImage).find(Boolean) ?? category.image_url);

  return (
    <section data-storefront-reveal aria-labelledby="quick-shop-title" className="space-y-3">
      <h2 id="quick-shop-title" className="text-lg font-extrabold tracking-tight text-[color:var(--theme-ink)] sm:text-xl">Frequently bought</h2>
      <div data-storefront-stagger className="storefront-row">
        {aisles.map(({ category, products }) => {
          const images = products.slice(0, 2).map(getCardImage);
          const remaining = Math.max(0, products.length - 2);
          return (
            <Link key={category.id} href={`/category/${category.slug}`} {...pressTilt}
              className="press-tilt w-[30%] min-w-27 shrink-0 snap-start rounded-2xl border border-[color:var(--theme-line)] bg-[var(--peach)] p-1.5 text-center text-[11px] font-bold leading-tight text-[color:var(--theme-ink)] hover:border-[color:var(--border-orange)] sm:p-2.5 sm:text-sm"
            >
              <div className="grid grid-cols-2 gap-1">
                {[0, 1].map((index) => (
                  <span key={index} data-storefront-tile className="relative aspect-square max-h-22 overflow-hidden rounded-lg bg-[var(--white)]">
                    <CatalogImage src={images[index]} />
                  </span>
                ))}
              </div>
              {remaining > 0 && <span className="-mt-1.5 block translate-y-0 px-1 text-right">
                <span className="inline-block rounded-full border border-[color:var(--theme-line)] bg-[var(--white)] px-1.5 py-0.5 text-[10px] font-semibold">+{remaining} more</span>
              </span>}
              <span className="mt-1 block px-1 pb-1">{category.name}</span>
            </Link>
          );
        })}
      </div>
      <Link href="/#categories" className="flex min-h-12 items-center justify-center gap-2 rounded-xl border border-[color:var(--theme-line)] bg-[var(--peach-light)] text-sm font-bold text-[color:var(--theme-orange-text)] hover:bg-[var(--peach)]">
        <span className="flex -space-x-2" aria-hidden="true">
          {thumbnails.map((src, index) => (
            <span key={aisles[index].category.id} data-storefront-tile className="relative size-7 overflow-hidden rounded-full border-2 border-[color:var(--peach-light)] bg-[var(--white)]">
              <CatalogImage src={src} className="object-cover" />
            </span>
          ))}
        </span>
        See all products <ChevronRight aria-hidden="true" className="size-4" />
      </Link>
    </section>
  );
}

const spotlight = [
  ["Produce shop", "vegetables-fruits"],
  ["Dairy shop", "dairy-bread-eggs"],
  ["Pantry shop", "atta-rice-dal"],
  ["Snack shop", "munchies-snacks"],
] as const;

const lifestyle = [
  ["Breakfast", "dairy-bread-eggs", "farm-fresh-white-eggs"],
  ["Lunchbox snacks", "munchies-snacks", "kurkure-masala-munch"],
  ["Fresh cooking", "vegetables-fruits", "fresh-hybrid-tomato"],
  ["Pantry refills", "atta-rice-dal", "aashirvaad-atta"],
  ["Movie night", "munchies-snacks", "lays-classic-salted"],
  ["Cold drinks", "cold-drinks-juices", "coca-cola-original"],
  ["Quick dinners", "instant-frozen", "maggi-masala-noodles"],
  ["Fruit breaks", "vegetables-fruits", "cavendish-banana"],
] as const;

export function CollectionTiles({ aisles, kind }: { aisles: Aisle[]; kind: "spotlight" | "lifestyle" }) {
  const isSpotlight = kind === "spotlight";
  const entries: ReadonlyArray<readonly [string, string, string?]> = isSpotlight ? spotlight : lifestyle;
  const tiles = entries.flatMap(([title, slug, productSlug]) => {
    const aisle = aisles.find(({ category }) => category.slug === slug);
    if (!aisle) return [];
    const product = aisle.products.find(({ slug }) => slug === productSlug);
    return [{ title, slug, src: (product && getCardImage(product)) || aisle.category.image_url }];
  });
  if (!tiles.length) return null;

  return (
    <section data-storefront-reveal aria-labelledby={`${kind}-title`} className="space-y-2">
      <h2 id={`${kind}-title`} className="text-lg font-extrabold tracking-tight text-[color:var(--theme-ink)] sm:text-xl">{isSpotlight ? "Stores in spotlight" : "Picks for your lifestyle"}</h2>
      <div data-storefront-stagger className={`storefront-row ${isSpotlight ? "" : "storefront-row-paired"}`}>
        {tiles.map(({ title, slug, src }) => (
          <Link key={title} href={`/category/${slug}`} {...pressTilt}
            className="press-tilt flex min-h-25 w-[23%] min-w-19 shrink-0 snap-start flex-col gap-1.5 overflow-hidden rounded-xl border border-[color:var(--theme-line)] bg-[var(--peach-light)] p-2 text-[11px] font-bold leading-tight text-[color:var(--theme-ink)] hover:border-[color:var(--border-orange)] sm:min-h-32 sm:px-3 sm:text-sm"
          >
            <span className="layout-wrap">{title}</span>
            <span data-storefront-tile className="relative mt-auto size-12 shrink-0 self-end overflow-hidden rounded-lg bg-[var(--white)] sm:size-18">
              <CatalogImage src={src} className="object-cover" />
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
