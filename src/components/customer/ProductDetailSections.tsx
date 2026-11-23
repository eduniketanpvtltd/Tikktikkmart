"use client";

import { useId, useLayoutEffect, useRef, useState, type ReactNode, type UIEvent } from "react";
import Link from "next/link";
import { ChevronDown } from "lucide-react";
import { CatalogImage } from "@/components/customer/CatalogImage";
import { formatRupees } from "@/components/customer/AnimatedRupees";
import { getCardImage } from "@/components/customer/ProductCard";
import { flyToCart } from "@/lib/catalog/flyToCart";
import { useOpenProduct } from "@/lib/catalog/productMotion";
import { useCartStore } from "@/stores/cartStore";
import type { Product, ProductVariant } from "@/types/db";

export type DetailedProduct = Product & {
  highlights?: string[] | null;
  shelf_life?: string | null;
  country_of_origin?: string | null;
  fssai_licence?: string | null;
  fssai_license?: string | null;
  seller?: string | null;
  storage_usage?: string | null;
  storage?: string | null;
  usage?: string | null;
};

export type RelatedProducts = { similar: Product[]; alsoBought: Product[] };

export function variantPricing(variant?: ProductVariant) {
  const price = variant?.effective_price ?? variant?.base_price ?? 0;
  const mrp = variant?.mrp ?? price;
  const discount = mrp > price ? Math.round((1 - price / mrp) * 100) : 0;
  return { price, mrp, discount };
}

export function ProductGallery({ product, discount }: { product: Product; discount: number }) {
  const sources = [...new Set([getCardImage(product), ...(product.images ?? []).slice(1)].filter(Boolean))];
  if (!sources.length) sources.push(null);
  const dots = useRef<HTMLDivElement>(null);

  function updateDots(event: UIEvent<HTMLDivElement>) {
    const { scrollLeft, clientWidth } = event.currentTarget;
    if (!dots.current || !clientWidth) return;
    const progress = scrollLeft / clientWidth;
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    Array.from(dots.current.children).forEach((dot, index) => {
      const distance = Math.abs(index - (reduce ? Math.round(progress) : progress));
      (dot as HTMLElement).style.setProperty("--gallery-active", String(Math.max(0, 1 - distance)));
    });
  }

  return (
    <section className="product-gallery" aria-label="Product images">
      {discount > 0 && <span className="product-off-tag">{discount}% off</span>}
      <div className="product-slides" tabIndex={sources.length > 1 ? 0 : undefined}
        role="group" aria-label={sources.length > 1 ? "Swipe or use arrow keys to browse images" : "Product gallery"} onScroll={updateDots}>
        {sources.map((source, index) => (
          <div key={source ?? "placeholder"} className="product-slide" role="img"
            aria-label={`${product.name}, image ${index + 1} of ${sources.length}`}>
            <div className="product-gallery-image" data-detail-image={index === 0 ? product.slug : undefined}>
              <CatalogImage src={source} />
            </div>
          </div>
        ))}
      </div>
      {Boolean(sources[0]) && (
        <div ref={dots} className="product-gallery-dots" aria-hidden="true">
          {sources.map((source) => <span key={source} />)}
        </div>
      )}
    </section>
  );
}

function ProductAccordion({ title, children, initiallyOpen = false }: {
  title: string; children: ReactNode; initiallyOpen?: boolean;
}) {
  const [open, setOpen] = useState(initiallyOpen);
  const [height, setHeight] = useState<number>();
  const panel = useRef<HTMLDivElement>(null);
  const id = useId();

  useLayoutEffect(() => {
    const content = panel.current;
    if (!content) return;
    const measure = () => setHeight(content.scrollHeight);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(content);
    return () => observer.disconnect();
  }, []);

  return (
    <div className="product-accordion">
      <h2>
        <button type="button" id={`${id}-button`} aria-controls={id} aria-expanded={open} onClick={() => setOpen(!open)}>
          {title}<ChevronDown aria-hidden="true" size={18} />
        </button>
      </h2>
      <div id={id} role="region" aria-labelledby={`${id}-button`} inert={!open}
        className="product-accordion-panel" style={{ maxHeight: open ? height : 0 }}>
        <div ref={panel} className="product-accordion-content">{children}</div>
      </div>
    </div>
  );
}

export function ProductDetails({ product }: { product: DetailedProduct }) {
  const highlights = Array.isArray(product.highlights) ? product.highlights.filter(Boolean) : [];
  const facts = [
    ["Shelf life", product.shelf_life],
    ["Country of origin", product.country_of_origin],
    ["FSSAI licence", product.fssai_licence ?? product.fssai_license],
    ["Seller", product.seller],
  ].filter(([, value]) => Boolean(value));
  const hasDetails = product.description || highlights.length > 0 || facts.length > 0;
  const storage = product.storage_usage ? [product.storage_usage] : [product.storage, product.usage].filter(Boolean);
  if (!hasDetails && !storage.length) return null;

  return (
    <section className="product-panel" aria-label="Product information">
      {hasDetails && (
        <ProductAccordion title="Product details" initiallyOpen>
          {product.description && <p>{product.description}</p>}
          {highlights.length > 0 && <ul>{highlights.map((highlight, index) => <li key={index}>{highlight}</li>)}</ul>}
          {facts.length > 0 && (
            <dl className="product-facts">
              {facts.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}
            </dl>
          )}
        </ProductAccordion>
      )}
      {storage.length > 0 && (
        <ProductAccordion title="Storage & usage">
          {storage.map((value, index) => <p key={index}>{value}</p>)}
        </ProductAccordion>
      )}
    </section>
  );
}

function RelatedProductCard({ product }: { product: Product }) {
  const open = useOpenProduct();
  const variant = product.variants?.[0];
  const inCart = useCartStore((state) => state.items.some((item) => item.variantId === variant?.id));
  const { price, mrp, discount } = variantPricing(variant);
  const stock = variant?.stock_available;
  const maxQty = Math.min(stock ?? Infinity, variant?.max_qty_per_order ?? 10);
  const image = getCardImage(product);

  return (
    <article className="product-related-item">
      <Link href={`/product/${product.slug}`} className="product-related-link"
        onNavigate={(event) => { event.preventDefault(); open(product, null); }}>
        <div className="product-related-image">
          <CatalogImage src={image} />
          {discount > 0 && <span className="product-off-tag">{discount}% off</span>}
        </div>
        <h3>{product.name}</h3>
        {variant && <p>{variant.label}</p>}
      </Link>
      {variant && (
        <div className="product-related-buy">
          <strong>{formatRupees(price)}</strong>
          <button type="button" disabled={inCart || maxQty <= 0}
            aria-label={inCart ? `${product.name} added` : maxQty <= 0 ? `${product.name} out of stock` : `Add ${product.name} to cart`}
            data-added={inCart ? "" : undefined}
            onClick={(event) => {
              const { items, addItem } = useCartStore.getState();
              if (items.some((item) => item.variantId === variant.id)) return;
              addItem({ variantId: variant.id, productId: product.id, name: product.name,
                label: variant.label, image, price, mrp, maxQty, stockLimit: stock });
              flyToCart(event.currentTarget);
            }}>
            <span>{inCart ? "Added" : maxQty > 0 ? "Add" : "Sold out"}</span>
          </button>
        </div>
      )}
    </article>
  );
}

export function ProductShelf({ title, products, loading }: { title: string; products?: Product[]; loading: boolean }) {
  const id = useId();
  if (!loading && !products?.length) return null;
  return (
    <section className="product-panel product-shelf" aria-labelledby={id} aria-busy={loading}>
      <h2 id={id}>{title}</h2>
      <div className="product-related-scroll">
        {loading ? [0, 1, 2].map((n) => (
          <div key={n} aria-hidden="true" className="product-related-item product-related-skeleton">
            <span className="product-skeleton product-related-image" />
            <span className="product-skeleton product-skeleton-line" />
          </div>
        )) : products?.map((product) => <RelatedProductCard key={product.id} product={product} />)}
      </div>
    </section>
  );
}

export function ProductSkeleton() {
  return (
    <div data-product-page className="product-page" aria-busy="true">
      <span className="sr-only" role="status">Loading product details</span>
      <div className="product-header product-loading-header" aria-hidden="true">
        <div className="product-skeleton product-header-button" />
        <div className="product-header-title" />
        {[0, 1, 2].map((n) => <div key={n} className="product-skeleton product-header-button" />)}
      </div>
      <div className="product-gallery" aria-hidden="true">
        <div className="product-slide">
          <div className="product-gallery-image product-skeleton" />
        </div>
      </div>
      <div className="product-body">
        <div className="product-info" aria-hidden="true">
          <div className="product-skeleton product-skeleton-eta" />
          <div className="product-skeleton product-skeleton-name" />
          <div className="product-skeleton product-skeleton-price" />
        </div>
        <ProductShelf title="Similar products" loading />
        <ProductShelf title="People also bought" loading />
      </div>
    </div>
  );
}
