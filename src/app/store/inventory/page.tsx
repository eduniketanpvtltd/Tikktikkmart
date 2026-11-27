"use client";
import { LayoutSkeleton } from "@/components/ui/LayoutSkeleton";
import React, { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Boxes, Minus, Package, Search, Plus } from "lucide-react";
import { useOptimisticMutation } from "@/lib/ui/useOptimisticMutation";
import { apiFetch } from "@/lib/api/client";
import { useAuth } from "@/components/providers/AppProviders";

type InventoryFilter = "all" | "active" | "low" | "paused";

interface InventoryRow {
  variant_id: string;
  product_name: string;
  label: string;
  sku?: string | null;
  price_override?: number | null;
  base_price: number;
  quantity: number;
  reserved: number;
  is_available: boolean;
}

interface StoreInfo {
  id: string;
  name?: string;
}

function InventoryTable() {
  const sp = useSearchParams();
  const storeIdParam = sp.get("storeId");
  const { user } = useAuth();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<InventoryFilter>("all");
  const mutation = useOptimisticMutation();

  const { data: stores = [] } = useQuery({
    queryKey: ["store-me-inv", user?.id],
    enabled: Boolean(user),
    queryFn: async () => {
      const res = await apiFetch<StoreInfo[]>("/api/store/me");
      return res.data ?? [];
    },
  });

  const storeId = storeIdParam || stores[0]?.id;
  const activeStore = stores.find((s) => s.id === storeId) ?? stores[0];

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["store-inventory", storeId],
    enabled: Boolean(storeId),
    queryFn: async () => {
      const res = await apiFetch<InventoryRow[]>(`/api/store/inventory?storeId=${storeId}`);
      return res.data ?? [];
    },
  });

  const updateInventory = async (variantId: string, patch: { quantity?: number; is_available: boolean }) => {
    const queryKey = ["store-inventory", storeId];
    await mutation.run(variantId, async () => {
      await qc.cancelQueries({ queryKey });
      const previous = qc.getQueryData<InventoryRow[]>(queryKey)?.find((row) => row.variant_id === variantId);
      qc.setQueryData<InventoryRow[]>(queryKey, (current) => current?.map((row) =>
        row.variant_id === variantId ? { ...row, ...patch } : row));
      return () => {
        if (previous) qc.setQueryData<InventoryRow[]>(queryKey, (current) => current?.map((row) =>
          row.variant_id === variantId ? previous : row));
      };
    }, () => apiFetch("/api/store/inventory", {
      method: "PATCH",
      body: JSON.stringify({ storeId, variantId, ...patch }),
    }));
  };

  const activeCount = rows.filter((r) => r.is_available && r.quantity > 0).length;
  const lowCount = rows.filter((r) => r.quantity <= 5).length;
  const pausedCount = rows.filter((r) => !r.is_available).length;

  const filtered = rows.filter((r) => {
    const matchesSearch =
      r.product_name.toLowerCase().includes(search.toLowerCase()) ||
      (r.sku ?? "").toLowerCase().includes(search.toLowerCase());
    if (!matchesSearch) return false;
    if (filter === "active") return r.is_available && r.quantity > 0;
    if (filter === "low") return r.quantity <= 5;
    if (filter === "paused") return !r.is_available;
    return true;
  });

  return (
    <div className="min-h-screen bg-[#FBF6EE] px-4 py-5 text-[#3A2418] sm:px-6">
      <div className="mx-auto max-w-5xl space-y-4">
        {/* Header Card */}
        <header className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#F0E4D2] bg-white p-4">
          <div className="flex items-center gap-3">
            <Link
              href="/store"
              aria-label="Back to Live Board"
              className="grid size-10 shrink-0 place-items-center rounded-full bg-[#FBE3CF] text-[#A8421A] transition-colors hover:bg-[#F5D3B6]"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#A8421A] text-white">
              <Boxes className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-lg font-extrabold leading-tight text-[#3A2418] sm:text-xl">
                Store Inventory
              </h1>
              <p className="text-xs text-[#8A7060]">
                {activeStore?.name ?? "Dark Store"} · Manage live stock &amp; availability
              </p>
            </div>
          </div>

          <div className="relative w-full min-w-0 sm:w-72">
            <Search className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-[#8A7060]" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Filter by product or SKU..."
              className="h-10 w-full rounded-full border border-[#EADBC6] bg-[#FBF6EE] pr-4 pl-9 text-sm text-[#3A2418] placeholder:text-[#8A7060] focus:border-[#A8421A] focus:outline-none"
            />
          </div>
        </header>

        {/* Summary Metrics */}
        <div className="grid grid-cols-3 gap-2.5 sm:gap-3">
          <div className="rounded-2xl border border-[#F0E4D2] bg-white p-3.5">
            <p className="text-[11px] font-bold uppercase tracking-wider text-[#8A7060]">Total SKUs</p>
            <p className="mt-1 text-xl font-extrabold tabular-nums text-[#3A2418]">{rows.length}</p>
          </div>
          <div className="rounded-2xl border border-[#F0E4D2] bg-white p-3.5">
            <p className="text-[11px] font-bold uppercase tracking-wider text-[#2E7D4F]">Active</p>
            <p className="mt-1 text-xl font-extrabold tabular-nums text-[#2E7D4F]">{activeCount}</p>
          </div>
          <div className="rounded-2xl border border-[#F0E4D2] bg-white p-3.5">
            <p className="text-[11px] font-bold uppercase tracking-wider text-[#A8421A]">Low Stock</p>
            <p className="mt-1 text-xl font-extrabold tabular-nums text-[#A8421A]">{lowCount}</p>
          </div>
        </div>

        {/* Filter Chips */}
        <div role="group" aria-label="Filter inventory" className="flex flex-wrap items-center gap-2">
          {(
            [
              { id: "all", label: `All (${rows.length})` },
              { id: "active", label: `In Stock (${activeCount})` },
              { id: "low", label: `Low Stock (${lowCount})` },
              { id: "paused", label: `Paused (${pausedCount})` },
            ] as const
          ).map((chip) => {
            const active = filter === chip.id;
            return (
              <button
                key={chip.id}
                type="button"
                aria-pressed={active}
                onClick={() => setFilter(chip.id)}
                className={`rounded-full px-4 py-1.5 text-xs font-semibold transition-colors ${
                  active
                    ? "bg-[#A8421A] text-white"
                    : "border border-[#EADBC6] bg-white text-[#3A2418] hover:bg-[#FBE3CF]/50"
                }`}
              >
                {chip.label}
              </button>
            );
          })}
        </div>

        {isLoading ? (
          <LayoutSkeleton shape="table" label="Loading inventory" />
        ) : filtered.length === 0 ? (
          <div className="rounded-2xl border border-[#F0E4D2] bg-white p-8 text-center space-y-2">
            <span className="mx-auto grid size-11 place-items-center rounded-full bg-[#FBE3CF] text-[#A8421A]">
              <Package className="h-5 w-5" />
            </span>
            <p className="text-sm font-bold text-[#3A2418]">No matching inventory items</p>
            <p className="text-xs text-[#8A7060]">Try clearing your search or switching the filter.</p>
          </div>
        ) : (
          <div className="layout-table overflow-hidden rounded-2xl border border-[#F0E4D2] bg-white">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-[#F0E4D2] bg-[#FFF8EE] text-[11px] font-extrabold uppercase tracking-wider text-[#8A7060]">
                <tr>
                  <th className="px-4 py-3">Product</th>
                  <th className="px-4 py-3">Pack / SKU</th>
                  <th className="px-4 py-3">Price</th>
                  <th className="px-4 py-3">Stock</th>
                  <th className="px-4 py-3">Reserved</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F0E4D2]">
                {filtered.map((r) => (
                  <tr key={r.variant_id} className="transition-colors hover:bg-[#FBF6EE]/70">
                    <td className="px-4 py-3 font-bold text-[#3A2418]">{r.product_name}</td>
                    <td className="px-4 py-3 text-xs text-[#8A7060]">
                      {r.label} · {r.sku || "—"}
                    </td>
                    <td className="px-4 py-3 font-bold tabular-nums text-[#3A2418]">
                      ₹{r.price_override ?? r.base_price}
                    </td>
                    <td className="px-4 py-3">
                      <div className="inline-flex items-center gap-1.5 rounded-xl border border-[#EADBC6] bg-[#FBF6EE] p-0.5">
                        <button
                          type="button"
                          aria-label={`Decrease stock for ${r.product_name}`}
                          disabled={mutation.pending.has(r.variant_id) || r.quantity <= 0}
                          onClick={() => updateInventory(r.variant_id, { quantity: r.quantity - 1, is_available: r.quantity > 1 })}
                          className="grid size-7 place-items-center rounded-lg text-[#A8421A] transition-colors hover:bg-[#FBE3CF] disabled:opacity-40"
                        >
                          <Minus className="h-3.5 w-3.5" />
                        </button>
                        <span className="w-8 text-center text-xs font-extrabold tabular-nums text-[#3A2418]">
                          {r.quantity}
                        </span>
                        <button
                          type="button"
                          aria-label={`Increase stock for ${r.product_name}`}
                          disabled={mutation.pending.has(r.variant_id)}
                          onClick={() => updateInventory(r.variant_id, { quantity: r.quantity + 1, is_available: true })}
                          className="grid size-7 place-items-center rounded-lg text-[#A8421A] transition-colors hover:bg-[#FBE3CF] disabled:opacity-40"
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs font-medium tabular-nums text-[#8A7060]">{r.reserved}</td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        disabled={mutation.pending.has(r.variant_id)}
                        onClick={() => updateInventory(r.variant_id, { is_available: !r.is_available })}
                        className={`rounded-full px-3 py-1 text-xs font-bold transition-colors ${
                          r.is_available
                            ? "bg-[#E3F0DA] text-[#2E7D4F] hover:bg-[#D2E8C4]"
                            : "bg-[#FEECEB] text-[#B42318] hover:bg-[#FAD7D5]"
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
    <Suspense fallback={<div className="min-h-screen bg-[#FBF6EE] p-8 text-center text-sm text-[#8A7060]">Loading...</div>}>
      <InventoryTable />
    </Suspense>
  );
}
