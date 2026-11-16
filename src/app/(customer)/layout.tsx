import React from "react";
import { CustomerHeader } from "@/components/customer/CustomerHeader";
import { FloatingCartBar } from "@/components/customer/FloatingCartBar";
import { MobileNav } from "@/components/customer/MobileNav";

export default function CustomerLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#f4f6fb] pb-28 sm:pb-24">
      <CustomerHeader />
      <main className="max-w-5xl mx-auto px-3 sm:px-4 py-3 sm:py-4">{children}</main>
      <FloatingCartBar />
      <MobileNav />
    </div>
  );
}
