"use client";

import { Suspense, useEffect, useRef, useState, type FormEvent } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, Clock3, Search, X } from "lucide-react";
import { LayoutSkeleton } from "@/components/ui/LayoutSkeleton";
import { BrowseProductCard } from "@/components/customer/BrowseView";
import { CatalogImage } from "@/components/customer/CatalogImage";
import { browseDepartments, featuredAssortment, featuredHref, fetchBrowseCatalog, fetchBrowseCategory } from "@/lib/catalog/browse";
import { rankSearchProducts, relatedSearchProducts, searchWords } from "@/lib/catalog/search";
import { useCartStore } from "@/stores/cartStore";
import type { Category, Product } from "@/types/db";
import "./search.css";

const trends = ["Milk", "Eggs", "Chips", "Maggi", "Coke", "Onion", "Butter"];
const historyKey = "tiktikmart-recent-searches";

function readRecent(): string[] {
  try {
    const saved: unknown = JSON.parse(sessionStorage.getItem(historyKey) ?? "[]");
    return Array.isArray(saved) ? saved.filter((term): term is string => typeof term === "string").slice(0, 6) : [];
  } catch {
    return [];
  }
}

function resultTitle(count: number) {
  return `${count} ${count === 1 ? "result" : "results"}`;
}

function Highlight({ text, query }: { text: string; query: string }) {
  const index = text.toLowerCase().indexOf(query.toLowerCase());
  return index < 0 ? text : <>{text.slice(0, index)}<strong>{text.slice(index, index + query.length)}</strong>{text.slice(index + query.length)}</>;
}

function SearchResults() {
  const params = useSearchParams();
  const initial = params.get("q") ?? "";
  const brand = params.get("brand")?.trim() ?? "";
  const scope = params.get("scope");
  const showCatalogue = params.get("all") === "1";
  const department = browseDepartments.find(({ slug }) => slug === scope);
  const isFeatured = scope === "featured";
  const scopeLabel = isFeatured ? "Featured" : department?.label;
  const backHref = isFeatured ? featuredHref : department ? `/category/${department.slug}` : "/";
  const [input, setInput] = useState(initial || brand);
  const [submitted, setSubmitted] = useState(Boolean(initial || brand));
  const [lookup, setLookup] = useState((initial || brand).trim());
  const [recent, setRecent] = useState<string[]>([]);
  const field = useRef<HTMLInputElement>(null);
  const query = input.trim();
  const storeId = useCartStore((state) => state.storeId);

  useEffect(() => {
    const next = initial || brand;
    setInput(next);
    setLookup(next.trim());
    setSubmitted(Boolean(next));
  }, [initial, brand]);

  useEffect(() => { setRecent(readRecent()); }, []);

  useEffect(() => {
    if (!query || query === lookup || submitted) return;
    const timer = window.setTimeout(() => setLookup(query), 180);
    return () => window.clearTimeout(timer);
  }, [lookup, query, submitted]);

  const home = useQuery({
    queryKey: ["home", storeId],
    queryFn: ({ signal }) => fetchBrowseCatalog(storeId, signal),
  });
  const scoped = useQuery({
    queryKey: ["category-detail", department?.slug, storeId],
    enabled: Boolean(department),
    queryFn: ({ signal }) => fetchBrowseCategory(department?.slug ?? "", storeId, signal),
  });
  const assortment = featuredAssortment(home.data);
  const featuredProducts = [...new Map([
    ...assortment.heroes.map(({ product }) => product), ...assortment.newLaunches, ...assortment.deals, ...assortment.trending,
  ].map((product) => [product.id, product])).values()];
  const scopeProducts = isFeatured ? featuredProducts : scoped.data?.products ?? [];
  const scopeSource = isFeatured ? home : scoped;
  const words = searchWords(query);
  const scopedMatches = scopeLabel
    ? rankSearchProducts(scopeProducts, words, true).filter((product) => product.variants?.length)
    : [];
  const searchCatalog = !scopeLabel || (!scopeSource.isPending && !scopedMatches.length);
  const activeBrand = brand && query.toLowerCase() === brand.toLowerCase() ? brand : "";
  const global = useQuery({
    queryKey: ["search-with-related", lookup, activeBrand, storeId],
    enabled: searchCatalog && Boolean(activeBrand || (query && lookup === query)),
    queryFn: async ({ signal }) => {
      const qs = new URLSearchParams({ q: lookup, includeRelated: "1" });
      if (activeBrand) qs.set("brand", activeBrand);
      if (storeId) qs.set("storeId", storeId);
      const response = await fetch(`/api/search?${qs}`, { signal });
      const result = await response.json();
      if (!response.ok || !result.ok) throw new Error(`HTTP ${response.status}: Search unavailable`);
      return result.data as { products: Product[]; related: Product[] };
    },
  });

  const source = searchCatalog ? global : scopeSource;
  const waiting = (searchCatalog && lookup !== query) || source.isLoading;
  const failed = source.isError && !source.data;
  const products = searchCatalog
    ? (global.data?.products ?? []).filter((product) => product.variants?.length)
    : scopedMatches;
  const related = (searchCatalog ? global.data?.related ?? [] : relatedSearchProducts(scopeProducts, products, words))
    .filter((product) => product.variants?.length && (product.variants[0].stock_available ?? 1) > 0).slice(0, 6);
  const categories = [...(home.data?.categories ?? [])].sort((a, b) => a.sort_order - b.sort_order);
  const primaryCategories = categories.filter((category) => !category.parent_id).slice(0, 8);
  const categorySuggestions = searchCatalog && query
    ? categories.filter((category) => words.length && words.every((word) => category.name.toLowerCase().includes(word))).slice(0, 2)
    : [];
  const popular = (scopeLabel ? scopeProducts : assortment.trending)
    .filter((product) => product.variants?.length && (product.variants[0].stock_available ?? 1) > 0).slice(0, 3);

  function updateRecent(next: string[]) {
    setRecent(next);
    try { sessionStorage.setItem(historyKey, JSON.stringify(next)); } catch {}
  }

  function remember(term: string) {
    if (term) updateRecent([term, ...readRecent().filter((value) => value.toLowerCase() !== term.toLowerCase())].slice(0, 6));
  }

  function href(term: string) {
    const next = new URLSearchParams();
    if (term) next.set("q", term);
    if (scopeLabel && scope) next.set("scope", scope);
    if (showCatalogue) next.set("all", "1");
    return next.size ? `/search?${next}` : "/search";
  }

  function run(term: string) {
    const value = term.trim();
    if (!value) return;
    setInput(value);
    setLookup(value);
    setSubmitted(true);
    remember(value);
    field.current?.blur();
    window.scrollTo(0, 0);
    if (initial !== value) window.history.pushState(null, "", href(value));
  }

  function clear() {
    setInput("");
    setLookup("");
    setSubmitted(false);
    field.current?.focus();
    if (initial) window.history.replaceState(null, "", href(""));
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    run(input);
  }

  return (
    <div className="search-screen">
      <h1 className="sr-only">Search</h1>
      <header className="search-page-header">
        <div>
          <Link className="search-page-back" href={backHref} aria-label={scopeLabel ? `Back to ${scopeLabel}` : "Back to Home"}>
            <ChevronLeft size={23} aria-hidden="true" />
          </Link>
          <form role="search" className="search-page-field" onSubmit={submit}>
            <button className="search-page-submit" type="submit" aria-label="Submit search"><Search size={18} aria-hidden="true" /></button>
            <input ref={field} type="search" autoFocus={!showCatalogue} autoComplete="off" enterKeyHint="search" maxLength={120}
              aria-label={scopeLabel ? `Search in ${scopeLabel}` : "Search products"}
              placeholder={scopeLabel ? `Search in ${scopeLabel}` : "Search for milk, chips, coke"}
              value={input} onChange={(event) => {
                setInput(event.target.value);
                setSubmitted(false);
                if (!event.target.value.trim()) setLookup("");
              }} />
            {input && <button type="button" aria-label="Clear search" onClick={clear}><span><X size={14} aria-hidden="true" /></span></button>}
          </form>
        </div>
      </header>

      <div className="search-page-content">
        {!query && showCatalogue ? (
          <section aria-labelledby="search-all-title">
            <div className="search-section-heading"><h2 id="search-all-title" className="search-grid-title">All products</h2></div>
            {home.isLoading ? <LayoutSkeleton shape="products" label="Loading products" /> : home.isError && !home.data ? (
              <div className="search-empty" role="status">
                <p>The catalogue couldn’t load.</p>
                <button type="button" onClick={() => void home.refetch()}>Try again</button>
              </div>
            ) : home.data?.products.some((product) => product.variants?.length) ? (
              <SearchProductGrid products={home.data.products.filter((product) => product.variants?.length)} />
            ) : <p className="market-empty">No products are available right now.</p>}
          </section>
        ) : !query ? (
          <>
            {!!recent.length && <section aria-labelledby="search-recent-title">
              <div className="search-section-heading">
                <h2 id="search-recent-title">Recent searches</h2>
                <button type="button" onClick={() => updateRecent([])}>Clear all</button>
              </div>
              <ul className="search-row-list">
                {recent.map((term) => <li key={term} className="search-result-row">
                  <button type="button" onClick={() => run(term)}><Clock3 size={18} aria-hidden="true" /><span>{term}</span></button>
                  <button className="search-remove" type="button" aria-label={`Remove ${term}`} onClick={() => updateRecent(recent.filter((value) => value !== term))}><X size={18} aria-hidden="true" /></button>
                </li>)}
              </ul>
            </section>}
            <SearchDiscovery categories={primaryCategories} onSearch={run} />
            {!!popular.length && <section aria-labelledby="search-popular-title">
              <h2 id="search-popular-title" className="search-grid-title">Popular right now</h2>
              <SearchProductGrid products={popular} />
            </section>}
          </>
        ) : waiting ? (
          <LayoutSkeleton shape="products" label="Searching products" />
        ) : failed ? (
          <div className="search-empty" role="status"><h2>Search couldn’t load</h2><button type="button" onClick={() => void source.refetch()}>Try again</button></div>
        ) : !products.length && (submitted || !categorySuggestions.length) ? (
          <>
            <div className="search-empty" role="status">
              <h2>No results for “{query}”</h2>
              <p>Check the spelling or try a shorter word.</p>
            </div>
            <RelatedItems products={related} onOpen={() => remember(query)} />
            <SearchDiscovery categories={primaryCategories} onSearch={run} noResults />
          </>
        ) : (
          <>
            {!submitted && <ul className="search-row-list" aria-label="Search suggestions">
              {categorySuggestions.map((category) => <li key={category.id} className="search-result-row">
                <Link href={`/category/${category.slug}`} onNavigate={() => remember(query)}>
                  <Search size={18} aria-hidden="true" /><span><Highlight text={category.name} query={query} /> <small>category</small></span>
                </Link>
              </li>)}
              {products.slice(0, 4).map((product) => {
                const category = categories.find(({ id }) => id === product.category_id);
                return <li key={product.id} className="search-result-row">
                  <button type="button" onClick={() => run(product.name)}>
                    <Search size={18} aria-hidden="true" />
                    <span><Highlight text={product.name} query={query} /> {category && <small>in {category.name}</small>}</span>
                  </button>
                </li>;
              })}
            </ul>}
            {products.length > 6 && <RelatedItems products={related} onOpen={() => remember(query)} />}
            {!!products.length && <section aria-labelledby="search-products-title">
              <h2 id="search-products-title" className="search-grid-title" aria-live="polite">{resultTitle(products.length)}</h2>
              {scopeLabel && searchCatalog && <p className="search-catalog-context">Showing results from all products</p>}
              <SearchProductGrid products={products} onOpen={() => remember(query)} />
            </section>}
            {products.length <= 6 && <RelatedItems products={related} onOpen={() => remember(query)} />}
          </>
        )}
      </div>
    </div>
  );
}

function SearchDiscovery({ categories, onSearch, noResults = false }: {
  categories: Category[]; onSearch: (term: string) => void; noResults?: boolean;
}) {
  return (
    <>
      <section aria-labelledby="search-trending-title">
        <h2 id="search-trending-title">{noResults ? "Try searching for" : "Trending near you"}</h2>
        <div className="search-trending">
          {trends.map((term) => <button type="button" key={term} onClick={() => onSearch(term)}>{term}</button>)}
        </div>
      </section>
      {!!categories.length && <section aria-labelledby="search-categories-title">
        <h2 id="search-categories-title">Browse categories</h2>
        <div className="search-category-grid">
          {categories.map((category) => (
            <Link key={category.id} href={`/category/${category.slug}`}>
              <span className="search-category-image"><CatalogImage src={category.image_url} className="object-cover" /></span>
              {category.name}
            </Link>
          ))}
        </div>
      </section>}
    </>
  );
}

function RelatedItems({ products, onOpen }: { products: Product[]; onOpen: () => void }) {
  if (!products.length) return null;
  return <section aria-labelledby="search-related-title">
    <h2 id="search-related-title" className="search-grid-title">Related items</h2>
    <SearchProductGrid products={products} onOpen={onOpen} shelf />
  </section>;
}

function SearchProductGrid({ products, onOpen, shelf = false }: { products: Product[]; onOpen?: () => void; shelf?: boolean }) {
  return <div className={shelf ? "search-related-shelf" : "search-product-grid"} onClick={(event) => {
    if (event.target instanceof Element && event.target.closest('a[href^="/product/"]')) onOpen?.();
  }}>{products.map((product) => <BrowseProductCard key={product.id} product={product} />)}</div>;
}

export default function SearchPage() {
  return <Suspense fallback={<LayoutSkeleton shape="products" label="Loading search" />}><SearchResults /></Suspense>;
}
