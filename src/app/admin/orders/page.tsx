"use client";
import React from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api/client";

export default function AdminOrdersPage() {
  const qc = useQueryClient();
  const { data: orders = [], isLoading } = useQuery({
    queryKey: ["admin-orders"],
    refetchInterval: 8000,
    queryFn: async () => {
      const res = await apiFetch<any[]>("/api/admin/orders");
      return res.data ?? [];
    },
  });

  const { data: riders = [] } = useQuery({
    queryKey: ["admin-riders-list"],
    queryFn: async () => {
      const res = await apiFetch<any[]>("/api/admin/riders");
      return (res.data ?? []).filter((r) => r.kyc_status === "approved");
    },
  });

  const cancelOrder = async (orderId: string) => {
    if (!confirm("Cancel this order?")) return;
    await apiFetch("/api/admin/orders", {
      method: "POST",
      body: JSON.stringify({ orderId, action: "cancel" }),
    });
    qc.invalidateQueries({ queryKey: ["admin-orders"] });
  };

  const assignRider = async (orderId: string, riderId: string) => {
    if (!riderId) return;
    await apiFetch("/api/admin/orders", {
      method: "POST",
      body: JSON.stringify({ orderId, action: "assign_rider", riderId }),
    });
    qc.invalidateQueries({ queryKey: ["admin-orders"] });
  };

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-extrabold">All Orders</h1>
      {isLoading ? (
        <p className="text-sm text-gray-500">Loading orders...</p>
      ) : (
        <div className="bg-white rounded-2xl border overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-gray-50 text-gray-500 uppercase border-b">
              <tr>
                <th className="px-3 py-2.5">Order</th>
                <th className="px-3 py-2.5">Customer</th>
                <th className="px-3 py-2.5">Store</th>
                <th className="px-3 py-2.5">Status</th>
                <th className="px-3 py-2.5">Total</th>
                <th className="px-3 py-2.5">Rider</th>
                <th className="px-3 py-2.5">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {orders.map((o) => (
                <tr key={o.id}>
                  <td className="px-3 py-2.5 font-bold">#{o.order_no}</td>
                  <td className="px-3 py-2.5">{o.customer?.name || o.customer?.email}</td>
                  <td className="px-3 py-2.5">{o.store?.name}</td>
                  <td className="px-3 py-2.5 uppercase font-semibold">{o.status.replaceAll("_", " ")}</td>
                  <td className="px-3 py-2.5 font-bold">₹{o.grand_total}</td>
                  <td className="px-3 py-2.5">
                    {o.rider ? (
                      o.rider.name
                    ) : (
                      <select
                        defaultValue=""
                        onChange={(e) => assignRider(o.id, e.target.value)}
                        className="border rounded px-2 py-1 bg-white"
                      >
                        <option value="">Assign rider...</option>
                        {riders.map((r: any) => (
                          <option key={r.user_id} value={r.user_id}>
                            {r.user?.name || r.user?.email}
                          </option>
                        ))}
                      </select>
                    )}
                  </td>
                  <td className="px-3 py-2.5">
                    {!["delivered", "cancelled", "refunded"].includes(o.status) && (
                      <button
                        type="button"
                        onClick={() => cancelOrder(o.id)}
                        className="text-red-600 font-bold hover:underline"
                      >
                        Cancel
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

