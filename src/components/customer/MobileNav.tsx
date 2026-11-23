"use client";
import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Search, Package, User } from "lucide-react";
import { useAuth } from "@/components/providers/AppProviders";
import { AccountAvatar } from "@/components/customer/AccountAvatar";

export function MobileNav() {
  const pathname = usePathname();
  const { user } = useAuth();
  if (pathname === "/cart" || pathname.startsWith("/product/") || pathname.startsWith("/orders/")) return null;

  const NAV_ITEMS = [
    { label: "Home", href: "/", icon: Home },
    { label: "Search", href: "/search", icon: Search },
    { label: "Orders", href: "/orders", icon: Package },
    { label: "Account", href: user ? "/profile" : "/login", icon: User },
  ];

  return (
    <nav aria-label="Main navigation" className="sm:hidden fixed bottom-0 inset-x-0 z-30 bg-[var(--white)] border-t border-[color:var(--theme-line)] shadow-[0_-4px_12px_var(--theme-shadow)] pb-safe">
      <div className="grid h-[var(--customer-nav-height)] grid-cols-4">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          const icon = (
            <Icon
              aria-hidden="true"
              className={`size-[18px] ${isActive ? "stroke-[2.25]" : "stroke-[1.8]"}`}
            />
          );

          return (
            <Link
              key={item.label}
              href={item.href}
              aria-current={isActive ? "page" : undefined}
              className={`mobile-nav-item flex flex-col items-center justify-center gap-[3px] text-[10px] font-bold transition-colors select-none focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[color:var(--theme-orange-text)] ${
                isActive
                  ? "text-[color:var(--theme-orange-text)]"
                  : "text-[color:var(--theme-muted)] hover:text-[color:var(--theme-ink)]"
              }`}
            >
              <div className="mobile-nav-icon">
                {item.label === "Account" ? (
                  <AccountAvatar
                    src={user?.photo_url}
                    className={`size-[18px] rounded-full border ${
                      isActive
                        ? "border-[color:var(--border-orange)]"
                        : "border-[color:var(--theme-line)]"
                    }`}
                    fallback={icon}
                  />
                ) : icon}
              </div>
              <span className="tracking-tight leading-none">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
