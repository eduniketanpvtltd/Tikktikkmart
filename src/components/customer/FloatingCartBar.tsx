"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { CatalogImage } from "@/components/customer/CatalogImage";
import { ChevronRight, ShoppingBag } from "lucide-react";
import { rememberCartOrigin } from "@/lib/cartEntry";
import { useCartStore } from "@/stores/cartStore";

export function FloatingCartBar() {
  const items = useCartStore((state) => state.items);
  const pathname = usePathname();
  if (pathname === "/cart" || pathname === "/checkout" || pathname.startsWith("/product/") || pathname.startsWith("/orders/")) return null;

  const count = items.reduce((total, item) => total + item.quantity, 0);
  const preview = items.find((item) => item.image)?.image;

  return (
    <aside
      aria-label="Active cart summary"
      aria-hidden={!items.length}
      inert={!items.length}
      data-cart-dock
      data-empty={items.length ? undefined : ""}
      className="storefront-cart-dock pointer-events-none fixed inset-x-0 z-29 flex justify-center px-3"
    >
      <Link
        href="/cart"
        onNavigate={rememberCartOrigin}
        data-cart-pill
        className="group pointer-events-auto flex min-h-12 w-46 max-w-full items-center gap-2.5 rounded-full bg-[var(--navy)] py-1.5 pl-1.5 pr-2.5 text-white shadow-[0_5px_16px_rgba(19,25,59,0.24)] transition-colors hover:bg-[var(--theme-navy-hover)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--navy)]"
      >
        <span data-cart-thumbnail className="relative media-frame grid size-9 shrink-0 place-items-center rounded-full bg-[var(--peach-light)]">
          {preview ? (
            <CatalogImage src={preview} className="object-contain p-1.5" />
          ) : (
            <ShoppingBag aria-hidden="true" className="size-4 text-[color:var(--theme-orange-text)]" />
          )}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm leading-tight font-bold">View cart</span>
          <span className="block text-xs leading-tight text-white/90">{count} {count === 1 ? "item" : "items"}</span>
        </span>
        <span className="grid size-7 shrink-0 place-items-center rounded-full bg-white/10">
          <ChevronRight aria-hidden="true" className="size-4 motion-safe:transition-transform motion-safe:group-hover:translate-x-1" />
        </span>
      </Link>
    </aside>
  );
}
