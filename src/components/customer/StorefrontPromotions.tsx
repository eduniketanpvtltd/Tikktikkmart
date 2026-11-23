"use client";

import Link from "next/link";
import { rememberCartOrigin } from "@/lib/cartEntry";
import { ChevronRight } from "lucide-react";

export function StorefrontPromotions() {
  return (
    <aside aria-label="First-order offer">
      <Link href="/cart" onNavigate={rememberCartOrigin} className="storefront-offer block">
        <span className="storefront-offer-face relative flex items-center justify-center gap-2.5 overflow-hidden bg-[var(--navy)] px-4 text-center text-[22px] leading-tight font-extrabold tracking-tight text-[color:var(--theme-on-navy)]">
          ₹50 off with WELCOME50
          <ChevronRight aria-hidden="true" className="storefront-offer-chevron size-5 shrink-0" />
        </span>
        <span aria-hidden="true" className="storefront-offer-scallops block" />
      </Link>
    </aside>
  );
}
