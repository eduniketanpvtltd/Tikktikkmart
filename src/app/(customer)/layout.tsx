import React from "react";
import type { Viewport } from "next";
import { CustomerFeedback } from "@/components/customer/CustomerFeedback";
import { CustomerHeader } from "@/components/customer/CustomerHeader";
import { FloatingCartBar } from "@/components/customer/FloatingCartBar";
import { MobileNav } from "@/components/customer/MobileNav";
import "./browse.css";
import "./market.css";

export const viewport: Viewport = { viewportFit: "cover" };

export default function CustomerLayout({ children }: { children: React.ReactNode }) {
  return (
    <div data-customer-app className="min-h-screen pb-28 sm:pb-24">
      <CustomerHeader />
      <main className="max-w-5xl mx-auto px-3 sm:px-4 py-3 sm:py-4">{children}</main>
      <FloatingCartBar />
      <MobileNav />
      <CustomerFeedback />
    </div>
  );
}
