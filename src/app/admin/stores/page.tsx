"use client";
import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api/client";
import { LocationPicker } from "@/components/maps/LocationPicker";

export default function AdminStoresPage() {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    name: "",
    code: "",
    address: "",
    phone: "",
    lat: 22.5726,
    lng: 88.3639,
    service_radius_m: 3000,
    prep_time_min: 5,
    manager_email: "",
  });

  const { data: stores = [] } = useQuery({
    queryKey: ["admin-stores"],
    queryFn: async () => (await apiFetch<any[]>("/api/admin/stores")).data ?? [],
  });

  const createStore = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await apiFetch("/api/admin/stores", {
      method: "POST",
      body: JSON.stringify({
        ...form,
        manager_email: form.manager_email || undefined,
      }),
    });
    if (res.ok) {
      setForm((f) => ({ ...f, name: "", code: "", address: "", manager_email: "" }));
      qc.invalidateQueries({ queryKey: ["admin-stores"] });
    }
  };

  const toggleActive = async (id: string, is_active: boolean) => {
    await apiFetch("/api/admin/stores", {
      method: "PATCH",
      body: JSON.stringify({ id, is_active: !is_active }),
    });
    qc.invalidateQueries({ queryKey: ["admin-stores"] });
  };

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-extrabold">Dark Stores & Service Zones</h1>

      <form onSubmit={createStore} className="bg-white rounded-2xl border p-5 space-y-4 max-w-2xl">
        <h2 className="font-bold text-sm">Create Dark Store</h2>
        <LocationPicker
          initialLat={form.lat}
          initialLng={form.lng}
          onSelect={(c) => setForm((f) => ({ ...f, lat: c.lat, lng: c.lng, address: f.address || c.address }))}
        />
        <div className="grid grid-cols-2 gap-2">
          <input
            required
            placeholder="Store Name"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            className="border rounded-xl px-3 py-2 text-sm"
          />
          <input
            required
            placeholder="Store Code (e.g. KOL-02)"
            value={form.code}
            onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))}
            className="border rounded-xl px-3 py-2 text-sm"
          />
        </div>
        <input
          placeholder="Address"
          value={form.address}
          onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
          className="w-full border rounded-xl px-3 py-2 text-sm"
        />
        <div className="grid grid-cols-3 gap-2">
          <input
            type="number"
            placeholder="Radius (m)"
            value={form.service_radius_m}
            onChange={(e) => setForm((f) => ({ ...f, service_radius_m: Number(e.target.value) }))}
            className="border rounded-xl px-3 py-2 text-sm"
          />
          <input
            type="number"
            placeholder="Prep min"
            value={form.prep_time_min}
            onChange={(e) => setForm((f) => ({ ...f, prep_time_min: Number(e.target.value) }))}
            className="border rounded-xl px-3 py-2 text-sm"
          />
          <input
            placeholder="Manager Email (optional)"
            value={form.manager_email}
            onChange={(e) => setForm((f) => ({ ...f, manager_email: e.target.value }))}
            className="border rounded-xl px-3 py-2 text-sm"
          />
        </div>
        <button type="submit" className="px-4 py-2 rounded-xl bg-green-600 text-white text-xs font-bold">
          Create Store
        </button>
      </form>

      <div className="bg-white rounded-2xl border p-4 space-y-2">
        <h2 className="font-bold text-sm">Stores ({stores.length})</h2>
        <div className="divide-y">
          {stores.map((s: any) => (
            <div key={s.id} className="py-3 flex items-center justify-between text-xs">
              <div>
                <p className="font-bold text-sm">
                  {s.name} <span className="text-gray-400">({s.code})</span>
                </p>
                <p className="text-gray-500">
                  {s.address} · Radius: {s.service_radius_m}m · Prep: {s.prep_time_min}m
                </p>
              </div>
              <button
                type="button"
                onClick={() => toggleActive(s.id, s.is_active)}
                className={`px-3 py-1 rounded-full font-bold ${
                  s.is_active ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"
                }`}
              >
                {s.is_active ? "Active" : "Disabled"}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

