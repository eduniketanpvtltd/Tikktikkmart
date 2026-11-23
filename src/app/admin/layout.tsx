"use client";
import { LayoutSkeleton } from "@/components/ui/LayoutSkeleton";
import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, ShoppingCart, Package, Store, Bike, Megaphone, Wallet, Settings } from "lucide-react";
import { useAuth } from "@/components/providers/AppProviders";

const NAV = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/orders", label: "Orders", icon: ShoppingCart },
  { href: "/admin/catalog", label: "Catalog", icon: Package },
  { href: "/admin/stores", label: "Stores", icon: Store },
  { href: "/admin/riders", label: "Riders", icon: Bike },
  { href: "/admin/marketing", label: "Marketing", icon: Megaphone },
  { href: "/admin/payouts", label: "Payouts", icon: Wallet },
  { href: "/admin/settings", label: "Settings & Logs", icon: Settings },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const pathname = usePathname();

  if (loading) return <LayoutSkeleton shape="metrics" label="Loading admin" />;
  if (!user || !["admin", "super_admin"].includes(user.role)) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 p-4 bg-[#fffaf5]">
        <span className="media-frame block shrink-0 size-16 rounded-2xl shadow-md">
          <img src="/logo.png" alt="TIKK TIKK MART" width={64} height={64} className="media-content media-content--contain" />
        </span>
        <h1 className="text-xl font-black text-[#13193b]">Admin Access Required</h1>
        <p className="text-xs text-gray-500">Sign in with a SUPER_ADMIN_EMAILS account.</p>
        <Link href="/login" className="px-5 py-2.5 rounded-xl bg-[#f66002] hover:bg-[#dd5500] text-white text-xs font-black uppercase tracking-wider transition-colors shadow-sm">
          Login
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col md:flex-row">
      <aside className="min-w-0 w-full md:w-64 bg-white border-r p-4 space-y-4 shrink-0 shadow-2xs">
        <div className="flex items-center gap-2.5">
          <span className="media-frame block shrink-0 size-9 rounded-xl shadow-2xs">
            <img src="/logo.png" alt="TTM" width={36} height={36} className="media-content media-content--contain" />
          </span>
          <div>
            <Link href="/admin" className="font-black text-sm tracking-tight text-[#13193b] block">
              TIKK TIKK <span className="text-[#f66002]">MART</span>
            </Link>
            <span className="text-[10px] font-black uppercase tracking-wider text-gray-400">Admin Control</span>
          </div>
        </div>
        <nav aria-label="Admin sections" className="no-scrollbar flex min-w-0 gap-1 overflow-x-auto md:flex-col">
          {NAV.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`flex shrink-0 items-center gap-2.5 overflow-hidden rounded-xl px-3 py-2 text-xs font-bold whitespace-nowrap transition-colors ${
                  active ? "bg-[#f66002] text-white" : "text-gray-700 hover:bg-orange-50/50 hover:text-[#f66002]"
                }`}
              >
                <Icon className="w-4 h-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="pt-4 border-t hidden md:block space-y-1 text-xs">
          <Link href="/store" className="block text-[#f66002] font-bold hover:underline">
            Open Store App →
          </Link>
          <Link href="/" className="block text-gray-500 hover:underline">
            Open Customer App →
          </Link>
        </div>
      </aside>

      <main className="min-w-0 flex-1 p-4 sm:p-5">{children}</main>
    </div>
  );
}

