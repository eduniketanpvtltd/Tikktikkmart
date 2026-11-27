"use client";
import { formatRupees } from "@/components/customer/AnimatedRupees";
import { useCartQuote } from "@/lib/pricing/useCartQuote";
import { LayoutSkeleton } from "@/components/ui/LayoutSkeleton";
import React, { useRef, useState } from "react";
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
  BellOff,
  DoorOpen,
  PhoneOff,
  PawPrint,
} from "lucide-react";
import { showCustomerToast } from "@/components/customer/CustomerFeedback";
import { useCartStore } from "@/stores/cartStore";
import { useAuth } from "@/components/providers/AppProviders";
import { checkoutAttempt } from "@/lib/api/idempotency";
import { apiFetch } from "@/lib/api/client";
import { LocationPicker } from "@/components/maps/LocationPicker";
import type { Address } from "@/types/db";

const INSTRUCTION_TAGS = [
  { label: "Leave at door", icon: DoorOpen },
  { label: "Don't ring bell", icon: BellOff },
  { label: "Avoid calling", icon: PhoneOff },
  { label: "Beware of pets", icon: PawPrint },
];

interface RazorpayPayment {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
}

interface RazorpayOptions {
  key: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  image: string;
  order_id: string;
  theme: { color: string };
  prefill: { name: string; email: string; contact: string };
  handler: (payment: RazorpayPayment) => Promise<void>;
  modal: { ondismiss: () => void };
}

declare global {
  interface Window {
    Razorpay?: new (options: RazorpayOptions) => { open: () => void };
  }
}

let loadingRazorpay: Promise<boolean> | undefined;

function loadRazorpayScript(): Promise<boolean> {
  if (window.Razorpay) return Promise.resolve(true);
  if (loadingRazorpay) return loadingRazorpay;
  loadingRazorpay = new Promise<boolean>((resolve) => {
    const script = document.createElement("script");
    const finish = (loaded: boolean) => {
      window.clearTimeout(timeout);
      script.onload = script.onerror = null;
      if (!loaded) script.remove();
      resolve(loaded);
    };
    const timeout = window.setTimeout(() => finish(false), 9000);
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => finish(Boolean(window.Razorpay));
    script.onerror = () => finish(false);
    document.body.appendChild(script);
  }).finally(() => { loadingRazorpay = undefined; });
  return loadingRazorpay;
}

export default function CheckoutPage() {
  const router = useRouter();
  const qc = useQueryClient();
  const { user, loading: authLoading } = useAuth();
  const { storeId, items, couponCode, tip, location, clearCart } = useCartStore();

  const { data: quote, isLoading: quoteLoading, isFetching: checkingTotal, refetch: refreshTotal } = useCartQuote();
  const addressSection = useRef<HTMLElement>(null);
  const [selectedAddressId, setSelectedAddressId] = useState<string>("");
  const [paymentMethod, setPaymentMethod] = useState<"online" | "cod">("online");
  const [selectedInstructions, setSelectedInstructions] = useState<string[]>([]);
  const [customInstruction, setCustomInstruction] = useState("");
  const [placing, setPlacing] = useState(false);
  const [paymentOrderId, setPaymentOrderId] = useState<string>();
  const [retryingOrder, setRetryingOrder] = useState(false);
  const activeAttempt = useRef<{ body: string; key: string; clear: () => void } | null>(null);
  const lockOrderFields = placing || retryingOrder || Boolean(paymentOrderId);
  const placingRef = useRef(false);
  const releaseOrder = () => { placingRef.current = false; setPlacing(false); };
  const savingAddress = useRef(false);
  const [addressPending, setAddressPending] = useState(false);
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
      return res.data ?? [];
    },
  });

  const addressId = selectedAddressId || addresses.find((address) => address.is_default)?.id || addresses[0]?.id || "";
  const addressReady = Boolean(addressId && !showNewAddr);
  const showAddressForm = () => {
    if (!addressId) setShowNewAddr(true);
    addressSection.current?.scrollIntoView({ block: "start" });
    addressSection.current?.focus({ preventScroll: true });
  };

  if (authLoading) return <LayoutSkeleton shape="order" label="Loading checkout" />;
  if (!user) {
    return (
      <div className="max-w-md mx-auto my-8 bg-white rounded-2xl border border-[#F0E4D2] p-8 text-center space-y-4">
        <div className="w-16 h-16 rounded-full bg-[#FBE3CF] text-[#A8421A] flex items-center justify-center mx-auto text-2xl font-black">
          ⚡
        </div>
        <h1 className="font-black text-lg text-[#3A2418]">Sign in to complete checkout</h1>
        <p className="text-xs text-[#8A7060]">
          Save your delivery addresses and track your orders in real-time with TIKK TIKK MART.
        </p>
        <Link
          href="/login"
          className="inline-block w-full py-3.5 rounded-full bg-[#A8421A] hover:bg-[#8E3513] text-white font-black text-xs uppercase tracking-wider transition-all"
        >
          Continue with Google
        </Link>
      </div>
    );
  }

  const effectiveStoreId = storeId || "11111111-1111-1111-1111-111111111111";

  if (!items.length) {
    return (
      <div className="max-w-md mx-auto my-8 bg-white rounded-2xl border border-[#F0E4D2] p-8 text-center space-y-4">
        <h1 className="font-black text-lg text-[#3A2418]">No items to checkout</h1>
        <p className="text-xs text-[#8A7060]">Your cart is currently empty.</p>
        <Link
          href="/"
          className="inline-block px-6 py-3 rounded-full bg-[#A8421A] hover:bg-[#8E3513] text-white text-xs font-black uppercase tracking-wider transition-all"
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
    if (savingAddress.current) return;
    savingAddress.current = true;
    setAddressPending(true);
    const res = await apiFetch<Address>("/api/addresses", {
      method: "POST",
      body: JSON.stringify({ ...addrForm, is_default: true }),
    });
    savingAddress.current = false;
    setAddressPending(false);
    if (res.ok && res.data) {
      setSelectedAddressId(res.data.id);
      setShowNewAddr(false);
      qc.invalidateQueries({ queryKey: ["addresses"] });
    } else {
      setError(res.error ?? "Could not save address");
    }
  };

  const handlePlaceOrder = async () => {
    if (placingRef.current) return;
    setError(null);
    if (!addressReady && !lockOrderFields) {
      setError("Please select or add a delivery address.");
      return;
    }
    placingRef.current = true;
    setPlacing(true);
    try {
      const allInstructions = [
        ...selectedInstructions,
        customInstruction.trim(),
      ]
        .filter(Boolean)
        .join(", ");

      const payload = {
        storeId: effectiveStoreId,
        addressId,
        paymentMethod,
        items: items.map((i) => ({ variant_id: i.variantId, quantity: i.quantity }))
          .sort((a, b) => a.variant_id.localeCompare(b.variant_id)),
        couponCode,
        tip,
        instructions: allInstructions || undefined,
      };
      const attempt = activeAttempt.current ?? {
        ...(await checkoutAttempt(JSON.stringify([user.id, payload]))),
        body: JSON.stringify(payload),
      };
      activeAttempt.current = attempt;
      const res = await apiFetch<{
        order: { id: string; order_no: number; grand_total: number };
        state: "complete" | "payment_required" | "payment_review" | "expired";
        razorpay: { orderId: string; amount: number; currency: string; keyId: string } | null;
      }>("/api/checkout", {
        method: "POST",
        headers: { "Idempotency-Key": attempt.key },
        body: attempt.body,
      });

      if (!res.ok || !res.data) {
        if (!res.status || res.status >= 500 || res.status === 409) {
          setRetryingOrder(true);
        } else if (!paymentOrderId) {
          activeAttempt.current = null;
          setRetryingOrder(false);
        }
        setError(res.error || "Checkout failed");
        releaseOrder();
        return;
      }

      const { order, razorpay, state } = res.data;
      setPaymentOrderId(paymentMethod === "online" ? order.id : undefined);
      const confirmOrder = () => {
        attempt.clear();
        activeAttempt.current = null;
        clearCart();
        showCustomerToast("Order placed!", true);
        router.push(`/orders/${order.id}`);
      };

      if (state === "complete") {
        confirmOrder();
        return;
      }
      if (state === "expired") {
        attempt.clear();
        activeAttempt.current = null;
        setRetryingOrder(false);
        setPaymentOrderId(undefined);
        setError("The previous order expired. You can place a new order.");
        releaseOrder();
        return;
      }
      if (state === "payment_review" || !razorpay) {
        setError("We’re checking your payment. Retry to check the same order, or open its details.");
        releaseOrder();
        return;
      }
      const loaded = await loadRazorpayScript();
      if (!loaded || !window.Razorpay) {
        setError("The payment window couldn’t load. Retry to resume the same order.");
        releaseOrder();
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
        theme: { color: "#FD5E00" },
        prefill: { name: user.name ?? "", email: user.email, contact: user.phone ?? "" },
        handler: async (response) => {
          const verify = await apiFetch<{ state: "complete" | "review" }>("/api/payments/verify", {
            method: "POST",
            body: JSON.stringify({ orderId: order.id, ...response }),
          });
          if (verify.ok && verify.data?.state === "complete") {
            confirmOrder();
          } else {
            setError(verify.error || "Payment confirmation is pending. Open the order to check its status.");
            releaseOrder();
          }
        },
        modal: {
          ondismiss: () => {
            setError("Payment window closed. Retry to pay for the same order.");
            releaseOrder();
          },
        },
      });
      rzp.open();
    } catch (error) {
      setError(error instanceof Error ? error.message : "Order placement failed");
      releaseOrder();
    }
  };


  return (
    <div className="market-checkout max-w-2xl mx-auto space-y-4">
      <header className="market-checkout-heading">
        <Link href="/cart" aria-label="Back to basket" className="market-checkout-back"><ArrowLeft size={20} aria-hidden="true" /></Link>
        <div>
          <p className="market-checkout-step">Step 2 of 2</p>
          <h1>Delivery & payment</h1>
        </div>
      </header>

      {error && !paymentOrderId && (
        <div className="p-3.5 rounded-2xl bg-[#FDECEC] border border-[#C93B3B] text-xs font-bold text-[#B42318]">
          {error}
        </div>
      )}

      {/* Step 1: Delivery Address */}
      <section id="delivery-address" ref={addressSection} tabIndex={-1} className="scroll-mt-8 bg-white rounded-2xl border border-[#F0E4D2] p-4 sm:p-5 space-y-3.5">
        <div className="flex items-center justify-between">
          <h2 className="text-xs sm:text-sm font-black uppercase tracking-wider text-[#3A2418] flex items-center gap-2">
            <MapPin className="w-4 h-4 text-[#A8421A]" /> Delivery address
          </h2>
          <button
            type="button"
            disabled={lockOrderFields}
            onClick={() => setShowNewAddr((s) => !s)}
            className="text-xs font-black text-[#A8421A] hover:underline inline-flex items-center gap-1"
          >
            <Plus className="w-3.5 h-3.5 stroke-[3]" /> Add New
          </button>
        </div>

        {loadingAddrs ? (
          <LayoutSkeleton shape="list" label="Loading saved addresses" />
        ) : addresses.length === 0 && !showNewAddr ? (
          <div className="p-4 bg-[#FBE3CF]/55 rounded-2xl text-center space-y-2">
            <p className="text-xs font-semibold text-[#8A7060]">No saved addresses yet.</p>
            <button
              type="button"
              onClick={() => setShowNewAddr(true)}
              className="px-4 py-2 rounded-xl bg-[#A8421A] hover:bg-[#8E3513] text-white text-xs font-bold transition-colors"
            >
              Add Your Address
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {addresses.map((a) => {
              const isSelected = addressId === a.id;
              return (
                <label
                  key={a.id}
                  className={`block p-3.5 rounded-2xl border cursor-pointer transition-all ${
                    isSelected
                      ? "border-[#A8421A] bg-[#FBE3CF]/45 ring-1 ring-[#A8421A]/20"
                      : "border-[#F0E4D2] bg-white hover:bg-[#FBF6EE]"
                  }`}
                >
                  <div className="checkout-address-summary flex items-start gap-3">
                    <input
                      type="radio"
                      name="address"
                      checked={isSelected}
                      disabled={lockOrderFields}
                      onChange={() => setSelectedAddressId(a.id)}
                      className="mt-1 accent-[#A8421A] w-4 h-4"
                    />
                    <div className="text-xs space-y-0.5">
                      <div className="layout-wrap flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                        <span className="font-black text-[#3A2418] text-sm">
                          {a.label || "Home"}
                        </span>
                        <span className="text-[11px] text-[#8A7060] font-medium">
                          · {a.receiver_name} ({a.receiver_phone})
                        </span>
                      </div>
                      <p className="text-[#8A7060] leading-relaxed">
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
          <form onSubmit={handleSaveAddress} className="checkout-address-form space-y-3 pt-3 border-t border-[#F0E4D2]">
            <div className="bg-[#FBF6EE] border border-[#F0E4D2] p-3.5 rounded-2xl space-y-3">
              <p className="text-xs font-black text-[#3A2418]">Pin location on map:</p>
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
                  className="border border-[#EADBC6] rounded-xl px-3 py-2 text-xs bg-white text-[#3A2418] focus:outline-none focus:border-[#A8421A]"
                />
                <input
                  required
                  placeholder="Phone Number"
                  value={addrForm.receiver_phone}
                  onChange={(e) => setAddrForm((f) => ({ ...f, receiver_phone: e.target.value }))}
                  className="border border-[#EADBC6] rounded-xl px-3 py-2 text-xs bg-white text-[#3A2418] focus:outline-none focus:border-[#A8421A]"
                />
              </div>
              <input
                required
                placeholder="House / Flat / Floor / Street Address"
                value={addrForm.line1}
                onChange={(e) => setAddrForm((f) => ({ ...f, line1: e.target.value }))}
                className="w-full border border-[#EADBC6] rounded-xl px-3 py-2 text-xs bg-white text-[#3A2418] focus:outline-none focus:border-[#A8421A]"
              />
              <div className="grid grid-cols-2 gap-2">
                <input
                  placeholder="Label (Home / Office / Other)"
                  value={addrForm.label}
                  onChange={(e) => setAddrForm((f) => ({ ...f, label: e.target.value }))}
                  className="border border-[#EADBC6] rounded-xl px-3 py-2 text-xs bg-white text-[#3A2418] focus:outline-none focus:border-[#A8421A]"
                />
                <input
                  placeholder="Nearby Landmark (optional)"
                  value={addrForm.landmark}
                  onChange={(e) => setAddrForm((f) => ({ ...f, landmark: e.target.value }))}
                  className="border border-[#EADBC6] rounded-xl px-3 py-2 text-xs bg-white text-[#3A2418] focus:outline-none focus:border-[#A8421A]"
                />
              </div>
              <div className="flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => setShowNewAddr(false)}
                  className="px-4 py-2 rounded-xl border border-[#EADBC6] text-xs font-bold text-[#8A7060] hover:bg-[#F0E4D2]/50"
                >
                  Cancel
                </button>
                <button
                  type="submit" disabled={addressPending}
                  className="px-5 py-2 rounded-xl bg-[#A8421A] hover:bg-[#8E3513] text-white text-xs font-black uppercase tracking-wider transition-colors"
                >
                  {addressPending ? "Saving…" : "Save Address"}
                </button>
              </div>
            </div>
          </form>
        )}
      </section>

      {/* Step 2: Payment Method */}
      <section className="bg-white rounded-2xl border border-[#F0E4D2] p-4 sm:p-5 space-y-3.5">
        <h2 className="text-xs sm:text-sm font-black uppercase tracking-wider text-[#3A2418] flex items-center gap-2">
          <CreditCard className="w-4 h-4 text-[#A8421A]" /> Payment method
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button
            type="button"
            disabled={lockOrderFields}
            onClick={() => setPaymentMethod("online")}
            className={`p-4 rounded-2xl border text-left flex items-start gap-3 transition-all ${
              paymentMethod === "online"
                ? "border-[#A8421A] bg-[#FBE3CF]/45 ring-1 ring-[#A8421A]/20"
                : "border-[#F0E4D2] bg-white hover:bg-[#FBF6EE]"
            }`}
          >
            <div className="w-9 h-9 rounded-xl bg-[#FBE3CF] text-[#A8421A] flex items-center justify-center shrink-0">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs sm:text-sm font-black text-[#3A2418]">Online payment</p>
              <p className="text-[11px] text-[#8A7060] mt-0.5">
                UPI (GPay, PhonePe, Paytm), Cards, Netbanking via Razorpay
              </p>
            </div>
          </button>

          <button
            type="button"
            disabled={lockOrderFields}
            onClick={() => setPaymentMethod("cod")}
            className={`p-4 rounded-2xl border text-left flex items-start gap-3 transition-all ${
              paymentMethod === "cod"
                ? "border-[#A8421A] bg-[#FBE3CF]/45 ring-1 ring-[#A8421A]/20"
                : "border-[#F0E4D2] bg-white hover:bg-[#FBF6EE]"
            }`}
          >
            <div className="w-9 h-9 rounded-xl bg-[#FFF0DA] text-[#A8421A] flex items-center justify-center shrink-0">
              <Banknote className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs sm:text-sm font-black text-[#3A2418]">Cash on Delivery</p>
              <p className="text-[11px] text-[#8A7060] mt-0.5">
                Pay cash or QR to rider upon doorstep arrival (up to ₹2000)
              </p>
            </div>
          </button>
        </div>
      </section>

      {/* Step 3: Delivery Instructions */}
      <section className="bg-white rounded-2xl border border-[#F0E4D2] p-4 sm:p-5 space-y-3">
        <h2 className="text-xs sm:text-sm font-black uppercase tracking-wider text-[#3A2418]">
          Delivery instructions
        </h2>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {INSTRUCTION_TAGS.map((t) => {
            const Icon = t.icon;
            const isSelected = selectedInstructions.includes(t.label);
            return (
              <button
                key={t.label}
                type="button"
                disabled={lockOrderFields}
                onClick={() => toggleInstruction(t.label)}
                className={`p-2.5 rounded-xl border text-center flex flex-col items-center gap-1.5 transition-all ${
                  isSelected
                    ? "bg-[#FBE3CF] border-[#A8421A] text-[#A8421A] font-black"
                    : "bg-[#FBF6EE] border-[#F0E4D2] text-[#3A2418] font-medium hover:bg-[#FBE3CF]/45"
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
          disabled={lockOrderFields}
          value={customInstruction}
          onChange={(e) => setCustomInstruction(e.target.value)}
          placeholder="Additional note (e.g. Ring phone once outside building)"
          className="w-full border border-[#EADBC6] bg-[#FBF6EE] rounded-xl px-3 py-2 text-xs text-[#3A2418] focus:outline-none focus:border-[#A8421A]"
        />
      </section>

      {paymentMethod === "online" && <p className="market-payment-note"><ShieldCheck size={16} aria-hidden="true" /> Online payments are processed by Razorpay</p>}

      <div className="market-payment-dock">
        {paymentOrderId && error && (
          <div role="status" className="rounded-xl border border-[#F0E4D2] bg-white p-3 text-sm text-[#3A2418]">
            <p>{error}</p>
            <Link href={`/orders/${paymentOrderId}`} className="mt-1 inline-block font-bold text-[#A8421A] underline">View order status</Link>
          </div>
        )}
        <div className="market-payment-summary">
          <div>
            <p>Total</p>
            <strong aria-live="polite">{quote ? formatRupees(quote.bill.grandTotal) : checkingTotal || quoteLoading ? "Checking…" : "Unavailable"}</strong>
          </div>
          <button type="button" disabled={placing || loadingAddrs || (addressReady && !lockOrderFields && !quote && checkingTotal)}
            onClick={lockOrderFields ? handlePlaceOrder : !addressReady ? showAddressForm : quote ? handlePlaceOrder : () => void refreshTotal()}>
            {placing ? "Processing order…" : paymentOrderId ? "Retry payment" : retryingOrder ? "Retry checkout"
              : !addressId ? "Add address details" : showNewAddr ? "Finish address"
                : !quote ? checkingTotal ? "Checking total…" : "Refresh total"
                : paymentMethod === "online" ? "Proceed to pay" : "Place order"}
          </button>
        </div>
      </div>
    </div>
  );
}
