"use client";
import { LayoutSkeleton } from "@/components/ui/LayoutSkeleton";
import React from "react";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api/client";

export default function AdminDashboardPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["admin-dashboard"],
    refetchInterval: 10000,
    queryFn: async () => {
      const res = await apiFetch<any>("/api/admin/dashboard");
      return res.data;
    },
  });

  if (isLoading) return <LayoutSkeleton shape="metrics" label="Loading metrics" />;

  const cards = [
    { label: "Orders Today", value: data?.ordersToday ?? 0 },
    { label: "Live Orders", value: data?.liveOrders ?? 0 },
    { label: "GMV Today", value: `₹${data?.gmvToday ?? 0}` },
    { label: "Active Stores", value: data?.activeStores ?? 0 },
    { label: "Online Riders", value: data?.onlineRiders ?? 0 },
    { label: "Pending KYC", value: data?.pendingKyc ?? 0 },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-extrabold">Operations Dashboard</h1>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {cards.map((c) => (
          <div key={c.label} className="bg-white rounded-2xl border p-4">
            <p className="text-xs text-gray-500">{c.label}</p>
            <p className="layout-wrap mt-1 text-2xl font-black">{c.value}</p>
          </div>
        ))}
      </div>

      <div className="layout-table-section rounded-2xl border bg-white">
        <h2 className="px-4 py-3 font-bold text-sm">Recent Orders</h2>
        <div className="layout-table">
          <table className="w-full text-xs text-left">
            <thead className="bg-gray-50 text-gray-500 uppercase border-b">
              <tr>
                <th className="px-3 py-2">Order #</th>
                <th className="px-3 py-2">Store</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Payment</th>
                <th className="px-3 py-2">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {(data?.recentOrders ?? []).map((o: any) => (
                <tr key={o.id}>
                  <td className="px-3 py-2 font-bold">#{o.order_no}</td>
                  <td className="px-3 py-2">{o.store?.name ?? "—"}</td>
                  <td className="px-3 py-2 uppercase font-semibold">{o.status.replaceAll("_", " ")}</td>
                  <td className="px-3 py-2 uppercase">{o.payment_method}</td>
                  <td className="px-3 py-2 font-bold">₹{o.grand_total}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

