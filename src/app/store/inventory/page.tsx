"use client";

import React, { Suspense, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  Boxes,
  CheckCircle2,
  ClipboardList,
  Clock3,
  Download,
  FileText,
  History,
  IndianRupee,
  LayoutDashboard,
  MapPin,
  Package,
  Pencil,
  Plus,
  Search,
  Send,
  ShoppingCart,
  SlidersHorizontal,
  Truck,
  Warehouse,
  X,
  XCircle,
} from "lucide-react";
import { apiFetch } from "@/lib/api/client";
import { useAuth } from "@/components/providers/AppProviders";

type PortalTab = "dash" | "orders" | "inv" | "rs" | "log";
type StockStatus = "in" | "lo" | "ou";
type StatusFilter = "all" | StockStatus;
type SortKey = "name" | "stock" | "price" | "value" | "exp";
type PickStage = "new" | "packing" | "ready" | "handed";

interface OrderPickItem {
  id: string;
  name: string;
  qty: number;
  rack: string;
  picked: boolean;
}

interface StoreOrderCard {
  id: string;
  orderNo: string;
  customer: string;
  payment: "COD" | "Paid";
  total: number;
  stage: PickStage;
  pickupPin: string;
  slaSec: number;
  items: OrderPickItem[];
}

interface PortalItem {
  id: string;
  sku: string;
  name: string;
  brand: string;
  cat: string;
  mrp: number;
  price: number;
  tint: string;
  stock: number;
  re: number;
  exp: number | null;
  liveVariantId?: string;
}

interface PurchaseOrder {
  id: string;
  items: { id: string; name: string; qty: number }[];
  total: number;
  eta: string;
  done: boolean;
}

interface ActivityEvent {
  id: string;
  type: "sale" | "restock" | "adjust" | "add" | "edit" | "delete" | "clearance" | "po";
  txt: string;
  delta: number;
  time: string;
}

interface StoreInfo {
  id: string;
  name?: string;
}

interface ApiInventoryRow {
  variant_id: string;
  product_name: string;
  brand?: string;
  label: string;
  sku?: string | null;
  mrp?: number;
  base_price: number;
  price_override?: number | null;
  quantity: number;
}

const CATEGORIES = ["Produce", "Dairy and eggs", "Staples", "Snacks", "Cold drinks", "Personal care"] as const;
const SUPPLIERS: Record<string, string> = {
  Produce: "Freshbury Farms",
  "Dairy and eggs": "Amul Depot",
  Staples: "Metro Wholesale",
  Snacks: "Metro Wholesale",
  "Cold drinks": "Bevco Distributors",
  "Personal care": "HUL Distribution",
};

const SEED_ITEMS: PortalItem[] = [
  ["Red onion (Pyaz)", "Freshbury", "Produce", 75, 66, "#F7DCE0", 48, 20, 6],
  ["Farm eggs", "Farm Fresh", "Dairy and eggs", 66, 54, "#FFF0DA", 14, 20, 5],
  ["Banana", "Freshbury", "Produce", 55, 42, "#FFF3C9", 9, 15, 2],
  ["Potato", "Freshbury", "Produce", 35, 24, "#F3E6CF", 60, 25, 12],
  ["Toned milk", "Amul", "Dairy and eggs", 28, 27, "#E8F0FA", 6, 30, 1],
  ["Brown bread", "Britannia", "Staples", 50, 45, "#F3E6CF", 22, 12, 3],
  ["Tomato", "Freshbury", "Produce", 40, 29, "#FDE0D6", 0, 20, 4],
  ["Oreo", "Cadbury", "Snacks", 35, 32, "#EDE3F5", 70, 20, null],
  ["Atta 5 kg", "Aashirvaad", "Staples", 295, 249, "#F3EBD6", 31, 10, null],
  ["Coca-Cola 750 ml", "Coca-Cola", "Cold drinks", 45, 40, "#FDE0D6", 12, 24, null],
  ["Red Bull", "Red Bull", "Cold drinks", 125, 115, "#E3EEFF", 40, 15, null],
  ["Maggi 4-pack", "Nestlé", "Snacks", 60, 56, "#FFE9C7", 3, 20, null],
  ["Dove soap", "Dove", "Personal care", 70, 65, "#EDE3F5", 26, 10, null],
  ["Vivel soap", "Vivel", "Personal care", 230, 180, "#FDE3D6", 18, 8, null],
  ["Coriander", "Freshbury", "Produce", 20, 15, "#E3F0DA", 7, 15, 2],
  ["Capsicum", "Freshbury", "Produce", 45, 34, "#E3F0DA", 25, 10, 5],
  ["Cucumber", "Freshbury", "Produce", 30, 22, "#E3F0DA", 30, 12, 6],
  ["Carrot", "Freshbury", "Produce", 40, 28, "#FFE3CC", 0, 15, 7],
  ["Spinach", "Freshbury", "Produce", 25, 18, "#E3F0DA", 16, 15, 2],
  ["Lemon", "Freshbury", "Produce", 30, 24, "#FFF3C9", 44, 15, 9],
  ["Ginger", "Freshbury", "Produce", 45, 32, "#F3E6CF", 20, 8, 14],
  ["Garlic", "Freshbury", "Produce", 60, 48, "#F3EBD6", 33, 10, 20],
].map((r, i) => ({
  id: `seed-${i}`,
  sku: `TT-${1000 + i}`,
  name: r[0] as string,
  brand: r[1] as string,
  cat: r[2] as string,
  mrp: r[3] as number,
  price: r[4] as number,
  tint: r[5] as string,
  stock: r[6] as number,
  re: r[7] as number,
  exp: r[8] as number | null,
}));

const INITIAL_LOG: ActivityEvent[] = [
  { id: "l1", type: "sale", txt: "Sold 2 · Toned milk (app order #5012)", delta: -2, time: "12:54" },
  { id: "l2", type: "restock", txt: "Received Farm eggs (PO-2040)", delta: 24, time: "12:53" },
  { id: "l3", type: "adjust", txt: "Manual adjustment: Banana", delta: -3, time: "12:52" },
];

const SEED_ORDERS: StoreOrderCard[] = [
  {
    id: "ord-5018",
    orderNo: "5018",
    customer: "Rohan Sharma",
    payment: "Paid",
    total: 245,
    stage: "new",
    pickupPin: "4821",
    slaSec: 118,
    items: [
      { id: "i1", name: "Red onion (Pyaz) · 1 kg", qty: 1, rack: "A1-02", picked: false },
      { id: "i2", name: "Toned milk · 500 ml", qty: 2, rack: "C2-04", picked: false },
      { id: "i3", name: "Brown bread · 400 g", qty: 1, rack: "B1-06", picked: false },
    ],
  },
  {
    id: "ord-5017",
    orderNo: "5017",
    customer: "Ananya Sen",
    payment: "COD",
    total: 312,
    stage: "packing",
    pickupPin: "7390",
    slaSec: 74,
    items: [
      { id: "i4", name: "Farm eggs · 6 pcs", qty: 2, rack: "C1-01", picked: true },
      { id: "i5", name: "Oreo · 120 g", qty: 3, rack: "D3-08", picked: false },
    ],
  },
  {
    id: "ord-5016",
    orderNo: "5016",
    customer: "Vikram Das",
    payment: "Paid",
    total: 155,
    stage: "ready",
    pickupPin: "1945",
    slaSec: 0,
    items: [
      { id: "i6", name: "Coca-Cola 750 ml", qty: 1, rack: "E1-03", picked: true },
      { id: "i7", name: "Red Bull · 250 ml", qty: 1, rack: "E1-05", picked: true },
    ],
  },
];

function getStatus(p: PortalItem): StockStatus {
  return p.stock <= 0 ? "ou" : p.stock <= p.re ? "lo" : "in";
}

function formatInr(n: number) {
  return `₹${Math.round(n).toLocaleString("en-IN")}`;
}

function nowTime() {
  return new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
}

function TikkStockPortal() {
  const sp = useSearchParams();
  const storeIdParam = sp.get("storeId");
  const { user } = useAuth();
  const qc = useQueryClient();

  const [tab, setTab] = useState<PortalTab>("dash");
  const [items, setItems] = useState<PortalItem[]>(SEED_ITEMS);
  const [query, setQuery] = useState("");
  const [catFilter, setCatFilter] = useState<string>("All");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortDir, setSortDir] = useState<1 | -1>(1);
  const [liveSales, setLiveSales] = useState(true);
  const [acceptingOrders, setAcceptingOrders] = useState(true);
  const [prepTimeMin, setPrepTimeMin] = useState(4);
  const [storeOrders, setStoreOrders] = useState<StoreOrderCard[]>(SEED_ORDERS);
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [poNumber, setPoNumber] = useState(2041);
  const [selectedRestock, setSelectedRestock] = useState<Record<string, boolean>>({});
  const [restockQty, setRestockQty] = useState<Record<string, number>>({});
  const [clearanceStarted, setClearanceStarted] = useState<Record<string, boolean>>({});
  const [events, setEvents] = useState<ActivityEvent[]>(INITIAL_LOG);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const toastTimer = useRef<number | null>(null);

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteArmed, setDeleteArmed] = useState(false);
  const [formError, setFormError] = useState("");
  const [form, setForm] = useState({
    name: "",
    brand: "",
    cat: "Produce",
    price: "",
    mrp: "",
    stock: "0",
    re: "10",
    exp: "",
  });

  const { data: stores = [] } = useQuery({
    queryKey: ["store-me-portal", user?.id],
    enabled: Boolean(user),
    queryFn: async () => {
      const res = await apiFetch<StoreInfo[]>("/api/store/me");
      return res.data ?? [];
    },
  });

  const storeId = storeIdParam || stores[0]?.id;
  const activeStore = stores.find((s) => s.id === storeId) ?? stores[0];

  const { data: liveRows } = useQuery({
    queryKey: ["store-inventory-portal", storeId],
    enabled: Boolean(storeId),
    queryFn: async () => {
      const res = await apiFetch<ApiInventoryRow[]>(`/api/store/inventory?storeId=${storeId}`);
      return res.data ?? [];
    },
  });

  useEffect(() => {
    if (!liveRows || liveRows.length === 0) return;
    setItems(
      liveRows.map((r, i) => ({
        id: r.variant_id,
        liveVariantId: r.variant_id,
        sku: r.sku || `TT-${1000 + i}`,
        name: r.product_name,
        brand: r.brand || "Tikk Mart",
        cat: CATEGORIES[i % CATEGORIES.length],
        mrp: r.mrp ?? r.base_price,
        price: r.price_override ?? r.base_price,
        tint: ["#F7DCE0", "#FFF0DA", "#F3E6CF", "#E8F0FA", "#EDE3F5", "#E3F0DA"][i % 6],
        stock: r.quantity,
        re: 15,
        exp: i % 3 === 0 ? (i % 7) + 1 : null,
      })),
    );
  }, [liveRows]);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToastMsg(null), 2200);
  };

  const pushLog = (type: ActivityEvent["type"], txt: string, delta: number) => {
    setEvents((prev) => [{ id: `${Date.now()}-${Math.random()}`, type, txt, delta, time: nowTime() }, ...prev].slice(0, 60));
  };

  const syncLiveStock = async (item: PortalItem, nextStock: number, reason: string) => {
    if (!storeId || !item.liveVariantId) return;
    await apiFetch("/api/store/inventory", {
      method: "PATCH",
      body: JSON.stringify({
        storeId,
        variantId: item.liveVariantId,
        quantity: nextStock,
        is_available: nextStock > 0,
        reason,
      }),
    }).catch(() => {});
    void qc.invalidateQueries({ queryKey: ["store-inventory-portal", storeId] });
  };

  // Simulated live sales ticker
  const { data: liveOrders } = useQuery({
    queryKey: ["store-orders-portal", storeId],
    enabled: Boolean(storeId),
    queryFn: async () => {
      const res = await apiFetch<Array<{
        id: string;
        order_no?: number;
        total?: number;
        payment_method?: string;
        status?: string;
        pickup_pin?: string;
        customer?: { name?: string };
        items?: Array<{ id: string; name?: string; quantity?: number }>;
      }>>(`/api/store/orders?storeId=${storeId}`);
      return res.data ?? [];
    },
  });

  useEffect(() => {
    if (!liveOrders || liveOrders.length === 0) return;
    setStoreOrders(
      liveOrders.slice(0, 12).map((o, idx) => ({
        id: o.id,
        orderNo: String(o.order_no ?? 5100 + idx),
        customer: o.customer?.name || "Customer",
        payment: o.payment_method === "cod" ? "COD" : "Paid",
        total: Number(o.total ?? 0),
        stage: o.status === "ready_for_pickup" ? "ready" : o.status === "packing" ? "packing" : o.status === "delivered" || o.status === "picked_up" ? "handed" : "new",
        pickupPin: o.pickup_pin || String(1000 + ((idx * 137) % 9000)),
        slaSec: 120,
        items: (o.items ?? []).map((it, j) => ({
          id: it.id,
          name: it.name || "Item",
          qty: it.quantity ?? 1,
          rack: `${["A", "B", "C", "D"][j % 4]}${(j % 3) + 1}-0${(j % 8) + 1}`,
          picked: o.status === "ready_for_pickup" || o.status === "picked_up",
        })),
      })),
    );
  }, [liveOrders]);

  // Order SLA countdown
  useEffect(() => {
    const timer = window.setInterval(() => {
      setStoreOrders((prev) =>
        prev.map((o) => (o.stage === "new" || o.stage === "packing" ? { ...o, slaSec: Math.max(0, o.slaSec - 1) } : o)),
      );
    }, 1000);
    return () => window.clearInterval(timer);
  }, []);

  const toggleAcceptingOrders = async () => {
    const next = !acceptingOrders;
    setAcceptingOrders(next);
    showToast(next ? "Store accepting new orders" : "Store paused for new orders");
    if (storeId) {
      await apiFetch("/api/store/status", {
        method: "POST",
        body: JSON.stringify({ storeId, is_accepting_orders: next }),
      }).catch(() => {});
    }
  };

  const updatePrepTime = async (mins: number) => {
    setPrepTimeMin(mins);
    showToast(`Prep ETA updated to ${mins} min`);
    if (storeId) {
      await apiFetch("/api/store/status", {
        method: "POST",
        body: JSON.stringify({ storeId, prep_time_min: mins }),
      }).catch(() => {});
    }
  };

  const togglePickItem = (orderId: string, itemId: string) => {
    setStoreOrders((prev) =>
      prev.map((o) =>
        o.id === orderId
          ? { ...o, items: o.items.map((it) => (it.id === itemId ? { ...it, picked: !it.picked } : it)) }
          : o,
      ),
    );
  };

  const advanceOrderStage = (orderId: string, nextStage: PickStage) => {
    const target = storeOrders.find((o) => o.id === orderId);
    setStoreOrders((prev) =>
      prev.map((o) =>
        o.id === orderId
          ? {
              ...o,
              stage: nextStage,
              items: nextStage === "ready" || nextStage === "handed" ? o.items.map((it) => ({ ...it, picked: true })) : o.items,
            }
          : o,
      ),
    );
    if (target) {
      const msg =
        nextStage === "packing"
          ? `Started packing order #${target.orderNo}`
          : nextStage === "ready"
            ? `Order #${target.orderNo} packed · PIN ${target.pickupPin}`
            : `Order #${target.orderNo} handed to rider`;
      pushLog("sale", msg, 0);
      showToast(msg);
    }
  };

  const pendingOrdersCount = storeOrders.filter((o) => o.stage === "new" || o.stage === "packing").length;

  useEffect(() => {
    if (!liveSales) return;
    const timer = window.setInterval(() => {
      setItems((prev) => {
        const candidates = prev.filter((p) => p.stock > 0);
        if (!candidates.length) return prev;
        const pick = candidates[Math.floor(Math.random() * candidates.length)];
        const qtySold = Math.min(pick.stock, 1 + Math.floor(Math.random() * 2));
        const nextStock = pick.stock - qtySold;
        const wasStatus = getStatus(pick);
        const updated = { ...pick, stock: nextStock };
        const nextStatus = getStatus(updated);

        pushLog("sale", `Sold ${qtySold} · ${pick.name} (app order #${5000 + Math.floor(Math.random() * 900)})`, -qtySold);
        if (nextStatus !== wasStatus && nextStatus !== "in") {
          showToast(`${nextStatus === "ou" ? "Out of stock: " : "Low stock: "}${pick.name} (${nextStock} left)`);
        }
        return prev.map((row) => (row.id === pick.id ? updated : row));
      });
    }, 4500);
    return () => window.clearInterval(timer);
  }, [liveSales]);

  const lowItems = useMemo(
    () => items.filter((p) => getStatus(p) !== "in").sort((a, b) => a.stock - b.stock),
    [items],
  );

  const metrics = useMemo(() => {
    let totalValue = 0;
    let totalUnits = 0;
    let lowCount = 0;
    let outCount = 0;
    const byCat: Record<string, number> = {};

    for (const p of items) {
      totalValue += p.stock * p.price;
      totalUnits += p.stock;
      const st = getStatus(p);
      if (st === "lo") lowCount += 1;
      if (st === "ou") outCount += 1;
      byCat[p.cat] = (byCat[p.cat] || 0) + p.stock;
    }
    const inCount = Math.max(0, items.length - lowCount - outCount);
    const total = Math.max(1, items.length);
    const inPct = (inCount / total) * 100;
    const loPct = inPct + (lowCount / total) * 100;
    const maxCat = Math.max(1, ...CATEGORIES.map((c) => byCat[c] || 0));
    const expiring = items
      .filter((p) => p.exp !== null && p.exp <= 3 && p.stock > 0)
      .sort((a, b) => (a.exp ?? 99) - (b.exp ?? 99))
      .slice(0, 5);

    return { totalValue, totalUnits, lowCount, outCount, inCount, inPct, loPct, byCat, maxCat, expiring };
  }, [items]);

  const filteredItems = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = items.filter((p) => {
      if (catFilter !== "All" && p.cat !== catFilter) return false;
      if (statusFilter !== "all" && getStatus(p) !== statusFilter) return false;
      if (!q) return true;
      return `${p.name} ${p.brand} ${p.sku}`.toLowerCase().includes(q);
    });
    return [...list].sort((a, b) => {
      const av = sortKey === "value" ? a.stock * a.price : sortKey === "exp" ? (a.exp ?? 9999) : a[sortKey];
      const bv = sortKey === "value" ? b.stock * b.price : sortKey === "exp" ? (b.exp ?? 9999) : b[sortKey];
      if (typeof av === "string" && typeof bv === "string") return av.localeCompare(bv) * sortDir;
      return ((av as number) - (bv as number)) * sortDir;
    });
  }, [items, catFilter, statusFilter, query, sortKey, sortDir]);

  const adjustStock = (id: string, delta: number) => {
    setItems((prev) =>
      prev.map((p) => {
        if (p.id !== id) return p;
        const nextStock = Math.max(0, p.stock + delta);
        if (nextStock !== p.stock) {
          pushLog("adjust", `Manual adjustment: ${p.name}`, nextStock - p.stock);
          void syncLiveStock(p, nextStock, "manual");
        }
        return { ...p, stock: nextStock };
      }),
    );
  };

  const openModal = (item: PortalItem | null) => {
    setEditingId(item ? item.id : null);
    setDeleteArmed(false);
    setFormError("");
    setForm({
      name: item?.name ?? "",
      brand: item?.brand ?? "",
      cat: item?.cat ?? "Produce",
      price: item ? String(item.price) : "",
      mrp: item ? String(item.mrp) : "",
      stock: item ? String(item.stock) : "0",
      re: item ? String(item.re) : "10",
      exp: item?.exp != null ? String(item.exp) : "",
    });
    setModalOpen(true);
  };

  const saveModal = (e: React.FormEvent) => {
    e.preventDefault();
    const name = form.name.trim();
    const price = Number(form.price);
    const mrp = Number(form.mrp);
    const stock = Math.floor(Number(form.stock));
    const re = Math.floor(Number(form.re));
    const exp = form.exp.trim() === "" ? null : Math.max(0, Math.floor(Number(form.exp)));

    if (!name) return setFormError("Enter a product name");
    if (!(price > 0)) return setFormError("Selling price must be above 0");
    if (mrp < price) return setFormError("MRP cannot be lower than the selling price");
    if (stock < 0) return setFormError("Stock cannot be negative");

    if (editingId === null) {
      const next: PortalItem = {
        id: `custom-${Date.now()}`,
        sku: `TT-${1000 + items.length}`,
        name,
        brand: form.brand.trim() || "Generic",
        cat: form.cat,
        price,
        mrp,
        tint: "#F3EBD6",
        stock,
        re,
        exp,
      };
      setItems((prev) => [next, ...prev]);
      pushLog("add", `New product added: ${name}`, stock);
      showToast("Product added");
    } else {
      setItems((prev) =>
        prev.map((p) => {
          if (p.id !== editingId) return p;
          const delta = stock - p.stock;
          if (delta !== 0) {
            pushLog("adjust", `Stock edited: ${name}`, delta);
            void syncLiveStock(p, stock, "manual");
          } else {
            pushLog("edit", `Details updated: ${name}`, 0);
          }
          return {
            ...p,
            name,
            brand: form.brand.trim() || p.brand,
            cat: form.cat,
            price,
            mrp,
            stock,
            re,
            exp,
          };
        }),
      );
      showToast("Changes saved");
    }
    setModalOpen(false);
  };

  const deleteEditing = () => {
    if (!editingId) return;
    if (!deleteArmed) {
      setDeleteArmed(true);
      return;
    }
    const target = items.find((p) => p.id === editingId);
    setItems((prev) => prev.filter((p) => p.id !== editingId));
    if (target) pushLog("delete", `Deleted product: ${target.name}`, 0);
    setModalOpen(false);
    showToast("Product deleted");
  };

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir((d) => (d === 1 ? -1 : 1));
    else {
      setSortKey(key);
      setSortDir(1);
    }
  };

  const exportCsv = () => {
    const header = ["SKU", "Product", "Brand", "Category", "Stock", "Reorder Level", "Price", "Value", "Expiry (days)"];
    const csvRows = items.map((p) =>
      [p.sku, `"${p.name.replace(/"/g, '""')}"`, `"${p.brand}"`, `"${p.cat}"`, p.stock, p.re, p.price, p.stock * p.price, p.exp ?? ""].join(","),
    );
    const blob = new Blob([[header.join(","), ...csvRows].join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "tikk-stock-inventory.csv";
    a.click();
    URL.revokeObjectURL(url);
    showToast(`Exported ${items.length} products to CSV`);
  };

  const createPO = () => {
    const chosen = lowItems.filter((p) => selectedRestock[p.id] ?? true);
    if (!chosen.length) return;
    const poItems = chosen.map((p) => ({
      id: p.id,
      name: p.name,
      qty: restockQty[p.id] ?? Math.max(1, p.re * 3 - p.stock),
    }));
    const total = chosen.reduce((sum, p) => {
      const q = restockQty[p.id] ?? Math.max(1, p.re * 3 - p.stock);
      return sum + q * p.price * 0.8;
    }, 0);
    const eta = ["2 hrs", "3 hrs", "90 min"][Math.floor(Math.random() * 3)];
    const id = `PO-${poNumber}`;
    setPoNumber((n) => n + 1);
    setOrders((prev) => [{ id, items: poItems, total, eta, done: false }, ...prev]);
    pushLog("po", `Purchase order created for ${poItems.length} items`, 0);
    showToast("Purchase order created");
  };

  const receivePO = (poId: string) => {
    const order = orders.find((o) => o.id === poId);
    if (!order || order.done) return;
    setOrders((prev) => prev.map((o) => (o.id === poId ? { ...o, done: true } : o)));
    setItems((prev) =>
      prev.map((p) => {
        const entry = order.items.find((x) => x.id === p.id);
        if (!entry) return p;
        const nextStock = p.stock + entry.qty;
        pushLog("restock", `Received ${p.name} (${poId})`, entry.qty);
        void syncLiveStock(p, nextStock, "restock");
        return { ...p, stock: nextStock };
      }),
    );
    showToast(`${poId} received. Stock updated`);
  };

  const selectedRestockList = lowItems.filter((p) => selectedRestock[p.id] ?? true);
  const selectedRestockCost = selectedRestockList.reduce((sum, p) => {
    const q = restockQty[p.id] ?? Math.max(1, p.re * 3 - p.stock);
    return sum + q * p.price * 0.8;
  }, 0);

  const pageTitles: Record<PortalTab, string> = {
    dash: "Dashboard",
    orders: "Orders & Packing",
    inv: "Inventory",
    rs: "Restock",
    log: "Activity",
  };

  return (
    <div className="flex h-screen overflow-hidden bg-[#FBF6EE] text-[13px] text-[#3A2418]">
      {/* Sidebar */}
      <aside className="flex w-14 flex-none flex-col gap-1 border-r border-[#F0E4D2] bg-white px-2 py-3.5 sm:w-[172px] sm:px-2.5">
        <div className="flex items-center gap-2 px-1.5 pb-3 text-sm font-semibold">
          <span className="grid size-[30px] shrink-0 place-items-center rounded-[9px] bg-[#A8421A] text-white">
            <Warehouse className="size-4" />
          </span>
          <span className="hidden sm:inline">Tikk Stock</span>
        </div>

        {(
          [
            { id: "dash", label: "Dashboard", icon: LayoutDashboard },
            { id: "orders", label: "Orders", icon: ClipboardList, badge: pendingOrdersCount },
            { id: "inv", label: "Inventory", icon: Boxes },
            { id: "rs", label: "Restock", icon: Truck, badge: lowItems.length },
            { id: "log", label: "Activity", icon: History },
          ] as const
        ).map((nav) => {
          const Icon = nav.icon;
          const active = tab === nav.id;
          return (
            <button
              key={nav.id}
              type="button"
              onClick={() => setTab(nav.id)}
              className={`relative flex items-center gap-2.5 rounded-[11px] px-2.5 py-2 text-left transition-colors ${
                active ? "bg-[#FBE3CF] font-semibold text-[#A8421A]" : "text-[#8A7060] hover:bg-[#FBF1E6]"
              }`}
            >
              <Icon className="size-[18px] shrink-0" />
              <span className="hidden sm:inline">{nav.label}</span>
              {"badge" in nav && nav.badge > 0 && (
                <span className="absolute top-0.5 right-0.5 rounded-full bg-[#D9453D] px-1.5 text-[10px] font-semibold leading-4 text-white sm:static sm:ml-auto">
                  {nav.badge}
                </span>
              )}
            </button>
          );
        })}

        <div className="mt-auto hidden space-y-1 rounded-xl border border-[#F5DDB8] bg-[#FFF0DA] p-2.5 text-[11px] text-[#8A7060] sm:block">
          <span>Store</span>
          <strong className="block text-xs font-semibold text-[#3A2418]">
            {activeStore?.name ?? "Park Street, Kolkata"}
          </strong>
          <span>Dark store #12</span>
          <button
            type="button"
            onClick={() => setTab("orders")}
            className="mt-1 inline-block font-semibold text-[#A8421A] hover:underline"
          >
            Live order board →
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="min-w-0 flex-1 overflow-y-auto">
        <header className="sticky top-0 z-10 flex items-center gap-2.5 border-b border-[#F0E4D2] bg-[#FBF6EE]/95 px-4 py-3 backdrop-blur-sm">
          <h1 className="min-w-0 flex-1 truncate text-lg font-semibold">{pageTitles[tab]}</h1>
          <label className="flex cursor-pointer items-center gap-2 text-xs text-[#8A7060]">
            <span className={`size-2 rounded-full ${liveSales ? "animate-pulse bg-[#2E7D4F]" : "bg-[#C9B8A4]"}`} />
            <span className="hidden sm:inline">Live sales</span>
            <button
              type="button"
              role="switch"
              aria-checked={liveSales}
              aria-label="Toggle live sales"
              onClick={() => {
                setLiveSales((v) => !v);
                showToast(!liveSales ? "Live sales on" : "Live sales paused");
              }}
              className={`relative h-5 w-[34px] rounded-full transition-colors ${liveSales ? "bg-[#2E7D4F]" : "bg-[#E5D6C2]"}`}
            >
              <span
                className={`absolute top-0.5 left-0.5 size-4 rounded-full bg-white transition-transform ${
                  liveSales ? "translate-x-3.5" : ""
                }`}
              />
            </button>
          </label>

          {tab === "inv" && (
            <button
              type="button"
              onClick={() => openModal(null)}
              className="inline-flex items-center gap-1.5 rounded-[11px] bg-[#A8421A] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#8E3513]"
            >
              <Plus className="size-3.5" />
              Add product
            </button>
          )}
        </header>

        <div className="p-4">
          {tab === "dash" && (
            <div className="space-y-3">
              {/* KPIs */}
              <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4">
                <button
                  type="button"
                  onClick={() => {
                    setStatusFilter("all");
                    setCatFilter("All");
                    setQuery("");
                    setTab("inv");
                  }}
                  className="rounded-2xl border border-[#F0E4D2] bg-white p-3.5 text-left transition-transform hover:-translate-y-0.5 hover:shadow-md"
                >
                  <span className="flex items-center justify-between text-[11px] text-[#8A7060]">
                    Total SKUs <Package className="size-3.5" />
                  </span>
                  <strong className="mt-1 block text-[22px] font-semibold tabular-nums">{items.length}</strong>
                  <span className="text-[11px] text-[#8A7060]">{metrics.totalUnits.toLocaleString("en-IN")} units</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setStatusFilter("all");
                    setTab("inv");
                  }}
                  className="rounded-2xl border border-[#F0E4D2] bg-white p-3.5 text-left transition-transform hover:-translate-y-0.5 hover:shadow-md"
                >
                  <span className="flex items-center justify-between text-[11px] text-[#8A7060]">
                    Stock value <IndianRupee className="size-3.5" />
                  </span>
                  <strong className="mt-1 block text-[22px] font-semibold tabular-nums">{formatInr(metrics.totalValue)}</strong>
                  <span className="text-[11px] text-[#2E7D4F]">At selling price</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setStatusFilter("lo");
                    setCatFilter("All");
                    setQuery("");
                    setTab("inv");
                  }}
                  className="rounded-2xl border border-[#F0E4D2] bg-white p-3.5 text-left transition-transform hover:-translate-y-0.5 hover:shadow-md"
                >
                  <span className="flex items-center justify-between text-[11px] text-[#8A7060]">
                    Low stock <AlertTriangle className="size-3.5 text-[#B7791F]" />
                  </span>
                  <strong className="mt-1 block text-[22px] font-semibold tabular-nums text-[#B7791F]">{metrics.lowCount}</strong>
                  <span className="text-[11px] text-[#8A7060]">Below reorder level</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setStatusFilter("ou");
                    setCatFilter("All");
                    setQuery("");
                    setTab("inv");
                  }}
                  className="rounded-2xl border border-[#F0E4D2] bg-white p-3.5 text-left transition-transform hover:-translate-y-0.5 hover:shadow-md"
                >
                  <span className="flex items-center justify-between text-[11px] text-[#8A7060]">
                    Out of stock <XCircle className="size-3.5 text-[#C0392B]" />
                  </span>
                  <strong className="mt-1 block text-[22px] font-semibold tabular-nums text-[#C0392B]">{metrics.outCount}</strong>
                  <span className="text-[11px] text-[#8A7060]">Lost sales risk</span>
                </button>
              </div>

              {/* Charts Row */}
              <div className="grid gap-3 md:grid-cols-2">
                <section className="rounded-2xl border border-[#F0E4D2] bg-white p-3.5">
                  <h2 className="mb-3 text-sm font-semibold">Stock health</h2>
                  <div className="flex items-center gap-4">
                    <div
                      className="grid size-24 shrink-0 place-items-center rounded-full"
                      style={{
                        background: `conic-gradient(#2E7D4F 0 ${metrics.inPct}%, #E8A317 ${metrics.inPct}% ${metrics.loPct}%, #D9453D ${metrics.loPct}% 100%)`,
                      }}
                    >
                      <div className="flex size-[62px] flex-col items-center justify-center rounded-full bg-white">
                        <strong className="text-lg font-semibold leading-none">{Math.round(metrics.inPct)}%</strong>
                        <span className="mt-0.5 text-[11px] text-[#8A7060]">healthy</span>
                      </div>
                    </div>
                    <div className="space-y-1.5 text-xs">
                      <div className="flex items-center gap-2">
                        <span className="rounded-lg bg-[#E3F0DA] px-2 py-0.5 font-semibold text-[#2E7D4F]">{metrics.inCount}</span>
                        <span>In stock</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="rounded-lg bg-[#FFF0D0] px-2 py-0.5 font-semibold text-[#B7791F]">{metrics.lowCount}</span>
                        <span>Low</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="rounded-lg bg-[#FBE1DD] px-2 py-0.5 font-semibold text-[#C0392B]">{metrics.outCount}</span>
                        <span>Out</span>
                      </div>
                    </div>
                  </div>
                </section>

                <section className="rounded-2xl border border-[#F0E4D2] bg-white p-3.5">
                  <h2 className="mb-3 text-sm font-semibold">Units by category</h2>
                  <div className="space-y-2">
                    {CATEGORIES.map((c) => {
                      const val = metrics.byCat[c] || 0;
                      return (
                        <div key={c}>
                          <div className="mb-1 flex justify-between text-xs">
                            <span>{c}</span>
                            <span className="tabular-nums text-[#8A7060]">{val}</span>
                          </div>
                          <div className="h-2 overflow-hidden rounded-full bg-[#F0E4D2]">
                            <div
                              className="h-full rounded-full bg-[#C9622B] transition-all duration-500"
                              style={{ width: `${(val / metrics.maxCat) * 100}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </section>
              </div>

              {/* Alerts Row */}
              <div className="grid gap-3 md:grid-cols-2">
                <section className="rounded-2xl border border-[#F0E4D2] bg-white p-3.5">
                  <div className="mb-2 flex items-center justify-between">
                    <h2 className="text-sm font-semibold">Needs attention</h2>
                    <button type="button" onClick={() => setTab("rs")} className="text-xs font-medium text-[#A8421A] hover:underline">
                      Restock
                    </button>
                  </div>
                  {lowItems.length === 0 ? (
                    <p className="text-xs text-[#8A7060]">All items are healthy</p>
                  ) : (
                    <div className="divide-y divide-[#F5EBDB]">
                      {lowItems.slice(0, 5).map((p) => {
                        const s = getStatus(p);
                        return (
                          <div key={p.id} className="flex items-center gap-2.5 py-2">
                            <span className="grid size-[30px] shrink-0 place-items-center rounded-[9px]" style={{ background: p.tint }}>
                              <Package className="size-4 text-[#3A2418]/60" />
                            </span>
                            <div className="min-w-0 flex-1">
                              <p className="truncate font-semibold">{p.name}</p>
                              <p className="text-[11px] text-[#8A7060]">
                                {p.stock} left · reorder at {p.re}
                              </p>
                            </div>
                            <StatusPill status={s} />
                          </div>
                        );
                      })}
                    </div>
                  )}
                </section>

                <section className="rounded-2xl border border-[#F0E4D2] bg-white p-3.5">
                  <h2 className="mb-2 text-sm font-semibold">Expiring soon</h2>
                  {metrics.expiring.length === 0 ? (
                    <p className="text-xs text-[#8A7060]">Nothing expiring in 3 days</p>
                  ) : (
                    <div className="divide-y divide-[#F5EBDB]">
                      {metrics.expiring.map((p) => {
                        const started = Boolean(clearanceStarted[p.id]);
                        return (
                          <div key={p.id} className="flex items-center gap-2.5 py-2">
                            <span className="grid size-[30px] shrink-0 place-items-center rounded-[9px]" style={{ background: p.tint }}>
                              <Package className="size-4 text-[#3A2418]/60" />
                            </span>
                            <div className="min-w-0 flex-1">
                              <p className="truncate font-semibold">{p.name}</p>
                              <p className={`text-[11px] ${(p.exp ?? 9) <= 1 ? "text-[#C0392B]" : "text-[#B7791F]"}`}>
                                Expires in {p.exp} {p.exp === 1 ? "day" : "days"} · {p.stock} units
                              </p>
                            </div>
                            <button
                              type="button"
                              disabled={started}
                              onClick={() => {
                                setClearanceStarted((prev) => ({ ...prev, [p.id]: true }));
                                pushLog("clearance", `Clearance started: ${p.name}`, 0);
                                showToast(`Clearance offer started for ${p.name}`);
                              }}
                              className="rounded-[10px] border border-[#EADBC6] bg-white px-2.5 py-1 text-xs font-medium text-[#8A7060] hover:bg-[#FBF6EE] disabled:opacity-45"
                            >
                              {started ? "Started" : "Clearance"}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </section>
              </div>
            </div>
          )}

          {tab === "orders" && (
            <div className="space-y-3">
              {/* Store Status & Prep Time Controls */}
              <section className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#F0E4D2] bg-white p-3.5">
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    role="switch"
                    aria-checked={acceptingOrders}
                    onClick={() => void toggleAcceptingOrders()}
                    className={`relative h-6 w-11 rounded-full transition-colors ${acceptingOrders ? "bg-[#2E7D4F]" : "bg-[#C0392B]"}`}
                  >
                    <span
                      className={`absolute top-0.5 left-0.5 size-5 rounded-full bg-white transition-transform ${
                        acceptingOrders ? "translate-x-5" : ""
                      }`}
                    />
                  </button>
                  <div>
                    <p className="text-xs font-bold">{acceptingOrders ? "Store Open · Accepting Orders" : "Store Paused · Surge Hold"}</p>
                    <p className="text-[11px] text-[#8A7060]">Synced with customer serviceability &amp; ETA</p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] font-semibold text-[#8A7060]">Prep ETA:</span>
                  {[4, 6, 10, 15].map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => void updatePrepTime(m)}
                      className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                        prepTimeMin === m
                          ? "bg-[#A8421A] text-white"
                          : "border border-[#EADBC6] bg-[#FBF6EE] text-[#3A2418] hover:bg-[#FBE3CF]/60"
                      }`}
                    >
                      {m}m
                    </button>
                  ))}
                </div>
              </section>

              {/* Picking & Packing Queue */}
              <div className="grid gap-3 md:grid-cols-2">
                {storeOrders
                  .filter((o) => o.stage !== "handed")
                  .map((order) => {
                    const pickedCount = order.items.filter((it) => it.picked).length;
                    const mins = String(Math.floor(order.slaSec / 60)).padStart(2, "0");
                    const secs = String(order.slaSec % 60).padStart(2, "0");
                    return (
                      <article key={order.id} className="flex flex-col rounded-2xl border border-[#F0E4D2] bg-white p-3.5">
                        <div className="flex items-start justify-between gap-2 border-b border-[#F5EBDB] pb-2.5">
                          <div>
                            <div className="flex items-center gap-2">
                              <strong className="text-sm font-bold">Order #{order.orderNo}</strong>
                              <span
                                className={`rounded-lg px-2 py-0.5 text-[10px] font-bold ${
                                  order.stage === "new"
                                    ? "bg-[#FBE1DD] text-[#C0392B]"
                                    : order.stage === "packing"
                                      ? "bg-[#FFF0D0] text-[#B7791F]"
                                      : "bg-[#E3F0DA] text-[#2E7D4F]"
                                }`}
                              >
                                {order.stage === "new" ? "New" : order.stage === "packing" ? "Packing" : "Ready for rider"}
                              </span>
                            </div>
                            <p className="mt-0.5 text-[11px] text-[#8A7060]">
                              {order.customer} · {order.payment} · {formatInr(order.total)}
                            </p>
                          </div>

                          {order.stage === "ready" ? (
                            <div className="rounded-xl border border-[#EADBC6] bg-[#FBF6EE] px-2.5 py-1 text-center">
                              <span className="block text-[9px] font-bold uppercase text-[#8A7060]">Rider PIN</span>
                              <strong className="font-mono text-sm font-bold text-[#A8421A]">{order.pickupPin}</strong>
                            </div>
                          ) : (
                            <span
                              className={`inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-bold tabular-nums ${
                                order.slaSec <= 45 ? "bg-[#FBE1DD] text-[#C0392B]" : "bg-[#FBE3CF] text-[#A8421A]"
                              }`}
                            >
                              <Clock3 className="size-3.5" />
                              {mins}:{secs}
                            </span>
                          )}
                        </div>

                        <ul className="my-2.5 flex-1 divide-y divide-[#F5EBDB]">
                          {order.items.map((item) => (
                            <li key={item.id} className="py-1.5">
                              <label className="flex cursor-pointer items-center gap-2.5 text-xs">
                                <input
                                  type="checkbox"
                                  checked={item.picked}
                                  disabled={order.stage === "ready"}
                                  onChange={() => togglePickItem(order.id, item.id)}
                                  className="size-4 accent-[#2E7D4F]"
                                />
                                <span className={`min-w-0 flex-1 font-medium ${item.picked ? "text-[#8A7060] line-through" : "text-[#3A2418]"}`}>
                                  {item.qty}× {item.name}
                                </span>
                                <span className="inline-flex items-center gap-1 rounded-md border border-[#EADBC6] bg-[#FBF6EE] px-1.5 py-0.5 text-[10px] font-bold text-[#A8421A]">
                                  <MapPin className="size-2.5" />
                                  {item.rack}
                                </span>
                              </label>
                            </li>
                          ))}
                        </ul>

                        <div className="flex items-center justify-between gap-2 border-t border-[#F5EBDB] pt-2.5">
                          <span className="text-[11px] text-[#8A7060]">
                            {pickedCount}/{order.items.length} picked
                          </span>
                          {order.stage === "new" && (
                            <button
                              type="button"
                              onClick={() => advanceOrderStage(order.id, "packing")}
                              className="rounded-[10px] bg-[#A8421A] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#8E3513]"
                            >
                              Start packing
                            </button>
                          )}
                          {order.stage === "packing" && (
                            <button
                              type="button"
                              onClick={() => advanceOrderStage(order.id, "ready")}
                              className="rounded-[10px] bg-[#2E7D4F] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#23633d]"
                            >
                              Mark packed &amp; ready
                            </button>
                          )}
                          {order.stage === "ready" && (
                            <button
                              type="button"
                              onClick={() => advanceOrderStage(order.id, "handed")}
                              className="rounded-[10px] border border-[#EADBC6] bg-[#FBF6EE] px-3 py-1.5 text-xs font-semibold text-[#3A2418] hover:bg-[#FBE3CF]"
                            >
                              Handed to rider
                            </button>
                          )}
                        </div>
                      </article>
                    );
                  })}
              </div>
              {storeOrders.filter((o) => o.stage !== "handed").length === 0 && (
                <div className="rounded-2xl border border-[#F0E4D2] bg-white p-8 text-center text-xs text-[#8A7060]">
                  All active orders have been handed off to riders.
                </div>
              )}
            </div>
          )}

          {tab === "inv" && (
            <div className="space-y-2.5">
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex h-[34px] min-w-[160px] flex-1 items-center gap-2 rounded-[11px] border-[1.5px] border-[#EADBC6] bg-white px-2.5 text-[#8A7060]">
                  <Search className="size-4 shrink-0" />
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search name, brand or SKU"
                    className="min-w-0 flex-1 bg-transparent text-[13px] text-[#3A2418] outline-none"
                  />
                </div>
                <button
                  type="button"
                  onClick={exportCsv}
                  className="inline-flex h-[34px] items-center gap-1.5 rounded-[11px] border border-[#EADBC6] bg-white px-3 text-xs font-medium text-[#8A7060] hover:bg-[#FBF1E6]"
                >
                  <Download className="size-3.5" />
                  Export
                </button>
              </div>

              <div className="flex flex-wrap gap-1.5">
                {["All", ...CATEGORIES].map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setCatFilter(c)}
                    className={`rounded-full border px-3 py-1 text-xs ${
                      catFilter === c
                        ? "border-[#A8421A] bg-[#A8421A] text-white"
                        : "border-[#EADBC6] bg-white text-[#3A2418] hover:bg-[#FBF1E6]"
                    }`}
                  >
                    {c}
                  </button>
                ))}
              </div>

              <div className="flex flex-wrap items-center gap-1.5">
                {(
                  [
                    ["all", "All status"],
                    ["in", "In stock"],
                    ["lo", "Low"],
                    ["ou", "Out"],
                  ] as const
                ).map(([id, label]) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setStatusFilter(id)}
                    className={`rounded-full border px-3 py-1 text-xs ${
                      statusFilter === id
                        ? "border-[#A8421A] bg-[#A8421A] text-white"
                        : "border-[#EADBC6] bg-white text-[#3A2418] hover:bg-[#FBF1E6]"
                    }`}
                  >
                    {label}
                  </button>
                ))}
                <span className="ml-auto text-xs text-[#8A7060]">
                  {filteredItems.length} of {items.length} products
                </span>
              </div>

              <div className="overflow-x-auto rounded-[14px] border border-[#F0E4D2] bg-white">
                <table className="w-full min-w-[540px] border-collapse">
                  <thead>
                    <tr className="bg-[#FBF6EE] text-left text-[11px] font-semibold text-[#8A7060]">
                      <th className="cursor-pointer px-3 py-2.5" onClick={() => toggleSort("name")}>
                        Product {sortKey === "name" ? (sortDir === 1 ? "↑" : "↓") : ""}
                      </th>
                      <th className="cursor-pointer px-3 py-2.5" onClick={() => toggleSort("stock")}>
                        Stock {sortKey === "stock" ? (sortDir === 1 ? "↑" : "↓") : ""}
                      </th>
                      <th className="px-3 py-2.5">Status</th>
                      <th className="cursor-pointer px-3 py-2.5" onClick={() => toggleSort("price")}>
                        Price {sortKey === "price" ? (sortDir === 1 ? "↑" : "↓") : ""}
                      </th>
                      <th className="cursor-pointer px-3 py-2.5" onClick={() => toggleSort("value")}>
                        Value {sortKey === "value" ? (sortDir === 1 ? "↑" : "↓") : ""}
                      </th>
                      <th className="cursor-pointer px-3 py-2.5" onClick={() => toggleSort("exp")}>
                        Expiry {sortKey === "exp" ? (sortDir === 1 ? "↑" : "↓") : ""}
                      </th>
                      <th className="px-3 py-2.5" />
                    </tr>
                  </thead>
                  <tbody>
                    {filteredItems.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-8 text-center text-xs text-[#8A7060]">
                          No products match your filters
                        </td>
                      </tr>
                    ) : (
                      filteredItems.map((p) => (
                        <tr key={p.id} className="border-t border-[#F5EBDB] hover:bg-[#FFFBF5]">
                          <td className="px-3 py-2">
                            <div className="flex items-center gap-2.5">
                              <span className="grid size-[30px] shrink-0 place-items-center rounded-[9px]" style={{ background: p.tint }}>
                                <Package className="size-4 text-[#3A2418]/60" />
                              </span>
                              <div className="min-w-0">
                                <p className="font-semibold">{p.name}</p>
                                <p className="text-[11px] text-[#8A7060]">
                                  {p.sku} · {p.cat}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="px-3 py-2">
                            <div className="inline-flex items-center overflow-hidden rounded-[10px] border-[1.5px] border-[#EADBC6]">
                              <button
                                type="button"
                                aria-label={`Decrease ${p.name}`}
                                onClick={() => adjustStock(p.id, -1)}
                                className="px-2 py-0.5 text-sm text-[#A8421A] hover:bg-[#FBE3CF]"
                              >
                                −
                              </button>
                              <span className="min-w-[30px] px-1 text-center font-semibold tabular-nums">{p.stock}</span>
                              <button
                                type="button"
                                aria-label={`Increase ${p.name}`}
                                onClick={() => adjustStock(p.id, 1)}
                                className="px-2 py-0.5 text-sm text-[#A8421A] hover:bg-[#FBE3CF]"
                              >
                                +
                              </button>
                            </div>
                          </td>
                          <td className="px-3 py-2">
                            <StatusPill status={getStatus(p)} />
                          </td>
                          <td className="px-3 py-2 tabular-nums">{formatInr(p.price)}</td>
                          <td className="px-3 py-2 tabular-nums">{formatInr(p.stock * p.price)}</td>
                          <td className={`px-3 py-2 text-xs ${p.exp !== null && p.exp <= 2 ? "font-semibold text-[#C0392B]" : "text-[#8A7060]"}`}>
                            {p.exp === null ? "—" : `${p.exp}d`}
                          </td>
                          <td className="px-3 py-2 text-right">
                            <button
                              type="button"
                              aria-label={`Edit ${p.name}`}
                              onClick={() => openModal(p)}
                              className="rounded-lg p-1.5 text-[#8A7060] hover:bg-[#FBF1E6] hover:text-[#A8421A]"
                            >
                              <Pencil className="size-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {tab === "rs" && (
            <div className="space-y-3">
              <section className="rounded-2xl border border-[#F0E4D2] bg-white p-3.5">
                <div className="mb-2.5 flex items-center justify-between">
                  <h2 className="text-sm font-semibold">Suggested restock</h2>
                  <span className="text-xs text-[#8A7060]">{lowItems.length} items below reorder level</span>
                </div>
                {lowItems.length === 0 ? (
                  <p className="py-3 text-xs text-[#8A7060]">Nothing needs restocking right now</p>
                ) : (
                  <>
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[520px] border-collapse">
                        <thead>
                          <tr className="bg-[#FBF6EE] text-left text-[11px] font-semibold text-[#8A7060]">
                            <th className="w-8 px-2 py-2" />
                            <th className="px-2 py-2">Product</th>
                            <th className="px-2 py-2">Stock</th>
                            <th className="px-2 py-2">Order qty</th>
                            <th className="px-2 py-2">Supplier</th>
                            <th className="px-2 py-2">Est. cost</th>
                          </tr>
                        </thead>
                        <tbody>
                          {lowItems.map((p) => {
                            const checked = selectedRestock[p.id] ?? true;
                            const q = restockQty[p.id] ?? Math.max(1, p.re * 3 - p.stock);
                            return (
                              <tr key={p.id} className="border-t border-[#F5EBDB]">
                                <td className="px-2 py-2">
                                  <input
                                    type="checkbox"
                                    checked={checked}
                                    onChange={(e) => setSelectedRestock((prev) => ({ ...prev, [p.id]: e.target.checked }))}
                                    className="accent-[#A8421A]"
                                  />
                                </td>
                                <td className="px-2 py-2">
                                  <div className="flex items-center gap-2">
                                    <span className="grid size-[30px] shrink-0 place-items-center rounded-[9px]" style={{ background: p.tint }}>
                                      <Package className="size-4 text-[#3A2418]/60" />
                                    </span>
                                    <div>
                                      <p className="font-semibold">{p.name}</p>
                                      <p className="text-[11px] text-[#8A7060]">Reorder at {p.re}</p>
                                    </div>
                                  </div>
                                </td>
                                <td className="px-2 py-2">
                                  <span className="mr-1.5 font-semibold tabular-nums">{p.stock}</span>
                                  <StatusPill status={getStatus(p)} />
                                </td>
                                <td className="px-2 py-2">
                                  <input
                                    type="number"
                                    min={1}
                                    value={q}
                                    onChange={(e) =>
                                      setRestockQty((prev) => ({ ...prev, [p.id]: Math.max(1, Number(e.target.value) || 1) }))
                                    }
                                    className="w-16 rounded-[10px] border-[1.5px] border-[#EADBC6] bg-[#FBF6EE] px-2 py-1 text-center text-xs font-semibold"
                                  />
                                </td>
                                <td className="px-2 py-2 text-xs">{SUPPLIERS[p.cat] ?? "Metro Wholesale"}</td>
                                <td className="px-2 py-2 tabular-nums">{formatInr(q * p.price * 0.8)}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                    <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                      <span className="text-xs text-[#8A7060]">
                        <strong className="font-semibold text-[#3A2418]">{selectedRestockList.length}</strong> selected · est.{" "}
                        <strong className="font-semibold text-[#3A2418]">{formatInr(selectedRestockCost)}</strong>
                      </span>
                      <button
                        type="button"
                        disabled={!selectedRestockList.length}
                        onClick={createPO}
                        className="inline-flex items-center gap-1.5 rounded-[11px] bg-[#A8421A] px-3.5 py-2 text-xs font-semibold text-white hover:bg-[#8E3513] disabled:opacity-40"
                      >
                        <Send className="size-3.5" />
                        Create purchase order
                      </button>
                    </div>
                  </>
                )}
              </section>

              <section className="rounded-2xl border border-[#F0E4D2] bg-white p-3.5">
                <h2 className="mb-2 text-sm font-semibold">Purchase orders</h2>
                {orders.length === 0 ? (
                  <p className="text-xs text-[#8A7060]">No purchase orders yet</p>
                ) : (
                  <div className="divide-y divide-[#F5EBDB]">
                    {orders.map((o) => (
                      <div key={o.id} className="flex flex-wrap items-center gap-2.5 py-2.5">
                        <span className="grid size-[30px] shrink-0 place-items-center rounded-[9px] bg-[#FBE3CF] text-[#A8421A]">
                          <FileText className="size-4" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold">
                            {o.id}{" "}
                            <span className="text-xs font-normal text-[#8A7060]">
                              · {o.items.length} items · {formatInr(o.total)}
                            </span>
                          </p>
                          <p className="truncate text-[11px] text-[#8A7060]">
                            {o.items.map((x) => `${x.name} ×${x.qty}`).join(", ")}
                          </p>
                        </div>
                        {o.done ? (
                          <span className="rounded-[10px] bg-[#E3F0DA] px-2 py-0.5 text-[11px] font-semibold text-[#2E7D4F]">Received</span>
                        ) : (
                          <>
                            <span className="rounded-[10px] bg-[#FFF0D0] px-2 py-0.5 text-[11px] font-semibold text-[#B7791F]">
                              Arriving in {o.eta}
                            </span>
                            <button
                              type="button"
                              onClick={() => receivePO(o.id)}
                              className="rounded-[10px] bg-[#A8421A] px-2.5 py-1 text-xs font-semibold text-white hover:bg-[#8E3513]"
                            >
                              Mark received
                            </button>
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </div>
          )}

          {tab === "log" && (
            <section className="rounded-2xl border border-[#F0E4D2] bg-white p-3.5">
              <div className="mb-2 flex items-center justify-between">
                <h2 className="text-sm font-semibold">Stock movements</h2>
                <span className="text-xs text-[#8A7060]">{events.length} events</span>
              </div>
              {events.length === 0 ? (
                <p className="text-xs text-[#8A7060]">No activity yet</p>
              ) : (
                <div className="divide-y divide-[#F5EBDB]">
                  {events.map((ev) => (
                    <div key={ev.id} className="flex items-center gap-2.5 py-2">
                      <span className="grid size-[30px] shrink-0 place-items-center rounded-[9px] bg-[#FBE3CF] text-[#A8421A]">
                        {ev.type === "sale" ? (
                          <ShoppingCart className="size-4" />
                        ) : ev.type === "restock" ? (
                          <Truck className="size-4" />
                        ) : (
                          <SlidersHorizontal className="size-4" />
                        )}
                      </span>
                      <p className="min-w-0 flex-1 text-xs">{ev.txt}</p>
                      {ev.delta !== 0 && (
                        <span
                          className={`rounded-[10px] px-2 py-0.5 text-[11px] font-semibold ${
                            ev.delta > 0 ? "bg-[#E3F0DA] text-[#2E7D4F]" : "bg-[#FFF0D0] text-[#B7791F]"
                          }`}
                        >
                          {ev.delta > 0 ? `+${ev.delta}` : ev.delta}
                        </span>
                      )}
                      <span className="min-w-[38px] text-right text-[11px] text-[#8A7060]">{ev.time}</span>
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}
        </div>
      </main>

      {/* Add / Edit Product Modal */}
      {modalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-30 grid place-items-center bg-[#5A2C18]/30 p-3.5"
          onClick={(e) => {
            if (e.target === e.currentTarget) setModalOpen(false);
          }}
        >
          <form onSubmit={saveModal} className="w-full max-w-[400px] rounded-[18px] bg-white p-[18px] shadow-xl">
            <div className="mb-1 flex items-center justify-between">
              <h2 className="text-[17px] font-semibold">{editingId ? "Edit product" : "Add product"}</h2>
              <button type="button" onClick={() => setModalOpen(false)} aria-label="Close" className="p-1 text-[#8A7060] hover:text-[#A8421A]">
                <X className="size-4" />
              </button>
            </div>

            <label className="mt-2.5 mb-1 block text-[11px] text-[#8A7060]">Product name</label>
            <input
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              className="w-full rounded-[10px] border-[1.5px] border-[#EADBC6] bg-[#FBF6EE] px-2.5 py-2 text-[13px] outline-none focus:border-[#A8421A] focus:bg-white"
            />

            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="mt-2.5 mb-1 block text-[11px] text-[#8A7060]">Brand</label>
                <input
                  value={form.brand}
                  onChange={(e) => setForm((f) => ({ ...f, brand: e.target.value }))}
                  className="w-full rounded-[10px] border-[1.5px] border-[#EADBC6] bg-[#FBF6EE] px-2.5 py-2 text-[13px] outline-none focus:border-[#A8421A] focus:bg-white"
                />
              </div>
              <div>
                <label className="mt-2.5 mb-1 block text-[11px] text-[#8A7060]">Category</label>
                <select
                  value={form.cat}
                  onChange={(e) => setForm((f) => ({ ...f, cat: e.target.value }))}
                  className="w-full rounded-[10px] border-[1.5px] border-[#EADBC6] bg-[#FBF6EE] px-2.5 py-2 text-[13px] outline-none focus:border-[#A8421A] focus:bg-white"
                >
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="mt-2.5 mb-1 block text-[11px] text-[#8A7060]">Selling price (₹)</label>
                <input
                  type="number"
                  min={0}
                  value={form.price}
                  onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
                  className="w-full rounded-[10px] border-[1.5px] border-[#EADBC6] bg-[#FBF6EE] px-2.5 py-2 text-[13px] outline-none focus:border-[#A8421A] focus:bg-white"
                />
              </div>
              <div>
                <label className="mt-2.5 mb-1 block text-[11px] text-[#8A7060]">MRP (₹)</label>
                <input
                  type="number"
                  min={0}
                  value={form.mrp}
                  onChange={(e) => setForm((f) => ({ ...f, mrp: e.target.value }))}
                  className="w-full rounded-[10px] border-[1.5px] border-[#EADBC6] bg-[#FBF6EE] px-2.5 py-2 text-[13px] outline-none focus:border-[#A8421A] focus:bg-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="mt-2.5 mb-1 block text-[11px] text-[#8A7060]">Stock (units)</label>
                <input
                  type="number"
                  min={0}
                  value={form.stock}
                  onChange={(e) => setForm((f) => ({ ...f, stock: e.target.value }))}
                  className="w-full rounded-[10px] border-[1.5px] border-[#EADBC6] bg-[#FBF6EE] px-2.5 py-2 text-[13px] outline-none focus:border-[#A8421A] focus:bg-white"
                />
              </div>
              <div>
                <label className="mt-2.5 mb-1 block text-[11px] text-[#8A7060]">Reorder level</label>
                <input
                  type="number"
                  min={0}
                  value={form.re}
                  onChange={(e) => setForm((f) => ({ ...f, re: e.target.value }))}
                  className="w-full rounded-[10px] border-[1.5px] border-[#EADBC6] bg-[#FBF6EE] px-2.5 py-2 text-[13px] outline-none focus:border-[#A8421A] focus:bg-white"
                />
              </div>
            </div>

            <label className="mt-2.5 mb-1 block text-[11px] text-[#8A7060]">Shelf life left (days, optional)</label>
            <input
              type="number"
              min={0}
              value={form.exp}
              onChange={(e) => setForm((f) => ({ ...f, exp: e.target.value }))}
              className="w-full rounded-[10px] border-[1.5px] border-[#EADBC6] bg-[#FBF6EE] px-2.5 py-2 text-[13px] outline-none focus:border-[#A8421A] focus:bg-white"
            />

            {formError && <p className="mt-2 text-xs text-[#C0392B]">{formError}</p>}

            <div className="mt-4 flex items-center gap-2">
              {editingId && (
                <button
                  type="button"
                  onClick={deleteEditing}
                  className="rounded-[11px] border border-[#EADBC6] bg-white px-3 py-1.5 text-xs font-medium text-[#C0392B] hover:bg-[#FBE1DD]/40"
                >
                  {deleteArmed ? "Tap again to confirm" : "Delete"}
                </button>
              )}
              <span className="flex-1" />
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="rounded-[11px] border border-[#EADBC6] bg-white px-3 py-1.5 text-xs font-medium text-[#8A7060]"
              >
                Cancel
              </button>
              <button type="submit" className="rounded-[11px] bg-[#A8421A] px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-[#8E3513]">
                {editingId ? "Save changes" : "Add product"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Toast */}
      {toastMsg && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-4 left-1/2 z-40 -translate-x-1/2 rounded-[14px] bg-[#5A2C18] px-4 py-2 text-xs font-medium text-[#FBF6EE] shadow-lg"
        >
          {toastMsg}
        </div>
      )}
    </div>
  );
}

function StatusPill({ status }: { status: StockStatus }) {
  if (status === "in") {
    return (
      <span className="inline-flex items-center gap-1 rounded-[10px] bg-[#E3F0DA] px-2 py-0.5 text-[11px] font-semibold text-[#2E7D4F]">
        <CheckCircle2 className="size-3" /> In stock
      </span>
    );
  }
  if (status === "lo") {
    return (
      <span className="inline-flex items-center gap-1 rounded-[10px] bg-[#FFF0D0] px-2 py-0.5 text-[11px] font-semibold text-[#B7791F]">
        <AlertTriangle className="size-3" /> Low stock
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-[10px] bg-[#FBE1DD] px-2 py-0.5 text-[11px] font-semibold text-[#C0392B]">
      <XCircle className="size-3" /> Out of stock
    </span>
  );
}

export default function StoreInventoryPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#FBF6EE] p-8 text-center text-sm text-[#8A7060]">Loading…</div>}>
      <TikkStockPortal />
    </Suspense>
  );
}
