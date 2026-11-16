"use client";
import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Grid, Search, Package, User } from "lucide-react";
import { useAuth } from "@/components/providers/AppProviders";

export function MobileNav() {
  const pathname = usePathname();
  const { user } = useAuth();

  const NAV_ITEMS = [
    { label: "Home", href: "/", icon: Home },
    { label: "Categories", href: "/category/vegetables-fruits", icon: Grid },
    { label: "Search", href: "/search", icon: Search },
    { label: "Orders", href: "/orders", icon: Package },
    { label: "Account", href: user ? "/profile" : "/login", icon: User },
  ];

  return (
    <nav className="sm:hidden fixed bottom-0 inset-x-0 z-30 bg-white/95 backdrop-blur-md border-t border-gray-200 shadow-[0_-4px_12px_rgba(19,25,59,0.05)] pb-safe">
      <div className="grid grid-cols-5 h-14">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive =
            item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);

          return (
            <Link
              key={item.label}
              href={item.href}
              className={`flex flex-col items-center justify-center gap-0.5 text-[10px] font-bold transition-colors select-none ${
                isActive
                  ? "text-[#f66002]"
                  : "text-gray-500 hover:text-gray-900"
              }`}
            >
              <div className="relative">
                {item.label === "Account" && user?.photo_url ? (
                  <div
                    className={`w-5 h-5 rounded-full overflow-hidden border ${
                      isActive
                        ? "border-[#f66002] ring-2 ring-[#f66002]/30 scale-110"
                        : "border-gray-300"
                    }`}
                  >
                    <img src={user.photo_url} alt="Profile" className="w-full h-full object-cover" />
                  </div>
                ) : (
                  <Icon
                    className={`w-5 h-5 transition-transform duration-150 ${
                      isActive ? "stroke-[2.5] scale-110" : "stroke-[1.8]"
                    }`}
                  />
                )}
                {item.label === "Orders" && (
                  <span className="absolute -top-0.5 -right-1 w-2 h-2 rounded-full bg-[#f66002]" />
                )}
              </div>
              <span className="tracking-tight leading-none">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
