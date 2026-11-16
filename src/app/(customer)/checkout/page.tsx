"use client";
import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Plus,
  MapPin,
  CreditCard,
  Banknote,
  ArrowLeft,
  ShieldCheck,
  CheckCircle2,
  BellOff,
  DoorOpen,
  PhoneOff,
  PawPrint,
  Zap,
} from "lucide-react";
import { useCartStore } from "@/stores/cartStore";
import { useAuth } from "@/components/providers/AppProviders";
import { apiFetch } from "@/lib/api/client";
import { LocationPicker } from "@/components/maps/LocationPicker";
import type { Address } from "@/types/db";

const INSTRUCTION_TAGS = [
  { label: "Leave at door", icon: DoorOpen },
  { label: "Don't ring bell", icon: BellOff },
  { label: "Avoid calling", icon: PhoneOff },
  { label: "Beware of pets", icon: PawPrint },
];

declare global {
  interface Window {
    Razorpay?: any;
  }
}

function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (window.Razorpay) return resolve(true);
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

export default function CheckoutPage() {
  const router = useRouter();
  const qc = useQueryClient();
  const { user } = useAuth();
  const { storeId, items, couponCode, tip, location, clearCart } = useCartStore();

  const [selectedAddressId, setSelectedAddressId] = useState<string>("");
  const [paymentMethod, setPaymentMethod] = useState<"online" | "cod">("online");
  const [selectedInstructions, setSelectedInstructions] = useState<string[]>([]);
  const [customInstruction, setCustomInstruction] = useState("");
  const [placing, setPlacing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [showNewAddr, setShowNewAddr] = useState(false);
  const [addrForm, setAddrForm] = useState({
    label: "Home",
    receiver_name: user?.name ?? "",
    receiver_phone: user?.phone ?? "",
    line1: "",
    landmark: "",
    lat: location?.lat ?? 22.5726,
    lng: location?.lng ?? 88.3639,
    city: location?.city ?? "",
  });

  const { data: addresses = [], isLoading: loadingAddrs } = useQuery({
    queryKey: ["addresses", user?.id],
    enabled: Boolean(user),
    queryFn: async () => {
      const res = await apiFetch<Address[]>("/api/addresses");
      const list = res.data ?? [];
      if (list.length && !selectedAddressId) setSelectedAddressId(list[0].id);
      return list;
    },
  });

  if (!user) {
    return (
      <div className="max-w-md mx-auto my-8 bg-white rounded-3xl border border-gray-100 p-8 text-center space-y-4 shadow-sm">
        <div className="w-16 h-16 rounded-full bg-[#fff0e6] text-[#f66002] flex items-center justify-center mx-auto text-2xl font-black shadow-inner">
          ⚡
        </div>
        <h1 className="font-black text-lg text-gray-900">Sign in to complete checkout</h1>
        <p className="text-xs text-gray-500">
          Save your delivery addresses and track your orders in real-time with TIKK TIKK MART.
        </p>
        <Link
          href="/login"
          className="inline-block w-full py-3.5 rounded-2xl bg-[#f66002] hover:bg-[#dd5500] text-white font-black text-xs uppercase tracking-wider transition-all shadow-md shadow-orange-500/20"
        >
          Continue with Google
        </Link>
      </div>
    );
  }

  const effectiveStoreId = storeId || "11111111-1111-1111-1111-111111111111";

  if (!items.length) {
    return (
      <div className="max-w-md mx-auto my-8 bg-white rounded-3xl border border-gray-100 p-8 text-center space-y-4 shadow-sm">
        <h1 className="font-black text-lg text-gray-900">No items to checkout</h1>
        <p className="text-xs text-gray-500">Your cart is currently empty.</p>
        <Link
          href="/"
          className="inline-block px-5 py-3 rounded-2xl bg-[#f66002] hover:bg-[#dd5500] text-white text-xs font-black uppercase tracking-wider transition-all shadow-md shadow-orange-500/20"
        >
          Browse Groceries
        </Link>
      </div>
    );
  }

  const toggleInstruction = (label: string) => {
    setSelectedInstructions((prev) =>
      prev.includes(label) ? prev.filter((i) => i !== label) : [...prev, label]
    );
  };

  const handleSaveAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await apiFetch<Address>("/api/addresses", {
      method: "POST",
      body: JSON.stringify({ ...addrForm, is_default: true }),
    });
    if (res.ok && res.data) {
      setSelectedAddressId(res.data.id);
      setShowNewAddr(false);
      qc.invalidateQueries({ queryKey: ["addresses"] });
    } else {
      setError(res.error ?? "Could not save address");
    }
  };

  const handlePlaceOrder = async () => {
    setError(null);
    if (!selectedAddressId) {
      setError("Please select or add a delivery address.");
      return;
    }
    setPlacing(true);
    try {
      const allInstructions = [
        ...selectedInstructions,
        customInstruction.trim(),
      ]
        .filter(Boolean)
        .join(", ");

      const idempotencyKey = `ord-${user.id}-${Date.now()}`;
      const res = await apiFetch<{
        order: { id: string; order_no: number; grand_total: number };
        razorpay: { orderId: string; amount: number; currency: string; keyId: string } | null;
      }>("/api/checkout", {
        method: "POST",
        body: JSON.stringify({
          storeId: effectiveStoreId,
          addressId: selectedAddressId,
          paymentMethod,
          items: items.map((i) => ({ variant_id: i.variantId, quantity: i.quantity })),
          couponCode,
          tip,
          instructions: allInstructions || undefined,
          idempotencyKey,
        }),
      });

      if (!res.ok || !res.data) {
        setError(res.error || "Checkout failed");
        setPlacing(false);
        return;
      }

      const { order, razorpay } = res.data;

      // Cash on delivery: redirect directly to order tracking
      if (paymentMethod === "cod" || !razorpay) {
        clearCart();
        router.push(`/orders/${order.id}`);
        return;
      }

      // Online Razorpay Payment
      const loaded = await loadRazorpayScript();
      if (!loaded || !window.Razorpay) {
        setError("Razorpay checkout failed to load. Please try COD or refresh.");
        setPlacing(false);
        return;
      }

      const rzp = new window.Razorpay({
        key: razorpay.keyId,
        amount: razorpay.amount,
        currency: razorpay.currency,
        name: "TIKK TIKK MART",
        description: `Order #${order.order_no} · 10-Min Fast Delivery`,
        image: "/logo.png",
        order_id: razorpay.orderId,
        theme: { color: "#f66002" },
        prefill: { name: user.name ?? "", email: user.email, contact: user.phone ?? "" },
        handler: async (response: {
          razorpay_payment_id: string;
          razorpay_order_id: string;
          razorpay_signature: string;
        }) => {
          const verify = await apiFetch("/api/payments/verify", {
            method: "POST",
            body: JSON.stringify({ orderId: order.id, ...response }),
          });
          if (verify.ok) {
            clearCart();
            router.push(`/orders/${order.id}`);
          } else {
            setError(verify.error || "Payment verification failed");
            setPlacing(false);
          }
        },
        modal: {
          ondismiss: () => setPlacing(false),
        },
      });
      rzp.open();
    } catch (e: any) {
      setError(e?.message || "Order placement failed");
      setPlacing(false);
    }
  };

  const totalAmount = items.reduce((acc, i) => acc + i.price * i.quantity, 0);

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      {/* Back button + Title */}
      <div className="flex items-center gap-3">
        <Link
          href="/cart"
          className="p-2 rounded-xl bg-white border border-gray-100 hover:bg-gray-50 text-gray-700 transition-colors"
        >
          <ArrowLeft className="w-4 h-4 stroke-[2.5]" />
        </Link>
        <div>
          <h1 className="text-lg sm:text-xl font-black text-gray-900 leading-tight">
            Checkout
          </h1>
          <p className="text-[11px] text-gray-500 font-medium">
            Delivery in 10-15 mins from nearest dark store
          </p>
        </div>
      </div>

      {error && (
        <div className="p-3.5 rounded-2xl bg-red-50 border border-red-200 text-xs font-bold text-red-700 shadow-2xs">
          {error}
        </div>
      )}

      {/* Step 1: Delivery Address */}
      <section className="bg-white rounded-3xl border border-gray-100 p-4 sm:p-5 space-y-3.5 shadow-2xs">
        <div className="flex items-center justify-between">
          <h2 className="text-xs sm:text-sm font-black uppercase tracking-wider text-gray-800 flex items-center gap-2">
            <MapPin className="w-4 h-4 text-[#f66002]" /> 1. Select Delivery Address
          </h2>
          <button
            type="button"
            onClick={() => setShowNewAddr((s) => !s)}
            className="text-xs font-black text-[#f66002] hover:underline inline-flex items-center gap-1"
          >
            <Plus className="w-3.5 h-3.5 stroke-[3]" /> Add New
          </button>
        </div>

        {loadingAddrs ? (
          <p className="text-xs text-gray-400">Loading saved addresses...</p>
        ) : addresses.length === 0 && !showNewAddr ? (
          <div className="p-4 bg-gray-50 rounded-2xl text-center space-y-2">
            <p className="text-xs font-semibold text-gray-600">No saved addresses yet.</p>
            <button
              type="button"
              onClick={() => setShowNewAddr(true)}
              className="px-4 py-2 rounded-xl bg-[#f66002] hover:bg-[#dd5500] text-white text-xs font-bold transition-colors"
            >
              Add Your Address
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {addresses.map((a) => {
              const isSelected = selectedAddressId === a.id;
              return (
                <label
                  key={a.id}
                  className={`block p-3.5 rounded-2xl border cursor-pointer transition-all ${
                    isSelected
                      ? "border-[#f66002] bg-[#fffaf5] shadow-xs ring-1 ring-[#f66002]/20"
                      : "border-gray-200 bg-white hover:bg-gray-50/50"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <input
                      type="radio"
                      name="address"
                      checked={isSelected}
                      onChange={() => setSelectedAddressId(a.id)}
                      className="mt-1 accent-[#f66002] w-4 h-4"
                    />
                    <div className="text-xs space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-black text-gray-900 text-sm">
                          {a.label || "Home"}
                        </span>
                        <span className="text-[11px] text-gray-500 font-medium">
                          · {a.receiver_name} ({a.receiver_phone})
                        </span>
                      </div>
                      <p className="text-gray-600 leading-relaxed">
                        {a.line1}
                        {a.landmark ? `, Landmark: ${a.landmark}` : ""}
                        {a.city ? `, ${a.city}` : ""}
                      </p>
                    </div>
                  </div>
                </label>
              );
            })}
          </div>
        )}

        {/* Add New Address Form Modal/Drawer */}
        {showNewAddr && (
          <form onSubmit={handleSaveAddress} className="space-y-3 pt-3 border-t border-gray-100">
            <div className="bg-gray-50 p-3 rounded-2xl space-y-3">
              <p className="text-xs font-black text-gray-800">Pin location on map:</p>
              <LocationPicker
                initialLat={addrForm.lat}
                initialLng={addrForm.lng}
                onSelect={(c) =>
                  setAddrForm((f) => ({
                    ...f,
                    lat: c.lat,
                    lng: c.lng,
                    line1: f.line1 || c.address,
                    city: c.city ?? f.city,
                  }))
                }
              />
              <div className="grid grid-cols-2 gap-2">
                <input
                  required
                  placeholder="Receiver Name"
                  value={addrForm.receiver_name}
                  onChange={(e) => setAddrForm((f) => ({ ...f, receiver_name: e.target.value }))}
                  className="border rounded-xl px-3 py-2 text-xs bg-white focus:outline-none focus:border-[#f66002]"
                />
                <input
                  required
                  placeholder="Phone Number"
                  value={addrForm.receiver_phone}
                  onChange={(e) => setAddrForm((f) => ({ ...f, receiver_phone: e.target.value }))}
                  className="border rounded-xl px-3 py-2 text-xs bg-white focus:outline-none focus:border-[#f66002]"
                />
              </div>
              <input
                required
                placeholder="House / Flat / Floor / Street Address"
                value={addrForm.line1}
                onChange={(e) => setAddrForm((f) => ({ ...f, line1: e.target.value }))}
                className="w-full border rounded-xl px-3 py-2 text-xs bg-white focus:outline-none focus:border-[#f66002]"
              />
              <div className="grid grid-cols-2 gap-2">
                <input
                  placeholder="Label (Home / Office / Other)"
                  value={addrForm.label}
                  onChange={(e) => setAddrForm((f) => ({ ...f, label: e.target.value }))}
                  className="border rounded-xl px-3 py-2 text-xs bg-white focus:outline-none focus:border-[#f66002]"
                />
                <input
                  placeholder="Nearby Landmark (optional)"
                  value={addrForm.landmark}
                  onChange={(e) => setAddrForm((f) => ({ ...f, landmark: e.target.value }))}
                  className="border rounded-xl px-3 py-2 text-xs bg-white focus:outline-none focus:border-[#f66002]"
                />
              </div>
              <div className="flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => setShowNewAddr(false)}
                  className="px-4 py-2 rounded-xl border text-xs font-bold text-gray-600 hover:bg-gray-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#f66002] hover:bg-[#dd5500] text-white text-xs font-black uppercase tracking-wider transition-colors shadow-sm"
                >
                  Save Address
                </button>
              </div>
            </div>
          </form>
        )}
      </section>

      {/* Step 2: Payment Method */}
      <section className="bg-white rounded-3xl border border-gray-100 p-4 sm:p-5 space-y-3.5 shadow-2xs">
        <h2 className="text-xs sm:text-sm font-black uppercase tracking-wider text-gray-800 flex items-center gap-2">
          <CreditCard className="w-4 h-4 text-[#f66002]" /> 2. Payment Method
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => setPaymentMethod("online")}
            className={`p-4 rounded-2xl border text-left flex items-start gap-3 transition-all ${
              paymentMethod === "online"
                ? "border-[#f66002] bg-[#fffaf5] shadow-xs ring-1 ring-[#f66002]/20"
                : "border-gray-200 bg-white hover:bg-gray-50/50"
            }`}
          >
            <div className="w-9 h-9 rounded-xl bg-[#fff0e6] text-[#f66002] flex items-center justify-center shrink-0">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <p className="text-xs sm:text-sm font-black text-gray-900">Online Payment</p>
                <span className="text-[9px] font-black bg-[#ffd269] text-[#13193b] px-1.5 py-0.5 rounded font-mono">
                  FASTER
                </span>
              </div>
              <p className="text-[11px] text-gray-500 mt-0.5">
                UPI (GPay, PhonePe, Paytm), Cards, Netbanking via Razorpay
              </p>
            </div>
          </button>

          <button
            type="button"
            onClick={() => setPaymentMethod("cod")}
            className={`p-4 rounded-2xl border text-left flex items-start gap-3 transition-all ${
              paymentMethod === "cod"
                ? "border-[#f66002] bg-[#fffaf5] shadow-xs ring-1 ring-[#f66002]/20"
                : "border-gray-200 bg-white hover:bg-gray-50/50"
            }`}
          >
            <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center shrink-0">
              <Banknote className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs sm:text-sm font-black text-gray-900">Cash on Delivery</p>
              <p className="text-[11px] text-gray-500 mt-0.5">
                Pay cash or QR to rider upon doorstep arrival (up to ₹2000)
              </p>
            </div>
          </button>
        </div>
      </section>

      {/* Step 3: Delivery Instructions */}
      <section className="bg-white rounded-3xl border border-gray-100 p-4 sm:p-5 space-y-3 shadow-2xs">
        <h2 className="text-xs sm:text-sm font-black uppercase tracking-wider text-gray-800">
          3. Delivery Instructions for Partner
        </h2>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {INSTRUCTION_TAGS.map((t) => {
            const Icon = t.icon;
            const isSelected = selectedInstructions.includes(t.label);
            return (
              <button
                key={t.label}
                type="button"
                onClick={() => toggleInstruction(t.label)}
                className={`p-2.5 rounded-xl border text-center flex flex-col items-center gap-1.5 transition-all ${
                  isSelected
                    ? "bg-[#fff0e6] border-[#f66002] text-[#f66002] font-black"
                    : "bg-gray-50 border-gray-200 text-gray-700 font-medium hover:bg-gray-100"
                }`}
              >
                <Icon className="w-4 h-4" />
                <span className="text-[11px]">{t.label}</span>
              </button>
            );
          })}
        </div>

        <input
          type="text"
          value={customInstruction}
          onChange={(e) => setCustomInstruction(e.target.value)}
          placeholder="Additional note (e.g. Ring phone once outside building)"
          className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs text-gray-700 focus:outline-none focus:border-[#f66002]"
        />
      </section>

      {/* Trust Badge */}
      <div className="flex items-center justify-center gap-2 text-xs text-gray-500">
        <ShieldCheck className="w-4 h-4 text-[#f66002]" />
        <span>100% Safe & Contactless Delivery · Powered by Razorpay</span>
      </div>

      {/* Bottom Sticky CTA Button */}
      <div className="sticky bottom-16 sm:bottom-4 z-20 pt-2">
        <button
          type="button"
          disabled={placing}
          onClick={handlePlaceOrder}
          className="w-full py-4 rounded-2xl bg-[#f66002] hover:bg-[#dd5500] active:scale-[0.99] disabled:opacity-50 text-white font-black text-sm uppercase tracking-wider transition-all shadow-xl shadow-orange-500/25 flex items-center justify-center gap-2"
        >
          {placing ? (
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
              <span>Processing Order...</span>
            </div>
          ) : paymentMethod === "online" ? (
            <span>Pay & Place Order ⚡</span>
          ) : (
            <span>Place Cash on Delivery Order 🛵</span>
          )}
        </button>
      </div>
    </div>
  );
}
