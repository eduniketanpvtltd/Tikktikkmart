"use client";

import React, { Suspense, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  Bell,
  Boxes,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Clock3,
  Download,
  FileSpreadsheet,
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
  ShieldCheck,
  ShoppingCart,
  SlidersHorizontal,
  Trash2,
  TrendingDown,
  TrendingUp,
  Truck,
  UserCheck,
  Warehouse,
  X,
  XCircle,
} from "lucide-react";
import { apiFetch } from "@/lib/api/client";
import { useAuth } from "@/components/providers/AppProviders";

type PortalTab = "dash" | "wh" | "orders" | "inv" | "rs" | "ship" | "rep" | "log";
type StockStatus = "in" | "lo" | "ou";
type StatusFilter = "all" | StockStatus;
type SortKey = "name" | "stock" | "price" | "value" | "exp";
type PickStage = "new" | "packing" | "ready" | "handed";

interface RackBin {
  code: string;
  skuId: string | null;
}

interface WarehouseSection {
  id: string;
  code: string;
  name: string;
  tint: string;
  bins: RackBin[];
}

interface WarehouseZone {
  id: string;
  name: string;
  subtitle: string;
}

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

const WAREHOUSE_ZONES: WarehouseZone[] = [
  { id: "wh-1", name: "Dark Store #12 · Park St", subtitle: "Main Hub · 4 Aisles" },
  { id: "wh-2", name: "Dark Store #04 · Salt Lake", subtitle: "Sector V · Express" },
  { id: "wh-3", name: "Dark Store #08 · Ballygunge", subtitle: "South Zone" },
  { id: "wh-4", name: "Cold Room · Annex", subtitle: "2°C–6°C Chilled" },
];

const INITIAL_SECTIONS: WarehouseSection[] = [
  {
    id: "sec-a",
    code: "A",
    name: "Produce & Fresh",
    tint: "#E3F0DA",
    bins: [
      { code: "A1", skuId: "seed-0" },
      { code: "A2", skuId: null },
      { code: "A3", skuId: "seed-2" },
      { code: "A4", skuId: "seed-3" },
      { code: "A5", skuId: null },
      { code: "A6", skuId: "seed-6" },
      { code: "A7", skuId: "seed-14" },
      { code: "A8", skuId: null },
      { code: "A9", skuId: "seed-15" },
      { code: "A10", skuId: "seed-18" },
      { code: "A11", skuId: null },
      { code: "A12", skuId: "seed-19" },
    ],
  },
  {
    id: "sec-b",
    code: "B",
    name: "Dairy & Chilled",
    tint: "#FFF0DA",
    bins: [
      { code: "B1", skuId: "seed-1" },
      { code: "B2", skuId: null },
      { code: "B3", skuId: "seed-4" },
      { code: "B4", skuId: null },
      { code: "B5", skuId: "seed-5" },
      { code: "B6", skuId: "seed-1" },
      { code: "B7", skuId: null },
      { code: "B8", skuId: "seed-4" },
      { code: "B9", skuId: "seed-5" },
      { code: "B10", skuId: null },
      { code: "B11", skuId: "seed-1" },
      { code: "B12", skuId: null },
    ],
  },
  {
    id: "sec-c",
    code: "C",
    name: "Staples & Atta",
    tint: "#F3E6CF",
    bins: [
      { code: "C1", skuId: "seed-8" },
      { code: "C2", skuId: null },
      { code: "C3", skuId: "seed-5" },
      { code: "C4", skuId: null },
      { code: "C5", skuId: "seed-8" },
      { code: "C6", skuId: "seed-20" },
      { code: "C7", skuId: "seed-21" },
      { code: "C8", skuId: null },
      { code: "C9", skuId: null },
      { code: "C10", skuId: "seed-8" },
      { code: "C11", skuId: "seed-20" },
      { code: "C12", skuId: null },
    ],
  },
  {
    id: "sec-d",
    code: "D",
    name: "Snacks & Drinks",
    tint: "#E8F0FA",
    bins: [
      { code: "D1", skuId: "seed-7" },
      { code: "D2", skuId: null },
      { code: "D3", skuId: "seed-9" },
      { code: "D4", skuId: "seed-10" },
      { code: "D5", skuId: "seed-11" },
      { code: "D6", skuId: null },
      { code: "D7", skuId: "seed-12" },
      { code: "D8", skuId: null },
      { code: "D9", skuId: "seed-13" },
      { code: "D10", skuId: "seed-7" },
      { code: "D11", skuId: "seed-9" },
      { code: "D12", skuId: null },
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

  // Warehouses, Sections, Shipments & Reports state
  const [zones, setZones] = useState<WarehouseZone[]>(WAREHOUSE_ZONES);
  const [activeZoneId, setActiveZoneId] = useState<string>(WAREHOUSE_ZONES[0].id);
  const [sections, setSections] = useState<WarehouseSection[]>(INITIAL_SECTIONS);
  const [selectedSectionId, setSelectedSectionId] = useState<string>(INITIAL_SECTIONS[1].id);
  const [selectedBin, setSelectedBin] = useState<{ sectionId: string; code: string } | null>({
    sectionId: INITIAL_SECTIONS[1].id,
    code: "B3",
  });
  const [whFilter, setWhFilter] = useState<"all" | "occupied" | "empty" | "alerts">("all");
  const [notifOpen, setNotifOpen] = useState(false);
  const [pinInputs, setPinInputs] = useState<Record<string, string>>({});
  const [selectedInvIds, setSelectedInvIds] = useState<Record<string, boolean>>({});

  const rackBySkuId = useMemo(() => {
    const map: Record<string, string> = {};
    for (const sec of sections) {
      for (const bin of sec.bins) {
        if (bin.skuId && !map[bin.skuId]) map[bin.skuId] = bin.code;
      }
    }
    return map;
  }, [sections]);

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
    wh: "Warehouses",
    orders: "Orders & Packing",
    inv: "Inventory",
    rs: "Restock",
    ship: "Shipments & Riders",
    rep: "Export Reports",
    log: "Activity",
  };

  const activeSection = sections.find((s) => s.id === selectedSectionId) ?? sections[0];
  const activeSectionOccupied = activeSection ? activeSection.bins.filter((b) => Boolean(b.skuId)).length : 0;
  const activeSectionTotal = activeSection ? activeSection.bins.length : 0;
  const activeSectionEmpty = Math.max(0, activeSectionTotal - activeSectionOccupied);
  const activeSectionPct = activeSectionTotal > 0 ? Math.round((activeSectionOccupied / activeSectionTotal) * 100) : 0;
  const activeSectionAlerts = activeSection
    ? activeSection.bins.filter((b) => {
        const item = items.find((i) => i.id === b.skuId);
        return item ? item.stock <= item.re || (item.exp !== null && item.exp <= 3) : false;
      }).length
    : 0;

  const selectedBinObj = selectedBin
    ? sections.find((s) => s.id === selectedBin.sectionId)?.bins.find((b) => b.code === selectedBin.code) ?? null
    : null;
  const selectedBinItem = selectedBinObj?.skuId ? items.find((i) => i.id === selectedBinObj.skuId) ?? null : null;

  const handleAddZone = () => {
    const num = zones.length + 1;
    const next: WarehouseZone = {
      id: `wh-${Date.now()}`,
      name: `Dark Store #${12 + num} · Zone ${num}`,
      subtitle: "Overflow Express",
    };
    setZones((prev) => [...prev, next]);
    setActiveZoneId(next.id);
    pushLog("add", `Added warehouse zone: ${next.name}`, 0);
    showToast(`Added ${next.name}`);
  };

  const handleAddSection = () => {
    const code = String.fromCharCode(65 + (sections.length % 26));
    const tints = ["#E3F0DA", "#FFF0DA", "#F3E6CF", "#E8F0FA", "#EDE3F5"];
    const next: WarehouseSection = {
      id: `sec-${Date.now()}`,
      code,
      name: `Aisle ${code} · New`,
      tint: tints[sections.length % tints.length],
      bins: Array.from({ length: 12 }, (_, idx) => ({ code: `${code}${idx + 1}`, skuId: null })),
    };
    setSections((prev) => [...prev, next]);
    setSelectedSectionId(next.id);
    setSelectedBin({ sectionId: next.id, code: `${code}1` });
    pushLog("add", `Added section ${code} (${next.name})`, 0);
    showToast(`Added Section ${code}`);
  };

  const handleRenameSection = () => {
    if (!activeSection) return;
    const nextName = window.prompt("Rename section:", activeSection.name);
    if (!nextName || !nextName.trim()) return;
    setSections((prev) => prev.map((s) => (s.id === activeSection.id ? { ...s, name: nextName.trim() } : s)));
    pushLog("edit", `Renamed section ${activeSection.code} to ${nextName.trim()}`, 0);
    showToast("Section updated");
  };

  const handleDeleteSection = () => {
    if (!activeSection || sections.length <= 1) {
      showToast("At least one section is required");
      return;
    }
    const remaining = sections.filter((s) => s.id !== activeSection.id);
    setSections(remaining);
    setSelectedSectionId(remaining[0].id);
    setSelectedBin(null);
    pushLog("delete", `Removed section ${activeSection.code} · ${activeSection.name}`, 0);
    showToast(`Removed Section ${activeSection.code}`);
  };

  const assignBinSku = (sectionId: string, binCode: string, skuId: string | null) => {
    setSections((prev) =>
      prev.map((s) =>
        s.id === sectionId
          ? { ...s, bins: s.bins.map((b) => (b.code === binCode ? { ...b, skuId } : b)) }
          : s,
      ),
    );
    const skuName = skuId ? items.find((i) => i.id === skuId)?.name ?? "SKU" : "Empty";
    pushLog("edit", `Shelf ${binCode} updated -> ${skuName}`, 0);
    showToast(skuId ? `Assigned ${skuName} to ${binCode}` : `Cleared shelf ${binCode}`);
  };

  const verifyRiderHandover = (order: StoreOrderCard) => {
    const entered = (pinInputs[order.id] ?? "").trim();
    if (entered !== order.pickupPin) {
      showToast(`Invalid PIN · expected ${order.pickupPin}`);
      return;
    }
    advanceOrderStage(order.id, "handed");
    setPinInputs((prev) => ({ ...prev, [order.id]: "" }));
  };

  const downloadCsv = (filename: string, headers: string[], rows: (string | number)[][], label: string) => {
    const escape = (v: string | number) => `"${String(v).replaceAll('"', '""')}"`;
    const csv = [headers.map(escape).join(","), ...rows.map((r) => r.map(escape).join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    pushLog("po", `Exported ${label}`, 0);
    showToast(`Downloaded ${filename}`);
  };

  const totalAlerts = lowItems.length + metrics.expiring.length;

  const navItems = [
    { id: "dash", label: "Dashboard", icon: LayoutDashboard },
    { id: "wh", label: "Warehouses", icon: Warehouse },
    { id: "orders", label: "Orders", icon: ClipboardList, badge: pendingOrdersCount },
    { id: "inv", label: "Inventory", icon: Boxes },
    { id: "rs", label: "Restock", icon: Package, badge: lowItems.length },
    { id: "ship", label: "Shipments", icon: Truck },
    { id: "rep", label: "Export Reports", icon: FileSpreadsheet },
    { id: "log", label: "Activity", icon: History },
  ] as const;

  return (
    <div className="flex h-screen overflow-hidden bg-[#FBF6EE] text-[13px] text-[#3A2418]">
      {/* Desktop Sidebar */}
      <aside className="hidden w-[192px] flex-none flex-col gap-1 border-r border-[#F0E4D2] bg-white px-3 py-3.5 sm:flex">
        <div className="flex items-center gap-2.5 px-1.5 pb-3.5">
          <span className="grid size-8 shrink-0 place-items-center rounded-[10px] bg-[#A8421A] text-white shadow-xs">
            <Warehouse className="size-4" />
          </span>
          <div className="min-w-0 leading-tight">
            <span className="block text-sm font-bold tracking-tight">Tikk Stock</span>
            <span className="block text-[10px] font-medium text-[#8A7060]">Dark Store Ops</span>
          </div>
        </div>

        {navItems.map((nav) => {
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
              <span className="truncate">{nav.label}</span>
              {"badge" in nav && nav.badge > 0 && (
                <span className="ml-auto rounded-full bg-[#D9453D] px-1.5 text-[10px] font-semibold leading-4 text-white">
                  {nav.badge}
                </span>
              )}
            </button>
          );
        })}

        <div className="mt-auto space-y-1 rounded-xl border border-[#F5DDB8] bg-[#FFF0DA] p-2.5 text-[11px] text-[#8A7060]">
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
      <main className="min-w-0 flex-1 overflow-x-hidden overflow-y-auto">
        <header className="sticky top-0 z-10 flex items-center gap-2 border-b border-[#F0E4D2] bg-[#FBF6EE]/95 px-3 py-2.5 backdrop-blur-sm sm:gap-2.5 sm:px-4">
          <span className="grid size-8 shrink-0 place-items-center rounded-[9px] bg-[#A8421A] text-white sm:hidden">
            <Warehouse className="size-4" />
          </span>

          <div className="flex h-9 min-w-0 flex-1 items-center gap-2 rounded-full border border-[#EADBC6] bg-white px-3 text-[#8A7060] sm:max-w-sm">
            <Search className="size-4 shrink-0" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && tab !== "inv") setTab("inv");
              }}
              placeholder="Search SKUs, racks, orders..."
              className="min-w-0 w-full bg-transparent text-xs text-[#3A2418] placeholder-[#A89282] focus:outline-none"
            />
            {query && (
              <button type="button" onClick={() => setQuery("")} className="shrink-0 text-[#A89282] hover:text-[#3A2418]">
                <X className="size-3.5" />
              </button>
            )}
          </div>

          <div className="flex shrink-0 items-center gap-1.5 sm:ml-auto sm:gap-2">
            <div className="relative">
              <button
                type="button"
                aria-label="Alerts"
                onClick={() => setNotifOpen((v) => !v)}
                className="relative grid size-9 place-items-center rounded-full border border-[#EADBC6] bg-white text-[#8A7060] hover:bg-[#FFF8EE]"
              >
                <Bell className="size-4" />
                {totalAlerts > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 rounded-full bg-[#D9453D] px-1 text-[9px] font-bold leading-4 text-white">
                    {totalAlerts}
                  </span>
                )}
              </button>
              {notifOpen && (
                <div className="absolute right-0 mt-2 w-72 rounded-2xl border border-[#EADBC6] bg-white p-3 shadow-lg z-30">
                  <div className="mb-2 flex items-center justify-between">
                    <strong className="text-xs font-bold">Store Alerts ({totalAlerts})</strong>
                    <button type="button" onClick={() => setNotifOpen(false)} className="text-[11px] text-[#8A7060]">
                      Close
                    </button>
                  </div>
                  <div className="space-y-1.5 text-xs">
                    <button
                      type="button"
                      onClick={() => {
                        setNotifOpen(false);
                        setTab("rs");
                      }}
                      className="flex w-full items-center justify-between rounded-xl bg-[#FFF0DA] px-2.5 py-2 text-left hover:bg-[#FBE3CF]"
                    >
                      <span>{lowItems.length} SKUs below reorder level</span>
                      <span className="font-semibold text-[#A8421A]">Restock →</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setNotifOpen(false);
                        setTab("dash");
                      }}
                      className="flex w-full items-center justify-between rounded-xl bg-[#FBF6EE] px-2.5 py-2 text-left hover:bg-[#FBE3CF]"
                    >
                      <span>{metrics.expiring.length} batches expiring in ≤3d</span>
                      <span className="font-semibold text-[#A8421A]">Review →</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            <label className="flex cursor-pointer items-center gap-2 rounded-full border border-[#EADBC6] bg-white px-3 py-1.5 text-xs text-[#8A7060]">
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
                className={`relative h-4 w-7 rounded-full transition-colors ${liveSales ? "bg-[#2E7D4F]" : "bg-[#E5D6C2]"}`}
              >
                <span
                  className={`absolute top-0.5 left-0.5 size-3 rounded-full bg-white transition-transform ${
                    liveSales ? "translate-x-3" : ""
                  }`}
                />
              </button>
            </label>

            <div className="hidden items-center gap-2 rounded-full border border-[#EADBC6] bg-white py-1 pr-3 pl-1.5 md:flex">
              <span className="grid size-7 place-items-center rounded-full bg-[#FBE3CF] text-[11px] font-bold text-[#A8421A]">
                {(user?.name ?? "SM").slice(0, 2).toUpperCase()}
              </span>
              <span className="text-xs font-semibold">{user?.name ?? "Store Manager"}</span>
            </div>
          </div>
        </header>

        {/* Mobile Scrollable Tab Navigation */}
        <nav
          aria-label="Mobile sections"
          className="flex items-center gap-1.5 overflow-x-auto border-b border-[#F0E4D2] bg-white px-3 py-2 sm:hidden"
        >
          {navItems.map((nav) => {
            const Icon = nav.icon;
            const active = tab === nav.id;
            return (
              <button
                key={nav.id}
                type="button"
                onClick={() => setTab(nav.id)}
                className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                  active ? "bg-[#A8421A] font-semibold text-white" : "border border-[#EADBC6] bg-[#FCF9F4] text-[#8A7060]"
                }`}
              >
                <Icon className="size-3.5 shrink-0" />
                <span>{nav.label}</span>
                {"badge" in nav && nav.badge > 0 && (
                  <span
                    className={`rounded-full px-1.5 text-[10px] font-bold leading-4 ${
                      active ? "bg-white/20 text-white" : "bg-[#D9453D] text-white"
                    }`}
                  >
                    {nav.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        <div className="space-y-3 p-3 sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h1 className="text-xl font-bold tracking-tight text-[#3A2418]">
              {pageTitles[tab]}
              {tab === "wh" && <span className="ml-1.5 font-semibold text-[#8A7060]">({zones.length})</span>}
            </h1>
            {tab === "wh" && (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setWhFilter((f) => (f === "occupied" ? "all" : "occupied"))}
                  className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium ${
                    whFilter === "occupied"
                      ? "border-[#A8421A] bg-[#FBE3CF] text-[#A8421A]"
                      : "border-[#EADBC6] bg-white text-[#3A2418] hover:bg-[#FFF8EE]"
                  }`}
                >
                  <SlidersHorizontal className="size-3.5" />
                  {whFilter === "occupied" ? "Occupied only" : "Sort & Filter"}
                </button>
                <button
                  type="button"
                  onClick={() => setWhFilter((f) => (f === "alerts" ? "all" : "alerts"))}
                  className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium ${
                    whFilter === "alerts"
                      ? "border-[#D9453D] bg-[#FBE1DD] text-[#C0392B]"
                      : "border-[#EADBC6] bg-white text-[#3A2418] hover:bg-[#FFF8EE]"
                  }`}
                >
                  Filter by ({totalAlerts})
                </button>
              </div>
            )}
          </div>
          {tab === "dash" && (
            <div className="space-y-3.5">
              {/* Executive Store Pulse Strip */}
              <section className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#F0E4D2] bg-gradient-to-r from-[#FFF7EC] via-white to-[#FBE3CF]/40 p-3.5 shadow-[0_1px_2px_rgba(58,36,24,0.04)]">
                <div className="flex flex-wrap items-center gap-2.5">
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold ${
                      acceptingOrders ? "bg-[#E3F0DA] text-[#2E7D4F]" : "bg-[#FBE1DD] text-[#C0392B]"
                    }`}
                  >
                    <span className={`size-1.5 rounded-full ${acceptingOrders ? "bg-[#2E7D4F]" : "bg-[#C0392B]"}`} />
                    {acceptingOrders ? "Store Open" : "Store Paused"}
                  </span>
                  <span className="text-xs font-semibold text-[#3A2418]">
                    {activeStore?.name ?? "Park Street, Kolkata"}
                  </span>
                  <span className="text-xs text-[#8A7060]">· Prep ETA {prepTimeMin}m · {pendingOrdersCount} active orders</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setTab("orders")}
                    className="rounded-full bg-[#A8421A] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#8E3513]"
                  >
                    Open Orders Queue
                  </button>
                  <button
                    type="button"
                    onClick={() => setTab("wh")}
                    className="rounded-full border border-[#EADBC6] bg-white px-3 py-1.5 text-xs font-semibold text-[#3A2418] hover:bg-[#FFF8EE]"
                  >
                    Rack Map
                  </button>
                </div>
              </section>

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

          {tab === "wh" && (
            <div className="space-y-3.5">
              {/* Store / Warehouse Selector Pills (IronNest-style) */}
              <div className="flex items-center gap-2 overflow-x-auto pb-1">
                {zones.map((z) => {
                  const active = z.id === activeZoneId;
                  return (
                    <button
                      key={z.id}
                      type="button"
                      onClick={() => setActiveZoneId(z.id)}
                      className={`shrink-0 rounded-full px-4 py-2 text-xs font-semibold transition-colors ${
                        active
                          ? "bg-[#A8421A] text-white shadow-xs"
                          : "border border-[#EADBC6] bg-white text-[#3A2418] hover:bg-[#FFF8EE]"
                      }`}
                    >
                      {z.name}
                    </button>
                  );
                })}
                <button
                  type="button"
                  aria-label="Previous zone"
                  onClick={() => {
                    const idx = zones.findIndex((z) => z.id === activeZoneId);
                    setActiveZoneId(zones[(idx - 1 + zones.length) % zones.length].id);
                  }}
                  className="grid size-8 shrink-0 place-items-center rounded-full border border-[#EADBC6] bg-white text-[#8A7060] hover:bg-[#FFF8EE]"
                >
                  <ChevronLeft className="size-4" />
                </button>
                <button
                  type="button"
                  aria-label="Next zone"
                  onClick={() => {
                    const idx = zones.findIndex((z) => z.id === activeZoneId);
                    setActiveZoneId(zones[(idx + 1) % zones.length].id);
                  }}
                  className="grid size-8 shrink-0 place-items-center rounded-full border border-[#EADBC6] bg-white text-[#8A7060] hover:bg-[#FFF8EE]"
                >
                  <ChevronRight className="size-4" />
                </button>
                <button
                  type="button"
                  aria-label="Add warehouse zone"
                  onClick={handleAddZone}
                  className="grid size-8 shrink-0 place-items-center rounded-full bg-[#A8421A] text-white hover:bg-[#8E3513]"
                >
                  <Plus className="size-4" />
                </button>
              </div>

              {/* 2-Column IronNest Grid: Section Overview + Usage Donut & Inventory Overview */}
              <div className="grid gap-3.5 lg:grid-cols-[1.55fr_1fr]">
                {/* Left Card: Section Overview */}
                <section className="flex flex-col rounded-2xl border border-[#F0E4D2] bg-white p-4">
                  <div className="mb-3.5 flex flex-wrap items-center justify-between gap-2">
                    <strong className="text-sm font-bold text-[#3A2418]">
                      Section Overview ({sections.reduce((sum, s) => sum + s.bins.length, 0)})
                    </strong>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <button
                        type="button"
                        onClick={handleAddSection}
                        className="inline-flex items-center gap-1 rounded-full border border-[#EADBC6] bg-[#FBF6EE] px-2.5 py-1 text-[11px] font-semibold text-[#3A2418] hover:bg-[#FBE3CF]"
                      >
                        <Plus className="size-3" /> Add Section
                      </button>
                      <button
                        type="button"
                        onClick={handleRenameSection}
                        className="inline-flex items-center gap-1 rounded-full border border-[#EADBC6] bg-white px-2.5 py-1 text-[11px] font-semibold text-[#3A2418] hover:bg-[#FFF8EE]"
                      >
                        <Pencil className="size-3" /> Edit Section
                      </button>
                      <button
                        type="button"
                        onClick={handleDeleteSection}
                        className="inline-flex items-center gap-1 rounded-full border border-[#F5C2BC] bg-white px-2.5 py-1 text-[11px] font-semibold text-[#C0392B] hover:bg-[#FBE1DD]"
                      >
                        <Trash2 className="size-3" /> Delete Section
                      </button>
                    </div>
                  </div>

                  <div className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-4">
                    {sections.map((sec) => {
                      const isSelected = sec.id === activeSection?.id;
                      const occ = sec.bins.filter((b) => Boolean(b.skuId)).length;
                      return (
                        <div
                          key={sec.id}
                          onClick={() => setSelectedSectionId(sec.id)}
                          className={`cursor-pointer rounded-2xl border p-2.5 transition-all ${
                            isSelected
                              ? "border-[#A8421A] bg-[#FFFDF9] ring-1 ring-[#A8421A]/20"
                              : "border-[#F0E4D2] bg-[#FCF9F4] hover:border-[#D9C3A8]"
                          }`}
                        >
                          <div className="mb-2 flex items-center justify-between gap-1 text-[11px]">
                            <strong className="truncate font-semibold text-[#3A2418]">
                              {sec.code} · {sec.name}
                            </strong>
                            <span className="shrink-0 font-semibold text-[#8A7060] tabular-nums">
                              {occ}/{sec.bins.length}
                            </span>
                          </div>

                          <div className="grid grid-cols-2 gap-1.5">
                            {sec.bins.map((bin) => {
                              const binItem = bin.skuId ? items.find((i) => i.id === bin.skuId) : null;
                              const isAlert = Boolean(
                                binItem && (binItem.stock <= binItem.re || (binItem.exp !== null && binItem.exp <= 3)),
                              );
                              const dimmed =
                                (whFilter === "occupied" && !bin.skuId) ||
                                (whFilter === "alerts" && !isAlert);
                              const isBinSelected =
                                selectedBin?.sectionId === sec.id && selectedBin?.code === bin.code;
                              return (
                                <button
                                  key={bin.code}
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedSectionId(sec.id);
                                    setSelectedBin({ sectionId: sec.id, code: bin.code });
                                  }}
                                  style={bin.skuId ? { backgroundColor: sec.tint } : undefined}
                                  className={`relative flex h-10 items-center justify-center rounded-xl border text-xs font-semibold transition-all hover:-translate-y-0.5 ${
                                    bin.skuId
                                      ? "border-transparent text-[#3A2418] shadow-[0_1px_2px_rgba(58,36,24,0.06)] hover:brightness-95"
                                      : "border-dashed border-[#E2D2BC] bg-[repeating-linear-gradient(135deg,#FAF4EA,#FAF4EA_4px,#F1E6D6_4px,#F1E6D6_8px)] text-[#A89282] hover:border-[#A8421A]"
                                  } ${isBinSelected ? "ring-2 ring-[#A8421A]" : ""} ${dimmed ? "opacity-30" : ""}`}
                                >
                                  {bin.code}
                                  {isAlert && (
                                    <span className="absolute top-1 right-1 size-1.5 rounded-full bg-[#D9453D]" />
                                  )}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Interactive Shelf Bin Inspector */}
                  {selectedBin && (
                    <div className="mt-3.5 flex flex-wrap items-center justify-between gap-2.5 rounded-xl border border-[#F0E4D2] bg-[#FBF6EE] px-3.5 py-2.5">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="rounded-md bg-[#A8421A] px-2 py-0.5 font-mono text-[11px] font-bold text-white">
                            Shelf {selectedBin.code}
                          </span>
                          <strong className="truncate text-xs font-semibold text-[#3A2418]">
                            {selectedBinItem ? `${selectedBinItem.name} (${selectedBinItem.stock} in stock)` : "Empty Shelf Slot"}
                          </strong>
                        </div>
                        <p className="mt-0.5 text-[11px] text-[#8A7060]">
                          {selectedBinItem
                            ? `${selectedBinItem.sku} · ${formatInr(selectedBinItem.price)} · Reorder at ${selectedBinItem.re}`
                            : "Assign a SKU from inventory to activate this rack slot."}
                        </p>
                      </div>

                      <div className="flex flex-wrap items-center gap-1.5">
                        {selectedBinItem ? (
                          <>
                            <button
                              type="button"
                              onClick={() => adjustStock(selectedBinItem.id, 5)}
                              className="rounded-lg bg-[#2E7D4F] px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-[#23633d]"
                            >
                              +5 Units
                            </button>
                            <button
                              type="button"
                              onClick={() => adjustStock(selectedBinItem.id, -1)}
                              className="rounded-lg border border-[#EADBC6] bg-white px-2.5 py-1 text-[11px] font-semibold text-[#3A2418]"
                            >
                              -1
                            </button>
                            <button
                              type="button"
                              onClick={() => assignBinSku(selectedBin.sectionId, selectedBin.code, null)}
                              className="rounded-lg border border-[#F5C2BC] bg-white px-2.5 py-1 text-[11px] font-semibold text-[#C0392B]"
                            >
                              Clear Shelf
                            </button>
                          </>
                        ) : (
                          <select
                            aria-label="Assign SKU to shelf"
                            defaultValue=""
                            onChange={(e) => {
                              if (e.target.value) assignBinSku(selectedBin.sectionId, selectedBin.code, e.target.value);
                            }}
                            className="h-8 rounded-lg border border-[#EADBC6] bg-white px-2.5 text-xs font-medium text-[#3A2418]"
                          >
                            <option value="" disabled>
                              + Assign SKU to {selectedBin.code}…
                            </option>
                            {items.map((it) => (
                              <option key={it.id} value={it.id}>
                                {it.name} ({it.stock} left)
                              </option>
                            ))}
                          </select>
                        )}
                      </div>
                    </div>
                  )}
                </section>

                {/* Right Column: Section Usage Donut + Inventory Overview */}
                <div className="flex flex-col gap-3.5">
                  <section className="rounded-2xl border border-[#F0E4D2] bg-white p-4">
                    <strong className="block text-sm font-bold text-[#3A2418]">
                      {activeSection?.code}-Section Usage
                    </strong>
                    <div className="mt-3 flex items-center gap-4">
                      <div className="relative size-[104px] shrink-0">
                        <svg viewBox="0 0 100 100" className="size-full -rotate-90">
                          <circle cx="50" cy="50" r="40" fill="none" stroke="#F3E6D4" strokeWidth="10" />
                          <circle
                            cx="50"
                            cy="50"
                            r="40"
                            fill="none"
                            stroke="#E09F3E"
                            strokeWidth="10"
                            strokeLinecap="round"
                            strokeDasharray={`${(activeSectionPct / 100) * 251.3} 251.3`}
                          />
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                          <b className="text-lg font-bold tabular-nums text-[#3A2418]">{activeSectionPct}%</b>
                          <span className="text-[10px] text-[#8A7060]">Location Used</span>
                        </div>
                      </div>

                      <div className="grid flex-1 grid-cols-2 gap-x-3 gap-y-2.5 text-xs">
                        <div>
                          <b className="block text-base font-bold tabular-nums">{activeSectionTotal}</b>
                          <span className="text-[11px] text-[#8A7060]">Total Shelves</span>
                        </div>
                        <div>
                          <b className="block text-base font-bold tabular-nums">{activeSectionEmpty}</b>
                          <span className="text-[11px] text-[#8A7060]">Empty Shelves</span>
                        </div>
                        <div>
                          <b className="block text-base font-bold tabular-nums">{activeSectionOccupied}</b>
                          <span className="text-[11px] text-[#8A7060]">Full Shelves</span>
                        </div>
                        <div>
                          <b className="block text-base font-bold tabular-nums text-[#A8421A]">{activeSectionAlerts}</b>
                          <span className="text-[11px] text-[#8A7060]">Low / Expiring</span>
                        </div>
                      </div>
                    </div>
                  </section>

                  <section className="rounded-2xl border border-[#F0E4D2] bg-white p-4">
                    <strong className="mb-3 block text-sm font-bold text-[#3A2418]">Inventory Overview</strong>
                    <div className="grid grid-cols-2 gap-2.5">
                      <div className="rounded-xl border border-[#F0E4D2] bg-[#FCF9F4] p-3">
                        <div className="flex items-center justify-between">
                          <span className="grid size-7 place-items-center rounded-lg bg-[#FBE3CF] text-[#A8421A]">
                            <Package className="size-3.5" />
                          </span>
                          <span className="inline-flex items-center gap-0.5 text-[11px] font-bold text-[#2E7D4F]">
                            26% <TrendingUp className="size-3" />
                          </span>
                        </div>
                        <b className="mt-2 block text-lg font-bold tabular-nums">{storeOrders.length + 124}</b>
                        <span className="text-[11px] text-[#8A7060]">Orders Received</span>
                      </div>

                      <div className="rounded-xl border border-[#F0E4D2] bg-[#FCF9F4] p-3">
                        <div className="flex items-center justify-between">
                          <span className="grid size-7 place-items-center rounded-lg bg-[#E3F0DA] text-[#2E7D4F]">
                            <Truck className="size-3.5" />
                          </span>
                          <span className="inline-flex items-center gap-0.5 text-[11px] font-bold text-[#2E7D4F]">
                            18% <TrendingUp className="size-3" />
                          </span>
                        </div>
                        <b className="mt-2 block text-lg font-bold tabular-nums">
                          {storeOrders.filter((o) => o.stage === "handed" || o.stage === "ready").length + 112}
                        </b>
                        <span className="text-[11px] text-[#8A7060]">Orders Dispatched</span>
                      </div>

                      <div className="rounded-xl border border-[#F0E4D2] bg-[#FCF9F4] p-3">
                        <div className="flex items-center justify-between">
                          <span className="grid size-7 place-items-center rounded-lg bg-[#FBE1DD] text-[#C0392B]">
                            <AlertTriangle className="size-3.5" />
                          </span>
                          <span className="inline-flex items-center gap-0.5 text-[11px] font-bold text-[#C0392B]">
                            {lowItems.length} <TrendingDown className="size-3" />
                          </span>
                        </div>
                        <b className="mt-2 block text-lg font-bold tabular-nums">{lowItems.length}</b>
                        <span className="text-[11px] text-[#8A7060]">Low Stock SKUs</span>
                      </div>

                      <div className="rounded-xl border border-[#F0E4D2] bg-[#FCF9F4] p-3">
                        <div className="flex items-center justify-between">
                          <span className="grid size-7 place-items-center rounded-lg bg-[#FFF0DA] text-[#B7791F]">
                            <IndianRupee className="size-3.5" />
                          </span>
                          <span className="inline-flex items-center gap-0.5 text-[11px] font-bold text-[#2E7D4F]">
                            Live
                          </span>
                        </div>
                        <b className="mt-2 block text-lg font-bold tabular-nums">{formatInr(metrics.totalValue)}</b>
                        <span className="text-[11px] text-[#8A7060]">Stock Valuation</span>
                      </div>
                    </div>
                  </section>
                </div>
              </div>
            </div>
          )}

          {tab === "ship" && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
                <div className="rounded-2xl border border-[#F0E4D2] bg-white p-3.5">
                  <span className="text-xs text-[#8A7060]">Ready for Rider Pickup</span>
                  <b className="mt-1 block text-2xl font-bold tabular-nums">
                    {storeOrders.filter((o) => o.stage === "ready").length}
                  </b>
                </div>
                <div className="rounded-2xl border border-[#F0E4D2] bg-white p-3.5">
                  <span className="text-xs text-[#8A7060]">Handed Over Today</span>
                  <b className="mt-1 block text-2xl font-bold tabular-nums text-[#2E7D4F]">
                    {storeOrders.filter((o) => o.stage === "handed").length}
                  </b>
                </div>
                <div className="col-span-2 rounded-2xl border border-[#F0E4D2] bg-white p-3.5 sm:col-span-1">
                  <span className="text-xs text-[#8A7060]">COD Reconciliation</span>
                  <b className="mt-1 block text-2xl font-bold tabular-nums text-[#A8421A]">
                    {formatInr(
                      storeOrders.filter((o) => o.payment === "COD").reduce((s, o) => s + o.total, 0),
                    )}
                  </b>
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                {storeOrders.map((order) => (
                  <article key={order.id} className="rounded-2xl border border-[#F0E4D2] bg-white p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <strong className="text-sm font-bold">Order #{order.orderNo}</strong>
                        <p className="text-xs text-[#8A7060]">
                          {order.customer} · {order.payment} · {formatInr(order.total)}
                        </p>
                      </div>
                      <span
                        className={`rounded-lg px-2 py-0.5 text-[11px] font-bold ${
                          order.stage === "handed"
                            ? "bg-[#E3F0DA] text-[#2E7D4F]"
                            : order.stage === "ready"
                              ? "bg-[#FFF0DA] text-[#B7791F]"
                              : "bg-[#FBF6EE] text-[#8A7060]"
                        }`}
                      >
                        {order.stage === "handed" ? "Dispatched" : order.stage === "ready" ? `PIN ${order.pickupPin}` : "In store"}
                      </span>
                    </div>

                    {order.stage === "ready" && (
                      <div className="mt-3 flex items-center gap-2 border-t border-[#F5EBDB] pt-3">
                        <input
                          value={pinInputs[order.id] ?? ""}
                          onChange={(e) => setPinInputs((prev) => ({ ...prev, [order.id]: e.target.value }))}
                          placeholder={`Enter Rider PIN (${order.pickupPin})`}
                          className="h-9 flex-1 rounded-xl border border-[#EADBC6] bg-[#FBF6EE] px-3 text-xs font-mono"
                        />
                        <button
                          type="button"
                          onClick={() => verifyRiderHandover(order)}
                          className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-[#A8421A] px-3.5 text-xs font-semibold text-white hover:bg-[#8E3513]"
                        >
                          <ShieldCheck className="size-3.5" /> Verify &amp; Handover
                        </button>
                      </div>
                    )}
                  </article>
                ))}
              </div>
            </div>
          )}

          {tab === "rep" && (
            <div className="grid gap-3 md:grid-cols-2">
              {[
                {
                  title: "Full Inventory Valuation Report",
                  desc: "All SKUs, selling price, MRP, stock count, reorder level & stock value.",
                  file: "tikk-stock-inventory.csv",
                  run: () =>
                    downloadCsv(
                      "tikk-stock-inventory.csv",
                      ["SKU", "Name", "Brand", "Category", "Stock", "Reorder", "Price", "MRP", "Valuation"],
                      items.map((p) => [p.sku, p.name, p.brand, p.cat, p.stock, p.re, p.price, p.mrp, p.stock * p.price]),
                      "Inventory Valuation CSV",
                    ),
                },
                {
                  title: "Low Stock & Reorder Queue",
                  desc: "Items at or below reorder threshold with recommended purchase quantities.",
                  file: "tikk-stock-reorder.csv",
                  run: () =>
                    downloadCsv(
                      "tikk-stock-reorder.csv",
                      ["SKU", "Name", "Category", "Current Stock", "Reorder At", "Suggested Qty"],
                      lowItems.map((p) => [p.sku, p.name, p.cat, p.stock, p.re, Math.max(1, p.re * 3 - p.stock)]),
                      "Low Stock Reorder CSV",
                    ),
                },
                {
                  title: "Expiring Batches (FEFO)",
                  desc: "Perishable items expiring within 3 days for markdown or clearance.",
                  file: "tikk-stock-expiring.csv",
                  run: () =>
                    downloadCsv(
                      "tikk-stock-expiring.csv",
                      ["SKU", "Name", "Category", "Stock", "Expires In (Days)"],
                      metrics.expiring.map((p) => [p.sku, p.name, p.cat, p.stock, p.exp ?? 0]),
                      "Expiring FEFO CSV",
                    ),
                },
                {
                  title: "Orders & COD Settlement",
                  desc: "Active and dispatched dark-store orders with payment mode and totals.",
                  file: "tikk-stock-orders.csv",
                  run: () =>
                    downloadCsv(
                      "tikk-stock-orders.csv",
                      ["Order #", "Customer", "Payment", "Total INR", "Stage", "Rider PIN"],
                      storeOrders.map((o) => [o.orderNo, o.customer, o.payment, o.total, o.stage, o.pickupPin]),
                      "Orders & COD CSV",
                    ),
                },
              ].map((rep) => (
                <article key={rep.file} className="flex flex-col justify-between rounded-2xl border border-[#F0E4D2] bg-white p-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="grid size-8 place-items-center rounded-xl bg-[#FBE3CF] text-[#A8421A]">
                        <FileSpreadsheet className="size-4" />
                      </span>
                      <strong className="text-sm font-bold">{rep.title}</strong>
                    </div>
                    <p className="mt-2 text-xs text-[#8A7060]">{rep.desc}</p>
                  </div>
                  <div className="mt-4 flex items-center justify-between border-t border-[#F5EBDB] pt-3">
                    <span className="font-mono text-[11px] text-[#8A7060]">{rep.file}</span>
                    <button
                      type="button"
                      onClick={rep.run}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-[#A8421A] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#8E3513]"
                    >
                      <Download className="size-3.5" /> Download CSV
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}

          {tab === "inv" && (() => {
            const selectedIds = filteredItems.filter((p) => selectedInvIds[p.id]).map((p) => p.id);
            const allChecked = filteredItems.length > 0 && selectedIds.length === filteredItems.length;
            return (
              <div className="space-y-3.5">
                {/* 4 Inventory KPI Summary Cards */}
                <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4">
                  <button
                    type="button"
                    onClick={() => setStatusFilter("all")}
                    className="rounded-2xl border border-[#F0E4D2] bg-white p-3.5 text-left transition-colors hover:border-[#D9C3A8]"
                  >
                    <div className="flex items-center justify-between text-xs text-[#8A7060]">
                      <span>Total SKUs</span>
                      <Boxes className="size-4 text-[#A8421A]" />
                    </div>
                    <b className="mt-1.5 block text-2xl font-bold tabular-nums">{items.length}</b>
                    <span className="text-[11px] text-[#8A7060]">{metrics.totalUnits} total units</span>
                  </button>

                  <div className="rounded-2xl border border-[#F0E4D2] bg-white p-3.5">
                    <div className="flex items-center justify-between text-xs text-[#8A7060]">
                      <span>Stock Valuation</span>
                      <IndianRupee className="size-4 text-[#2E7D4F]" />
                    </div>
                    <b className="mt-1.5 block text-2xl font-bold tabular-nums">{formatInr(metrics.totalValue)}</b>
                    <span className="text-[11px] font-medium text-[#2E7D4F]">At selling price</span>
                  </div>

                  <button
                    type="button"
                    onClick={() => setStatusFilter("lo")}
                    className="rounded-2xl border border-[#F0E4D2] bg-white p-3.5 text-left transition-colors hover:border-[#E09F3E]"
                  >
                    <div className="flex items-center justify-between text-xs text-[#8A7060]">
                      <span>Low Stock</span>
                      <AlertTriangle className="size-4 text-[#B7791F]" />
                    </div>
                    <b className="mt-1.5 block text-2xl font-bold tabular-nums text-[#B7791F]">{metrics.lowCount}</b>
                    <span className="text-[11px] text-[#8A7060]">Below reorder point</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setStatusFilter("ou")}
                    className="rounded-2xl border border-[#F0E4D2] bg-white p-3.5 text-left transition-colors hover:border-[#D9453D]"
                  >
                    <div className="flex items-center justify-between text-xs text-[#8A7060]">
                      <span>Out / Expiring</span>
                      <XCircle className="size-4 text-[#C0392B]" />
                    </div>
                    <b className="mt-1.5 block text-2xl font-bold tabular-nums text-[#C0392B]">{metrics.outCount}</b>
                    <span className="text-[11px] text-[#8A7060]">{metrics.expiring.length} expiring ≤3d</span>
                  </button>
                </div>

                {/* Filter & Bulk Action Toolbar */}
                <section className="space-y-2.5 rounded-2xl border border-[#F0E4D2] bg-white p-3.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="flex h-9 min-w-[200px] flex-1 items-center gap-2 rounded-full border border-[#EADBC6] bg-[#FBF6EE] px-3 text-[#8A7060]">
                      <Search className="size-4 shrink-0" />
                      <input
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Search SKU, product name or brand..."
                        className="min-w-0 flex-1 bg-transparent text-xs text-[#3A2418] outline-none"
                      />
                      {query && (
                        <button type="button" onClick={() => setQuery("")} className="text-[#8A7060] hover:text-[#3A2418]">
                          <X className="size-3.5" />
                        </button>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={exportCsv}
                      className="inline-flex h-9 items-center gap-1.5 rounded-full border border-[#EADBC6] bg-white px-3.5 text-xs font-semibold text-[#3A2418] hover:bg-[#FFF8EE]"
                    >
                      <Download className="size-3.5" />
                      Export CSV
                    </button>
                    <button
                      type="button"
                      onClick={() => openModal(null)}
                      className="inline-flex h-9 items-center gap-1.5 rounded-full bg-[#A8421A] px-4 text-xs font-semibold text-white hover:bg-[#8E3513]"
                    >
                      <Plus className="size-3.5" />
                      Add product
                    </button>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap gap-1.5">
                      {["All", ...CATEGORIES].map((c) => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => setCatFilter(c)}
                          className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                            catFilter === c
                              ? "border-[#A8421A] bg-[#A8421A] text-white"
                              : "border-[#EADBC6] bg-[#FCF9F4] text-[#3A2418] hover:bg-[#FBE3CF]/50"
                          }`}
                        >
                          {c}
                        </button>
                      ))}
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5">
                      {(
                        [
                          ["all", "All"],
                          ["in", "In stock"],
                          ["lo", "Low"],
                          ["ou", "Out"],
                        ] as const
                      ).map(([id, label]) => (
                        <button
                          key={id}
                          type="button"
                          onClick={() => setStatusFilter(id)}
                          className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${
                            statusFilter === id
                              ? "border-[#3A2418] bg-[#3A2418] text-white"
                              : "border-[#EADBC6] bg-white text-[#8A7060] hover:bg-[#FFF8EE]"
                          }`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {selectedIds.length > 0 && (
                    <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[#F5DDB8] bg-[#FFF0DA] px-3 py-2 text-xs">
                      <span className="font-semibold text-[#3A2418]">{selectedIds.length} SKUs selected</span>
                      <div className="flex flex-wrap items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            selectedIds.forEach((id) => adjustStock(id, 10));
                            setSelectedInvIds({});
                            showToast(`Restocked +10 units across ${selectedIds.length} SKUs`);
                          }}
                          className="rounded-lg bg-[#2E7D4F] px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-[#23633d]"
                        >
                          +10 Restock Selected
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const picked = items.filter((p) => selectedInvIds[p.id]);
                            downloadCsv(
                              "tikk-stock-selected.csv",
                              ["SKU", "Name", "Category", "Stock", "Price", "Value"],
                              picked.map((p) => [p.sku, p.name, p.cat, p.stock, p.price, p.stock * p.price]),
                              "Selected SKUs CSV",
                            );
                          }}
                          className="rounded-lg border border-[#EADBC6] bg-white px-2.5 py-1 text-[11px] font-semibold text-[#3A2418]"
                        >
                          Export Selected
                        </button>
                        <button
                          type="button"
                          onClick={() => setSelectedInvIds({})}
                          className="rounded-lg px-2 py-1 text-[11px] font-semibold text-[#8A7060] hover:text-[#3A2418]"
                        >
                          Clear
                        </button>
                      </div>
                    </div>
                  )}
                </section>

                {/* Upgraded Inventory Table */}
                <div className="overflow-x-auto rounded-2xl border border-[#F0E4D2] bg-white">
                  <div className="flex items-center justify-between border-b border-[#F5EBDB] px-4 py-2.5 text-xs text-[#8A7060]">
                    <span>
                      Showing <strong className="text-[#3A2418]">{filteredItems.length}</strong> of {items.length} products
                    </span>
                    <span className="hidden sm:inline">Click column headers to sort</span>
                  </div>
                  <table className="w-full min-w-[740px] border-collapse">
                    <thead>
                      <tr className="bg-[#FBF6EE] text-left text-[11px] font-semibold text-[#8A7060]">
                        <th className="w-9 px-3 py-2.5">
                          <input
                            type="checkbox"
                            aria-label="Select all visible products"
                            checked={allChecked}
                            onChange={(e) => {
                              const next: Record<string, boolean> = {};
                              if (e.target.checked) filteredItems.forEach((p) => { next[p.id] = true; });
                              setSelectedInvIds(next);
                            }}
                            className="size-3.5 accent-[#A8421A]"
                          />
                        </th>
                        <th className="cursor-pointer px-3 py-2.5" onClick={() => toggleSort("name")}>
                          Product &amp; Rack {sortKey === "name" ? (sortDir === 1 ? "↑" : "↓") : ""}
                        </th>
                        <th className="cursor-pointer px-3 py-2.5" onClick={() => toggleSort("stock")}>
                          Stock Level {sortKey === "stock" ? (sortDir === 1 ? "↑" : "↓") : ""}
                        </th>
                        <th className="px-3 py-2.5">Status</th>
                        <th className="cursor-pointer px-3 py-2.5" onClick={() => toggleSort("price")}>
                          Price / MRP {sortKey === "price" ? (sortDir === 1 ? "↑" : "↓") : ""}
                        </th>
                        <th className="cursor-pointer px-3 py-2.5" onClick={() => toggleSort("value")}>
                          Valuation {sortKey === "value" ? (sortDir === 1 ? "↑" : "↓") : ""}
                        </th>
                        <th className="cursor-pointer px-3 py-2.5" onClick={() => toggleSort("exp")}>
                          FEFO {sortKey === "exp" ? (sortDir === 1 ? "↑" : "↓") : ""}
                        </th>
                        <th className="px-3 py-2.5 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredItems.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="py-10 text-center text-xs text-[#8A7060]">
                            No products match your filters
                          </td>
                        </tr>
                      ) : (
                        filteredItems.map((p) => {
                          const rack = rackBySkuId[p.id];
                          const pct = Math.min(100, Math.round((p.stock / Math.max(1, p.re * 3)) * 100));
                          const st = getStatus(p);
                          const discountPct = p.mrp > p.price ? Math.round(((p.mrp - p.price) / p.mrp) * 100) : 0;
                          return (
                            <tr key={p.id} className="border-t border-[#F5EBDB] transition-colors hover:bg-[#FFFBF5]">
                              <td className="px-3 py-2.5">
                                <input
                                  type="checkbox"
                                  aria-label={`Select ${p.name}`}
                                  checked={Boolean(selectedInvIds[p.id])}
                                  onChange={(e) =>
                                    setSelectedInvIds((prev) => ({ ...prev, [p.id]: e.target.checked }))
                                  }
                                  className="size-3.5 accent-[#A8421A]"
                                />
                              </td>
                              <td className="px-3 py-2.5">
                                <div className="flex items-center gap-2.5">
                                  <span
                                    className="grid size-9 shrink-0 place-items-center rounded-xl"
                                    style={{ background: p.tint }}
                                  >
                                    <Package className="size-4 text-[#3A2418]/70" />
                                  </span>
                                  <div className="min-w-0">
                                    <div className="flex items-center gap-1.5">
                                      <p className="truncate font-semibold text-[#3A2418]">{p.name}</p>
                                      {rack && (
                                        <span className="inline-flex items-center gap-0.5 rounded-md border border-[#EADBC6] bg-[#FBF6EE] px-1.5 py-0.5 font-mono text-[10px] font-bold text-[#A8421A]">
                                          <MapPin className="size-2.5" />
                                          {rack}
                                        </span>
                                      )}
                                    </div>
                                    <p className="text-[11px] text-[#8A7060]">
                                      {p.sku} · {p.brand} · {p.cat}
                                    </p>
                                  </div>
                                </div>
                              </td>
                              <td className="px-3 py-2.5">
                                <div className="space-y-1">
                                  <div className="inline-flex items-center overflow-hidden rounded-[10px] border border-[#EADBC6] bg-white">
                                    <button
                                      type="button"
                                      aria-label={`Decrease ${p.name}`}
                                      onClick={() => adjustStock(p.id, -1)}
                                      className="px-2 py-0.5 text-sm font-bold text-[#A8421A] hover:bg-[#FBE3CF]"
                                    >
                                      −
                                    </button>
                                    <span className="min-w-[32px] px-1.5 text-center text-xs font-bold tabular-nums">
                                      {p.stock}
                                    </span>
                                    <button
                                      type="button"
                                      aria-label={`Increase ${p.name}`}
                                      onClick={() => adjustStock(p.id, 1)}
                                      className="px-2 py-0.5 text-sm font-bold text-[#A8421A] hover:bg-[#FBE3CF]"
                                    >
                                      +
                                    </button>
                                  </div>
                                  <div className="h-1.5 w-24 overflow-hidden rounded-full bg-[#F3E6D4]">
                                    <div
                                      className={`h-full rounded-full ${
                                        st === "ou" ? "bg-[#C0392B]" : st === "lo" ? "bg-[#E09F3E]" : "bg-[#2E7D4F]"
                                      }`}
                                      style={{ width: `${pct}%` }}
                                    />
                                  </div>
                                </div>
                              </td>
                              <td className="px-3 py-2.5">
                                <StatusPill status={st} />
                              </td>
                              <td className="px-3 py-2.5 tabular-nums">
                                <div className="flex items-center gap-1.5">
                                  <strong className="font-semibold">{formatInr(p.price)}</strong>
                                  {p.mrp > p.price && (
                                    <span className="text-[11px] text-[#8A7060] line-through">{formatInr(p.mrp)}</span>
                                  )}
                                  {discountPct > 0 && (
                                    <span className="rounded bg-[#E3F0DA] px-1 py-0.5 text-[10px] font-bold text-[#2E7D4F]">
                                      -{discountPct}%
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className="px-3 py-2.5 font-semibold tabular-nums">
                                {formatInr(p.stock * p.price)}
                              </td>
                              <td className="px-3 py-2.5">
                                {p.exp === null ? (
                                  <span className="text-xs text-[#8A7060]">—</span>
                                ) : (
                                  <span
                                    className={`inline-block rounded-lg px-2 py-0.5 text-[11px] font-semibold ${
                                      p.exp <= 2
                                        ? "bg-[#FBE1DD] text-[#C0392B]"
                                        : p.exp <= 5
                                          ? "bg-[#FFF0D0] text-[#B7791F]"
                                          : "bg-[#FBF6EE] text-[#8A7060]"
                                    }`}
                                  >
                                    {p.exp}d left
                                  </span>
                                )}
                              </td>
                              <td className="px-3 py-2.5 text-right">
                                <div className="inline-flex items-center gap-1">
                                  <button
                                    type="button"
                                    onClick={() => adjustStock(p.id, 5)}
                                    className="rounded-lg border border-[#EADBC6] bg-[#FBF6EE] px-2 py-1 text-[11px] font-semibold text-[#2E7D4F] hover:bg-[#E3F0DA]"
                                  >
                                    +5
                                  </button>
                                  <button
                                    type="button"
                                    aria-label={`Edit ${p.name}`}
                                    onClick={() => openModal(p)}
                                    className="rounded-lg p-1.5 text-[#8A7060] hover:bg-[#FBF1E6] hover:text-[#A8421A]"
                                  >
                                    <Pencil className="size-3.5" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })()}

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
