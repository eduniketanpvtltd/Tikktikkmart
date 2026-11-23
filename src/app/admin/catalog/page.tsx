"use client";
import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Trash2 } from "lucide-react";
import { deferDelete } from "@/lib/ui/deferDelete";
import { useUndoKeys } from "@/components/ui/UndoToast";
import { apiFetch } from "@/lib/api/client";

export default function AdminCatalogPage() {
  const qc = useQueryClient();
  const undoKeys = useUndoKeys();
  const [catForm, setCatForm] = useState({ name: "", slug: "", image_url: "" });
  const [prodForm, setProdForm] = useState({
    category_id: "",
    name: "",
    slug: "",
    brand: "",
    image_url: "",
    variant_label: "500 g",
    mrp: 100,
    base_price: 90,
  });

  const { data: categories = [] } = useQuery({
    queryKey: ["admin-categories"],
    queryFn: async () => (await apiFetch<any[]>("/api/admin/categories")).data ?? [],
  });

  const { data: products = [] } = useQuery({
    queryKey: ["admin-products"],
    queryFn: async () => (await apiFetch<any[]>("/api/admin/products")).data ?? [],
  });

  const createCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await apiFetch("/api/admin/categories", {
      method: "POST",
      body: JSON.stringify({
        name: catForm.name,
        slug: catForm.slug || catForm.name.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
        image_url: catForm.image_url || null,
      }),
    });
    if (res.ok) {
      setCatForm({ name: "", slug: "", image_url: "" });
      qc.invalidateQueries({ queryKey: ["admin-categories"] });
    }
  };

  const createProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await apiFetch("/api/admin/products", {
      method: "POST",
      body: JSON.stringify({
        category_id: prodForm.category_id || null,
        name: prodForm.name,
        slug: prodForm.slug || prodForm.name.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
        brand: prodForm.brand,
        images: prodForm.image_url ? [prodForm.image_url] : [],
        variant_label: prodForm.variant_label,
        mrp: Number(prodForm.mrp),
        base_price: Number(prodForm.base_price),
      }),
    });
    if (res.ok) {
      setProdForm((f) => ({ ...f, name: "", slug: "", brand: "", image_url: "" }));
      qc.invalidateQueries({ queryKey: ["admin-products"] });
    }
  };

  const deleteCat = (id: string) => {
    deferDelete<typeof categories>(qc, ["admin-categories"], `category:${id}`,
      `/api/admin/categories?id=${encodeURIComponent(id)}`, "Category", (items) => items.filter((item) => item.id !== id));
  };

  const deleteProd = (id: string) => {
    deferDelete<typeof products>(qc, ["admin-products"], `product:${id}`,
      `/api/admin/products?id=${encodeURIComponent(id)}`, "Product", (items) => items.filter((item) => item.id !== id));
  };

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-extrabold">Catalog Management</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <form onSubmit={createCategory} className="bg-white rounded-2xl border p-4 space-y-3">
          <h2 className="font-bold text-sm">Add Category</h2>
          <input
            required
            placeholder="Category Name"
            value={catForm.name}
            onChange={(e) => setCatForm((f) => ({ ...f, name: e.target.value }))}
            className="w-full border rounded-xl px-3 py-2 text-sm"
          />
          <input
            placeholder="Slug (auto if blank)"
            value={catForm.slug}
            onChange={(e) => setCatForm((f) => ({ ...f, slug: e.target.value }))}
            className="w-full border rounded-xl px-3 py-2 text-sm"
          />
          <input
            placeholder="Image URL"
            value={catForm.image_url}
            onChange={(e) => setCatForm((f) => ({ ...f, image_url: e.target.value }))}
            className="w-full border rounded-xl px-3 py-2 text-sm"
          />
          <button type="submit" className="px-4 py-2 rounded-xl bg-green-600 text-white text-xs font-bold">
            Create Category
          </button>
        </form>

        <form onSubmit={createProduct} className="bg-white rounded-2xl border p-4 space-y-3">
          <h2 className="font-bold text-sm">Add Product + Default Variant</h2>
          <select
            value={prodForm.category_id}
            onChange={(e) => setProdForm((f) => ({ ...f, category_id: e.target.value }))}
            className="w-full border rounded-xl px-3 py-2 text-sm bg-white"
          >
            <option value="">Select Category</option>
            {categories.filter((c) => !undoKeys.has(`category:${c.id}`)).map((c: any) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <div className="grid grid-cols-2 gap-2">
            <input
              required
              placeholder="Product Name"
              value={prodForm.name}
              onChange={(e) => setProdForm((f) => ({ ...f, name: e.target.value }))}
              className="border rounded-xl px-3 py-2 text-sm"
            />
            <input
              placeholder="Brand"
              value={prodForm.brand}
              onChange={(e) => setProdForm((f) => ({ ...f, brand: e.target.value }))}
              className="border rounded-xl px-3 py-2 text-sm"
            />
          </div>
          <input
            placeholder="Image URL"
            value={prodForm.image_url}
            onChange={(e) => setProdForm((f) => ({ ...f, image_url: e.target.value }))}
            className="w-full border rounded-xl px-3 py-2 text-sm"
          />
          <div className="grid grid-cols-3 gap-2">
            <input
              required
              placeholder="Pack (e.g. 500 g)"
              value={prodForm.variant_label}
              onChange={(e) => setProdForm((f) => ({ ...f, variant_label: e.target.value }))}
              className="border rounded-xl px-3 py-2 text-sm"
            />
            <input
              type="number"
              required
              placeholder="MRP"
              value={prodForm.mrp}
              onChange={(e) => setProdForm((f) => ({ ...f, mrp: Number(e.target.value) }))}
              className="border rounded-xl px-3 py-2 text-sm"
            />
            <input
              type="number"
              required
              placeholder="Selling Price"
              value={prodForm.base_price}
              onChange={(e) => setProdForm((f) => ({ ...f, base_price: Number(e.target.value) }))}
              className="border rounded-xl px-3 py-2 text-sm"
            />
          </div>
          <button type="submit" className="px-4 py-2 rounded-xl bg-green-600 text-white text-xs font-bold">
            Create Product
          </button>
        </form>
      </div>

      <div className="bg-white rounded-2xl border p-4 space-y-2">
        <h2 className="font-bold text-sm">Categories ({categories.length})</h2>
        <div className="flex flex-wrap gap-2">
          {categories.filter((c) => !undoKeys.has(`category:${c.id}`)).map((c: any) => (
            <span key={c.id} className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-gray-100 text-xs font-bold">
              {c.name}
              <button type="button" onClick={() => deleteCat(c.id)} aria-label={`Remove ${c.name}`} className="grid size-11 place-items-center text-red-500">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </span>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-2xl border p-4 space-y-2">
        <h2 className="font-bold text-sm">Products ({products.length})</h2>
        <div className="divide-y">
          {products.filter((p) => !undoKeys.has(`product:${p.id}`)).map((p: any) => (
            <div key={p.id} className="py-2 flex items-center justify-between text-xs">
              <div>
                <p className="font-bold">{p.name}</p>
                <p className="text-gray-500">
                  {p.category?.name ?? "Uncategorized"} ·{" "}
                  {(p.variants ?? []).map((v: any) => `${v.label}: ₹${v.base_price}`).join(", ")}
                </p>
              </div>
              <button type="button" onClick={() => deleteProd(p.id)} aria-label={`Remove ${p.name}`} className="grid size-11 place-items-center text-red-600">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

