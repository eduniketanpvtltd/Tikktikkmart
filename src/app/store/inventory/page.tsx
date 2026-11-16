"use client";
import React, { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Minus, Plus } from "lucide-react";
import { apiFetch } from "@/lib/api/client";
import { useAuth } from "@/components/providers/AppProviders";

function InventoryTable() {
  const sp = useSearchParams();
  const storeIdParam = sp.get("storeId");
  const { user } = useAuth();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");

  const { data: stores = [] } = useQuery({
    queryKey: ["store-me-inv", user?.id],
    enabled: Boolean(user),
    queryFn: async () => {
      const res = await apiFetch<any[]>("/api/store/me");
      return res.data ?? [];
    },
  });

  const storeId = storeIdParam || stores[0]?.id;

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["store-inventory", storeId],
    enabled: Boolean(storeId),
    queryFn: async () => {
      const res = await apiFetch<any[]>(`/api/store/inventory?storeId=${storeId}`);
      return res.data ?? [];
    },
  });

  const adjustQty = async (variantId: string, nextQty: number) => {
    await apiFetch("/api/store/inventory", {
      method: "PATCH",
      body: JSON.stringify({ storeId, variantId, quantity: Math.max(0, nextQty), is_available: nextQty > 0 }),
    });
    qc.invalidateQueries({ queryKey: ["store-inventory", storeId] });
  };

  const toggleAvail = async (variantId: string, isAvailable: boolean) => {
    await apiFetch("/api/store/inventory", {
      method: "PATCH",
      body: JSON.stringify({ storeId, variantId, is_available: !isAvailable }),
    });
    qc.invalidateQueries({ queryKey: ["store-inventory", storeId] });
  };

  const filtered = rows.filter(
    (r) =>
      r.product_name.toLowerCase().includes(search.toLowerCase()) ||
      (r.sku ?? "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gray-50 p-5">
      <div className="max-w-5xl mx-auto space-y-4">
        <div className="flex items-center justify-between gap-3">
          <Link href="/store" className="inline-flex items-center gap-1.5 text-sm font-bold text-gray-700">
            <ArrowLeft className="w-4 h-4" /> Back to Live Board
          </Link>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filter by product or SKU..."
            className="border rounded-xl px-3 py-2 text-sm bg-white w-64"
          />
        </div>

        <h1 className="text-xl font-extrabold">Store Inventory</h1>

        {isLoading ? (
          <p className="text-sm text-gray-500">Loading inventory...</p>
        ) : (
          <div className="bg-white rounded-2xl border overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-50 text-xs uppercase text-gray-500 border-b">
                <tr>
                  <th className="px-4 py-3">Product</th>
                  <th className="px-4 py-3">Pack / SKU</th>
                  <th className="px-4 py-3">Price</th>
                  <th className="px-4 py-3">Stock</th>
                  <th className="px-4 py-3">Reserved</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filtered.map((r) => (
                  <tr key={r.variant_id}>
                    <td className="px-4 py-3 font-semibold">{r.product_name}</td>
                    <td className="px-4 py-3 text-xs text-gray-500">
                      {r.label} · {r.sku || "—"}
                    </td>
                    <td className="px-4 py-3">₹{r.price_override ?? r.base_price}</td>
                    <td className="px-4 py-3">
                      <div className="inline-flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => adjustQty(r.variant_id, r.quantity - 1)}
                          className="p-1 rounded border hover:bg-gray-100"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="font-bold w-8 text-center">{r.quantity}</span>
                        <button
                          type="button"
                          onClick={() => adjustQty(r.variant_id, r.quantity + 1)}
                          className="p-1 rounded border hover:bg-gray-100"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">{r.reserved}</td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() => toggleAvail(r.variant_id, r.is_available)}
                        className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                          r.is_available ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"
                        }`}
                      >
                        {r.is_available ? "Active" : "Paused"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default function StoreInventoryPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-sm text-gray-500">Loading...</div>}>
      <InventoryTable />
    </Suspense>
  );
}

