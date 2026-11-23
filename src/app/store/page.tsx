"use client";
import { LayoutSkeleton } from "@/components/ui/LayoutSkeleton";
import React, { useState } from "react";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Boxes, Check, PackageCheck, Store as StoreIcon, X } from "lucide-react";
import { useAuth } from "@/components/providers/AppProviders";
import { apiFetch } from "@/lib/api/client";

export default function StoreDashboardPage() {
  const { user, loading } = useAuth();
  const qc = useQueryClient();
  const [selectedStoreId, setSelectedStoreId] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  const { data: stores = [] } = useQuery({
    queryKey: ["store-me", user?.id],
    enabled: Boolean(user && ["store_manager", "admin", "super_admin"].includes(user.role)),
    queryFn: async () => {
      const res = await apiFetch<any[]>("/api/store/me");
      const list = res.data ?? [];
      if (list.length && !selectedStoreId) setSelectedStoreId(list[0].id);
      return list;
    },
  });

  const activeStore = stores.find((s) => s.id === selectedStoreId) ?? stores[0];
  const storeId = activeStore?.id;

  const { data: orders = [] } = useQuery({
    queryKey: ["store-orders", storeId],
    enabled: Boolean(storeId),
    refetchInterval: 5000,
    queryFn: async () => {
      const res = await apiFetch<any[]>(`/api/store/orders?storeId=${storeId}`);
      return res.data ?? [];
    },
  });

  if (loading) return <LayoutSkeleton shape="table" label="Loading store orders" />;
  if (!user || !["store_manager", "admin", "super_admin"].includes(user.role)) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 p-4">
        <StoreIcon className="w-10 h-10 text-blue-600" />
        <p className="font-bold">Store Manager Access Required</p>
        <Link href="/login" className="px-4 py-2 rounded-xl bg-green-600 text-white text-sm font-bold">
          Login
        </Link>
      </div>
    );
  }

  const runOrderAction = async (orderId: string, action: "accept" | "reject" | "start-picking" | "pack") => {
    setError(null);
    const res = await apiFetch(`/api/store/orders/${orderId}/action`, {
      method: "POST",
      body: JSON.stringify({ action }),
    });
    if (!res.ok) setError(res.error ?? "Action failed");
    qc.invalidateQueries({ queryKey: ["store-orders", storeId] });
  };

  const markItem = async (orderId: string, itemId: string, status: "picked" | "out_of_stock") => {
    await apiFetch(`/api/store/orders/${orderId}/items/${itemId}`, {
      method: "POST",
      body: JSON.stringify({ status }),
    });
    qc.invalidateQueries({ queryKey: ["store-orders", storeId] });
  };

  const toggleAccepting = async () => {
    if (!activeStore) return;
    await apiFetch("/api/store/status", {
      method: "POST",
      body: JSON.stringify({ storeId: activeStore.id, is_accepting_orders: !activeStore.is_accepting_orders }),
    });
    qc.invalidateQueries({ queryKey: ["store-me"] });
  };

  const columns = [
    { title: "New", statuses: ["confirmed", "placed"] },
    { title: "Picking", statuses: ["accepted_by_store", "picking"] },
    { title: "Packed (Waiting Rider)", statuses: ["packed", "rider_assigned", "rider_at_store"] },
    { title: "Handed Over", statuses: ["picked_up", "out_for_delivery", "arrived", "delivered"] },
  ];

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white border-b px-5 pt-[calc(.75rem+env(safe-area-inset-top,0px))] pb-3 flex flex-wrap items-center justify-between gap-3 sticky top-0 z-20">
        <div className="store-heading flex max-w-full items-center gap-x-3 gap-y-2">
          <span className="media-frame block shrink-0 size-8 rounded-lg shadow-2xs">
            <img src="/logo.png" alt="TTM" width={32} height={32} className="media-content media-content--contain" />
          </span>
          <span className="layout-wrap font-black text-sm tracking-tight text-[#13193b]">
            TIKK TIKK MART <span className="text-[#f66002]">Dark Store Ops</span>
          </span>
          {stores.length > 0 && (
            <select
              value={storeId}
              onChange={(e) => setSelectedStoreId(e.target.value)}
              aria-label="Store location"
              className="min-w-0 w-full sm:w-auto sm:max-w-64 border border-gray-200 rounded-xl px-3 py-1.5 text-xs font-bold bg-gray-50 focus:border-[#f66002] focus:outline-none"
            >
              {stores.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.code})
                </option>
              ))}
            </select>
          )}
        </div>

        <div className="flex max-w-full flex-wrap items-center gap-3">
          {activeStore && (
            <button
              type="button"
              onClick={toggleAccepting}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold text-white transition-colors ${
                activeStore.is_accepting_orders ? "bg-[#f66002] hover:bg-[#dd5500]" : "bg-red-600 hover:bg-red-700"
              }`}
            >
              {activeStore.is_accepting_orders ? "Store Open" : "Orders Paused"}
            </button>
          )}
          <Link
            href={storeId ? `/store/inventory?storeId=${storeId}` : "/store/inventory"}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border bg-white text-xs font-bold hover:bg-gray-50 text-gray-700"
          >
            <Boxes className="w-4 h-4 text-[#f66002]" /> Inventory
          </Link>
          <Link href="/" className="text-xs font-semibold text-gray-500 hover:text-gray-900">
            Customer App
          </Link>
        </div>
      </header>

      <main className="p-5 space-y-4">
        {error && <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700">{error}</div>}

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {columns.map((col) => {
            const colOrders = orders.filter((o) => col.statuses.includes(o.status));
            return (
              <section key={col.title} className="layout-wrap bg-gray-50 rounded-2xl border p-3 space-y-3 min-h-[420px]">
                <div className="flex items-center justify-between px-1">
                  <h2 className="font-extrabold text-sm text-gray-800">{col.title}</h2>
                  <span className="text-xs font-bold bg-white border px-2 py-0.5 rounded-full">{colOrders.length}</span>
                </div>

                {colOrders.map((o) => (
                  <div key={o.id} className="bg-white rounded-xl border p-3.5 space-y-3 shadow-xs">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-extrabold text-sm">#{o.order_no}</p>
                        <p className="text-[11px] text-gray-500">
                          {o.customer?.name || "Customer"} · ₹{o.grand_total} ({o.payment_method.toUpperCase()})
                        </p>
                      </div>
                      {o.pickup_code && (
                        <div className="bg-blue-50 border border-blue-200 px-2 py-1 rounded-lg text-center">
                          <p className="text-[9px] font-bold text-blue-700 uppercase">Pickup</p>
                          <p className="text-xs font-black tracking-widest">{o.pickup_code}</p>
                        </div>
                      )}
                    </div>

                    <div className="space-y-1.5 border-t pt-2">
                      {(o.items ?? []).map((it: any) => (
                        <div key={it.id} className="flex items-center justify-between text-xs gap-2">
                          <span className={it.status === "out_of_stock" ? "line-through text-red-500" : ""}>
                            {it.quantity}× {it.name_snapshot} ({it.label_snapshot})
                          </span>
                          {o.status === "picking" && it.status === "pending" && (
                            <div className="flex gap-1 shrink-0">
                              <button
                                type="button"
                                onClick={() => markItem(o.id, it.id, "picked")}
                                className="p-1 rounded bg-green-100 text-green-700"
                                title="Mark Picked"
                              >
                                <Check className="w-3 h-3" />
                              </button>
                              <button
                                type="button"
                                onClick={() => markItem(o.id, it.id, "out_of_stock")}
                                className="p-1 rounded bg-red-100 text-red-700"
                                title="Out of Stock"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          )}
                          {it.status === "picked" && <span className="text-[10px] font-bold text-green-600">Picked</span>}
                        </div>
                      ))}
                    </div>

                    <div className="pt-2 border-t flex gap-2">
                      {(o.status === "confirmed" || o.status === "placed") && (
                        <>
                          <button
                            type="button"
                            onClick={() => runOrderAction(o.id, "accept")}
                            className="flex-1 py-1.5 rounded-lg bg-green-600 text-white text-xs font-bold"
                          >
                            Accept
                          </button>
                          <button
                            type="button"
                            onClick={() => runOrderAction(o.id, "reject")}
                            className="px-3 py-1.5 rounded-lg border text-red-600 text-xs font-bold"
                          >
                            Reject
                          </button>
                        </>
                      )}
                      {o.status === "accepted_by_store" && (
                        <button
                          type="button"
                          onClick={() => runOrderAction(o.id, "start-picking")}
                          className="w-full py-1.5 rounded-lg bg-blue-600 text-white text-xs font-bold"
                        >
                          Start Picking
                        </button>
                      )}
                      {o.status === "picking" && (
                        <button
                          type="button"
                          onClick={() => runOrderAction(o.id, "pack")}
                          className="w-full py-1.5 rounded-lg bg-green-600 text-white text-xs font-bold inline-flex items-center justify-center gap-1"
                        >
                          <PackageCheck className="w-3.5 h-3.5" /> Mark Packed & Dispatch Rider
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </section>
            );
          })}
        </div>
      </main>
    </div>
  );
}

