"use client";
import React from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, ArrowRight, Package, RotateCcw, Zap } from "lucide-react";
import { apiFetch } from "@/lib/api/client";
import { useAuth } from "@/components/providers/AppProviders";

export default function OrdersListPage() {
  const { user } = useAuth();
  const { data: orders = [], isLoading } = useQuery({
    queryKey: ["my-orders", user?.id],
    enabled: Boolean(user),
    queryFn: async () => {
      const res = await apiFetch<any[]>("/api/orders");
      return res.data ?? [];
    },
  });

  if (!user) {
    return (
      <div className="max-w-md mx-auto my-12 bg-white rounded-3xl border border-gray-100 p-8 text-center space-y-4 shadow-sm">
        <div className="w-16 h-16 rounded-full bg-[#fff0e6] text-[#f66002] flex items-center justify-center mx-auto text-2xl font-black">
          📦
        </div>
        <h1 className="font-black text-lg text-gray-900">Sign in to view your orders</h1>
        <p className="text-xs text-gray-500">
          Track active deliveries in real-time and review previous purchases.
        </p>
        <Link
          href="/login"
          className="inline-block w-full py-3.5 rounded-2xl bg-[#f66002] hover:bg-[#dd5500] text-white font-black text-xs uppercase tracking-wider transition-colors shadow-sm"
        >
          Login
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      {/* Top Header */}
      <div className="flex items-center gap-3">
        <Link
          href="/"
          className="p-2 rounded-xl bg-white border border-gray-100 hover:bg-gray-50 text-gray-700 transition-colors"
        >
          <ArrowLeft className="w-4 h-4 stroke-[2.5]" />
        </Link>
        <div>
          <h1 className="text-lg sm:text-xl font-black text-gray-900 leading-tight">
            My Orders
          </h1>
          <p className="text-[11px] text-gray-500 font-medium">
            Past grocery purchases and active 10-min deliveries
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="py-12 text-center text-xs text-gray-400 font-bold uppercase tracking-wider">
          Loading order history...
        </div>
      ) : orders.length === 0 ? (
        <div className="bg-white rounded-3xl border border-gray-100 p-12 text-center space-y-3 shadow-sm">
          <div className="w-16 h-16 rounded-full bg-gray-50 flex items-center justify-center mx-auto text-3xl">
            🛒
          </div>
          <h2 className="font-black text-base text-gray-800">No orders placed yet</h2>
          <p className="text-xs text-gray-500 max-w-xs mx-auto">
            Order fresh groceries, snacks and household essentials in minutes.
          </p>
          <Link
            href="/"
            className="inline-block px-5 py-3 rounded-2xl bg-[#f66002] hover:bg-[#dd5500] text-white text-xs font-black uppercase tracking-wider transition-colors shadow-sm"
          >
            Start Shopping
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map((o) => {
            const isDelivered = o.status === "delivered";
            const isCancelled = o.status === "cancelled";
            const isActive = !isDelivered && !isCancelled;

            return (
              <div
                key={o.id}
                className="bg-white rounded-3xl border border-gray-100 p-4 sm:p-5 space-y-3.5 shadow-[0_2px_8px_rgba(0,0,0,0.03)] hover:border-gray-200 transition-all"
              >
                {/* Status + Order # */}
                <div className="flex items-start justify-between gap-2 border-b border-gray-100 pb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-black text-sm text-gray-900">
                        Order #{o.order_no}
                      </span>
                      {isActive && (
                        <span className="flex items-center gap-1 bg-[#fff0e6] text-[#f66002] text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider">
                          <Zap className="w-2.5 h-2.5 fill-[#f66002]" /> LIVE
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-gray-500 mt-0.5">
                      {o.store?.name ?? "Dark Store"} · {new Date(o.placed_at).toLocaleDateString([], { month: "short", day: "numeric" })} at {new Date(o.placed_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>

                  <span
                    className={`text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider ${
                      isDelivered
                        ? "bg-[#fff0e6] text-[#f66002]"
                        : isCancelled
                        ? "bg-red-50 text-red-600"
                        : "bg-[#13193b] text-[#ffd269]"
                    }`}
                  >
                    {o.status.replaceAll("_", " ")}
                  </span>
                </div>

                {/* Items Summary preview */}
                <div className="flex items-center justify-between text-xs text-gray-700">
                  <div className="space-y-0.5">
                    <p className="font-bold text-gray-900">
                      {o.items?.length ?? 0} {o.items?.length === 1 ? "item" : "items"}
                    </p>
                    <p className="text-[11px] text-gray-500 truncate max-w-[220px] sm:max-w-sm">
                      {(o.items ?? []).map((it: any) => it.name_snapshot).join(", ")}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-black text-sm sm:text-base text-gray-900">
                      ₹{o.grand_total}
                    </p>
                    <p className="text-[10px] text-gray-400 uppercase font-mono">
                      {o.payment_method}
                    </p>
                  </div>
                </div>

                {/* Actions Bar */}
                <div className="pt-2 border-t border-gray-50 flex items-center justify-between gap-2">
                  <Link
                    href={`/orders/${o.id}`}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider transition-colors ${
                      isActive
                        ? "bg-[#f66002] hover:bg-[#dd5500] text-white shadow-sm"
                        : "bg-gray-100 hover:bg-gray-200 text-gray-800"
                    }`}
                  >
                    <span>{isActive ? "Track Delivery ⚡" : "View Order Details"}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>

                  <Link
                    href="/"
                    className="p-2.5 rounded-xl border border-gray-200 hover:bg-gray-50 text-gray-600 hover:text-black transition-colors"
                    title="Shop again"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
