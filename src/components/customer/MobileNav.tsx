"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Grid2X2, Home, Package, ShoppingCart, User } from "lucide-react";
import { useAuth } from "@/components/providers/AppProviders";
import { AccountAvatar } from "@/components/customer/AccountAvatar";
import { useCartStore } from "@/stores/cartStore";
import { rememberCartOrigin } from "@/lib/cartEntry";

export function MobileNav() {
  const pathname = usePathname();
  const { user } = useAuth();
  const count = useCartStore((state) => state.items.reduce((total, item) => total + item.quantity, 0));
  if (pathname === "/cart" || pathname === "/checkout" || pathname.startsWith("/product/") || pathname.startsWith("/orders/")) return null;

  const itemCount = `${count} ${count === 1 ? "item" : "items"}`;
  const links = [
    { label: "Home", href: "/", icon: Home, active: pathname === "/" },
    { label: "Categories", href: "/#categories", icon: Grid2X2, active: pathname.startsWith("/category/") },
    { label: "Orders", href: "/orders", icon: Package, active: pathname === "/orders" },
    { label: "Account", href: user ? "/profile" : "/login", icon: User, active: pathname === "/profile" },
    { label: "Cart", href: "/cart", icon: ShoppingCart, active: false },
  ];

  return (
    <nav aria-label="Main navigation" className="market-nav">
      {links.map(({ label, href, icon: Icon, active }) => {
        const isCart = label === "Cart";
        const icon = <Icon size={19} aria-hidden="true" strokeWidth={active ? 2.25 : 1.8} />;
        return (
          <Link key={label} href={href} aria-current={active ? "page" : undefined}
            className="market-nav-link"
            aria-label={isCart && count > 0 ? `Cart, ${itemCount}` : undefined}
            onNavigate={isCart ? rememberCartOrigin : undefined}>
            <span className="market-nav-icon" data-mobile-cart-target={isCart ? "" : undefined}>
              {label === "Account" ? <AccountAvatar src={user?.photo_url} className="size-[19px] rounded-full" fallback={icon} /> : icon}
            </span>
            {isCart && count > 0 && (
              <span className="market-nav-count" aria-hidden="true">{count > 99 ? "99+" : count}</span>
            )}
            <span>{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
