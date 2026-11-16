"use client";
import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Trash2 } from "lucide-react";
import { apiFetch } from "@/lib/api/client";

export default function AdminMarketingPage() {
  const qc = useQueryClient();
  const [coupon, setCoupon] = useState({ code: "", description: "", type: "flat", value: 50, min_order: 199 });
  const [bannerUrl, setBannerUrl] = useState("");

  const { data } = useQuery({
    queryKey: ["admin-marketing"],
    queryFn: async () => (await apiFetch<any>("/api/admin/marketing")).data,
  });

  const addCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await apiFetch("/api/admin/marketing", {
      method: "POST",
      body: JSON.stringify({ kind: "coupon", ...coupon, value: Number(coupon.value), min_order: Number(coupon.min_order) }),
    });
    if (res.ok) {
      setCoupon({ code: "", description: "", type: "flat", value: 50, min_order: 199 });
      qc.invalidateQueries({ queryKey: ["admin-marketing"] });
    }
  };

  const addBanner = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await apiFetch("/api/admin/marketing", {
      method: "POST",
      body: JSON.stringify({ kind: "banner", image_url: bannerUrl }),
    });
    if (res.ok) {
      setBannerUrl("");
      qc.invalidateQueries({ queryKey: ["admin-marketing"] });
    }
  };

  const remove = async (kind: "coupon" | "banner", id: string) => {
    await apiFetch(`/api/admin/marketing?kind=${kind}&id=${id}`, { method: "DELETE" });
    qc.invalidateQueries({ queryKey: ["admin-marketing"] });
  };

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-extrabold">Coupons & Banners</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <form onSubmit={addCoupon} className="bg-white rounded-2xl border p-4 space-y-3">
          <h2 className="font-bold text-sm">Create Coupon</h2>
          <input
            required
            placeholder="Code (e.g. SAVE50)"
            value={coupon.code}
            onChange={(e) => setCoupon((c) => ({ ...c, code: e.target.value.toUpperCase() }))}
            className="w-full border rounded-xl px-3 py-2 text-sm uppercase"
          />
          <input
            placeholder="Description"
            value={coupon.description}
            onChange={(e) => setCoupon((c) => ({ ...c, description: e.target.value }))}
            className="w-full border rounded-xl px-3 py-2 text-sm"
          />
          <div className="grid grid-cols-3 gap-2">
            <select
              value={coupon.type}
              onChange={(e) => setCoupon((c) => ({ ...c, type: e.target.value }))}
              className="border rounded-xl px-3 py-2 text-sm bg-white"
            >
              <option value="flat">Flat ₹</option>
              <option value="percent">Percent %</option>
            </select>
            <input
              type="number"
              placeholder="Value"
              value={coupon.value}
              onChange={(e) => setCoupon((c) => ({ ...c, value: Number(e.target.value) }))}
              className="border rounded-xl px-3 py-2 text-sm"
            />
            <input
              type="number"
              placeholder="Min Order"
              value={coupon.min_order}
              onChange={(e) => setCoupon((c) => ({ ...c, min_order: Number(e.target.value) }))}
              className="border rounded-xl px-3 py-2 text-sm"
            />
          </div>
          <button type="submit" className="px-4 py-2 rounded-xl bg-green-600 text-white text-xs font-bold">
            Add Coupon
          </button>
        </form>

        <form onSubmit={addBanner} className="bg-white rounded-2xl border p-4 space-y-3">
          <h2 className="font-bold text-sm">Add Home Banner</h2>
          <input
            required
            type="url"
            placeholder="Banner Image URL"
            value={bannerUrl}
            onChange={(e) => setBannerUrl(e.target.value)}
            className="w-full border rounded-xl px-3 py-2 text-sm"
          />
          <button type="submit" className="px-4 py-2 rounded-xl bg-green-600 text-white text-xs font-bold">
            Add Banner
          </button>
        </form>
      </div>

      <div className="bg-white rounded-2xl border p-4 space-y-2">
        <h2 className="font-bold text-sm">Active Coupons</h2>
        <div className="divide-y">
          {(data?.coupons ?? []).map((c: any) => (
            <div key={c.id} className="py-2 flex items-center justify-between text-xs">
              <div>
                <span className="font-extrabold">{c.code}</span> · {c.type === "flat" ? `₹${c.value}` : `${c.value}%`} off (min ₹{c.min_order})
              </div>
              <button type="button" onClick={() => remove("coupon", c.id)} className="text-red-600">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-2xl border p-4 space-y-2">
        <h2 className="font-bold text-sm">Banners</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {(data?.banners ?? []).map((b: any) => (
            <div key={b.id} className="relative rounded-xl overflow-hidden border h-28">
              <img src={b.image_url} alt="Banner" className="w-full h-full object-cover" />
              <button
                type="button"
                onClick={() => remove("banner", b.id)}
                className="absolute top-2 right-2 p-1.5 rounded-lg bg-white/90 text-red-600"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

