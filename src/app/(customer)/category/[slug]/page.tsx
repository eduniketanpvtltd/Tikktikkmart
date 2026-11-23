"use client";

import { useLayoutEffect, useRef, useState, type CSSProperties } from "react";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Grid2X2 } from "lucide-react";
import { useCartStore } from "@/stores/cartStore";
import { BrowseProductCard, BrowseView } from "@/components/customer/BrowseView";
import { CatalogImage } from "@/components/customer/CatalogImage";
import { showCustomerToast } from "@/components/customer/CustomerFeedback";
import { getCardImage } from "@/components/customer/ProductCard";
import { browseDiscount, browseGroups, browsePrice, fetchBrowseCategory } from "@/lib/catalog/browse";

const sorts = ["Relevance", "Low to high", "High to low", "Highest discount"] as const;
type CategorySelection = { selectedId?: string; under50: boolean; discountOnly: boolean; sort: number };
const defaultSelection: CategorySelection = { under50: false, discountOnly: false, sort: 0 };

export default function CategoryPage() {
  const { slug } = useParams<{ slug: string }>();
  return <CategoryScreen key={slug} slug={slug} />;
}

function CategoryScreen({ slug }: { slug: string }) {
  const storeId = useCartStore((state) => state.storeId);
  const [selection, setSelection] = useState(defaultSelection);
  const { selectedId, under50, discountOnly, sort } = selection;
  const layout = useRef<HTMLDivElement>(null);

  const { data, isPending, isError: loadFailed, refetch } = useQuery({
    queryKey: ["category-detail", slug, storeId],
    queryFn: ({ signal }) => fetchBrowseCategory(slug, storeId, signal),
  });
  const isError = loadFailed && !data;

  useLayoutEffect(() => {
    if (history.state?.categorySelection?.slug === slug) {
      setSelection(history.state.categorySelection.selection);
    }
    const node = layout.current;
    const header = node?.closest("[data-customer-app]")?.querySelector(".customer-store-header");
    if (!node || !header) return;
    const measure = () => node.style.setProperty("--browse-header-height", `${header.getBoundingClientRect().height}px`);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(header);
    return () => observer.disconnect();
  }, [slug]);

  function updateSelection(changes: Partial<CategorySelection>) {
    const next = { ...selection, ...changes };
    setSelection(next);
    history.replaceState({ ...history.state, categorySelection: { slug, selection: next } }, "");
  }

  const groups = data ? browseGroups(data.category, data.subcategories, data.products) : [];
  const selected = groups.find(({ id }) => id === selectedId) ?? groups.find(({ products }) => products.length) ?? groups[0];
  const filtered = (selected?.products ?? []).filter((product) =>
    (!under50 || browsePrice(product) < 50) && (!discountOnly || browseDiscount(product) >= 10));
  if (sort === 1) filtered.sort((a, b) => browsePrice(a) - browsePrice(b));
  if (sort === 2) filtered.sort((a, b) => browsePrice(b) - browsePrice(a));
  if (sort === 3) filtered.sort((a, b) => browseDiscount(b) - browseDiscount(a));

  return (
    <BrowseView path={`/category/${slug}`}>
      <div className="browse-department" ref={layout}>
        <nav className="browse-rail" aria-label={data ? `${data.category.name} subcategories` : "Subcategories"}>
          {isPending && [0, 1, 2].map((i) => <div key={i} className="browse-rail-placeholder" aria-hidden="true" />)}
          {groups.map((group) => {
            const image = group.image || group.products.map(getCardImage).find(Boolean);
            return (
              <button type="button" key={group.id} aria-pressed={group.id === selected?.id}
                onClick={() => {
                  updateSelection({ selectedId: group.id });
                  const top = layout.current?.getBoundingClientRect().top;
                  const headerBottom = layout.current?.closest("[data-customer-app]")
                    ?.querySelector(".customer-store-header")?.getBoundingClientRect().bottom;
                  if (top != null && headerBottom != null && top < headerBottom) window.scrollBy(0, top - headerBottom);
                }}>
                <span className="browse-rail-image" aria-hidden="true">
                  {image ? <CatalogImage src={image} className="object-cover" /> : <Grid2X2 size={19} />}
                </span>
                <span className="browse-rail-label">{group.label}</span>
              </button>
            );
          })}
        </nav>
        <section className="browse-department-main" aria-labelledby="browse-section-title" aria-busy={isPending}>
          <div className="browse-filters" role="group" aria-label="Product filters">
            <button type="button" onClick={() => {
              const next = (sort + 1) % sorts.length;
              updateSelection({ sort: next });
              showCustomerToast(next === 1 || next === 2 ? `Price: ${sorts[next].toLowerCase()}` : sorts[next]);
            }}>Sort: {sorts[sort]}</button>
            <button type="button" aria-pressed={under50} onClick={() => updateSelection({ under50: !under50 })}>Under ₹50</button>
            <button type="button" aria-pressed={discountOnly} onClick={() => updateSelection({ discountOnly: !discountOnly })}>10%+ off</button>
          </div>
          <div className="browse-grid-heading">
            <h1 id="browse-section-title">{selected?.label ?? data?.category.name ?? "Category"}</h1>
            {!isPending && !isError && <span aria-live="polite">{filtered.length} {filtered.length === 1 ? "item" : "items"}</span>}
          </div>
          {isPending ? (
            <div className="browse-grid" role="status" aria-label="Loading products">
              {Array.from({ length: 4 }, (_, i) => <div key={i} className="storefront-skeleton browse-card-placeholder" />)}
            </div>
          ) : isError ? (
            <div className="browse-empty">
              <p>The category couldn’t load.</p>
              <button type="button" onClick={() => void refetch()}>Try again</button>
            </div>
          ) : !filtered.length ? (
            <p className="browse-empty">{under50 || discountOnly ? "No products match these filters." : "No products in this subcategory yet."}</p>
          ) : (
            <div className="browse-grid" key={`${selected?.id}:${under50}:${discountOnly}:${sort}`}>
              {filtered.map((product, index) => (
                <div key={product.id} className="browse-card-enter" style={{ "--browse-card-index": Math.min(index, 8) } as CSSProperties}>
                  <BrowseProductCard product={product} />
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </BrowseView>
  );
}
