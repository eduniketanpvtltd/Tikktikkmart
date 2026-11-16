"use client";
import React, { useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Phone,
  ShieldCheck,
  Zap,
  CheckCircle2,
  Clock,
  Package,
  Bike,
  Copy,
  Check,
  AlertCircle,
  HelpCircle,
} from "lucide-react";
import { apiFetch } from "@/lib/api/client";
import { useAuth } from "@/components/providers/AppProviders";
import { TrackingMap } from "@/components/maps/TrackingMap";

const STATUS_STEPS = [
  { key: "confirmed", label: "Order Placed", icon: CheckCircle2 },
  { key: "packing", label: "Packing at Store", icon: Package },
  { key: "out", label: "Out for Delivery", icon: Bike },
  { key: "delivered", label: "Delivered", icon: Zap },
];

export default function OrderTrackingPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const qc = useQueryClient();
  const [copiedOtp, setCopiedOtp] = useState(false);
  const [cancelLoading, setCancelLoading] = useState(false);

  const { data: order, isLoading } = useQuery({
    queryKey: ["order-detail", id],
    enabled: Boolean(user),
    refetchInterval: 5000,
    queryFn: async () => {
      const res = await apiFetch<any>(`/api/orders/${id}`);
      return res.data;
    },
  });

  if (isLoading) {
    return (
      <div className="py-16 text-center space-y-3">
        <div className="w-8 h-8 rounded-full border-2 border-[#f66002] border-t-transparent animate-spin mx-auto" />
        <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">
          Connecting to Dark Store & Rider...
        </p>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="max-w-md mx-auto my-8 bg-white rounded-3xl border p-8 text-center space-y-3">
        <p className="font-bold text-gray-800">Order not found.</p>
        <Link href="/orders" className="inline-block px-4 py-2.5 rounded-xl bg-[#f66002] hover:bg-[#dd5500] text-white text-xs font-bold transition-colors">
          View All Orders
        </Link>
      </div>
    );
  }

  const canCancel = [
    "placed",
    "payment_pending",
    "confirmed",
    "accepted_by_store",
    "picking",
  ].includes(order.status);

  const handleCancel = async () => {
    if (!confirm("Are you sure you want to cancel this order?")) return;
    setCancelLoading(true);
    await apiFetch(`/api/orders/${id}/cancel`, { method: "POST" });
    setCancelLoading(false);
    qc.invalidateQueries({ queryKey: ["order-detail", id] });
  };

  const copyOtp = () => {
    if (order.delivery_otp) {
      navigator.clipboard.writeText(order.delivery_otp);
      setCopiedOtp(true);
      setTimeout(() => setCopiedOtp(false), 2000);
    }
  };

  // Compute status index for progress bar
  let currentStepIdx = 0;
  if (["confirmed", "placed", "payment_pending"].includes(order.status)) currentStepIdx = 0;
  else if (["accepted_by_store", "picking", "packed"].includes(order.status)) currentStepIdx = 1;
  else if (["rider_assigned", "rider_at_store", "picked_up", "out_for_delivery", "arrived"].includes(order.status))
    currentStepIdx = 2;
  else if (order.status === "delivered") currentStepIdx = 3;

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <Link
          href="/orders"
          className="inline-flex items-center gap-1.5 text-xs font-black text-gray-700 hover:text-black p-1"
        >
          <ArrowLeft className="w-4 h-4 stroke-[2.5]" /> My Orders
        </Link>

        {canCancel && (
          <button
            type="button"
            disabled={cancelLoading}
            onClick={handleCancel}
            className="text-xs font-bold text-red-600 border border-red-200 px-3 py-1.5 rounded-xl hover:bg-red-50 transition-colors"
          >
            {cancelLoading ? "Cancelling..." : "Cancel Order"}
          </button>
        )}
      </div>

      {/* Main Status & ETA Card */}
      <div className="bg-white rounded-3xl border border-gray-100 p-5 space-y-5 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-[#f66002]">
              <Zap className="w-4 h-4 fill-[#f66002]" />
              <span className="text-[11px] font-black uppercase tracking-wider">
                10-Minute Express Delivery
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight">
              {order.status === "delivered"
                ? "Order Delivered 🎉"
                : order.status === "cancelled"
                ? "Order Cancelled"
                : "Arriving in 8-12 minutes"}
            </h1>
            <p className="text-xs text-gray-500 font-medium">
              Order #{order.order_no} · Placed {new Date(order.placed_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </p>
          </div>

          {/* Delivery OTP Badge */}
          {order.delivery_otp && order.status !== "delivered" && order.status !== "cancelled" && (
            <div className="bg-[#fff4eb] border-2 border-[#ffd269] px-3.5 py-2 rounded-2xl text-center shadow-xs shrink-0 select-none">
              <span className="text-[9px] font-black text-[#13193b] uppercase tracking-wider block">
                DELIVERY OTP
              </span>
              <div className="flex items-center gap-1 mt-0.5">
                <span className="text-xl sm:text-2xl font-black tracking-widest text-[#f66002] font-mono">
                  {order.delivery_otp}
                </span>
                <button
                  type="button"
                  onClick={copyOtp}
                  className="p-1 text-gray-600 hover:text-black"
                  title="Copy OTP"
                >
                  {copiedOtp ? <Check className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* 4-Step Visual Progress Stepper */}
        {order.status !== "cancelled" && (
          <div className="pt-2">
            <div className="grid grid-cols-4 gap-1 relative">
              {STATUS_STEPS.map((st, idx) => {
                const Icon = st.icon;
                const isPassed = idx <= currentStepIdx;
                const isCurrent = idx === currentStepIdx;

                return (
                  <div key={st.key} className="flex flex-col items-center text-center gap-1.5 relative z-10">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                        isCurrent
                          ? "bg-[#f66002] text-white shadow-md ring-4 ring-orange-100"
                          : isPassed
                          ? "bg-[#fff0e6] text-[#f66002]"
                          : "bg-gray-100 text-gray-400"
                      }`}
                    >
                      <Icon className="w-4 h-4 stroke-[2.5]" />
                    </div>
                    <span
                      className={`text-[10px] leading-tight font-extrabold line-clamp-2 ${
                        isPassed ? "text-gray-900" : "text-gray-400"
                      }`}
                    >
                      {st.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Live Tracking Map Component */}
        <div className="rounded-2xl overflow-hidden border border-gray-100 shadow-2xs">
          <TrackingMap />
        </div>

        {/* Delivery Partner Details Card */}
        {order.rider ? (
          <div className="p-4 rounded-2xl bg-[#fffaf5] border border-orange-100 flex items-center justify-between gap-3 shadow-2xs">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-[#13193b] text-[#ffd269] flex items-center justify-center font-black text-sm shrink-0 shadow-2xs">
                {order.rider.name ? order.rider.name[0] : "R"}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs sm:text-sm font-black text-gray-900 truncate">
                    {order.rider.name || "Delivery Partner"}
                  </span>
                  <span className="text-[10px] font-black bg-[#ffd269] text-[#13193b] px-1.5 py-0.5 rounded font-mono">
                    ★ 4.9
                  </span>
                </div>
                <p className="text-[11px] text-gray-500 font-medium">
                  Verified TIKK TIKK MART Express Partner
                </p>
              </div>
            </div>

            {order.rider.phone && (
              <a
                href={`tel:${order.rider.phone}`}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#f66002] hover:bg-[#dd5500] text-white text-xs font-black uppercase tracking-wider transition-colors shadow-2xs shrink-0"
              >
                <Phone className="w-3.5 h-3.5 fill-white" /> Call Rider
              </a>
            )}
          </div>
        ) : (
          <div className="p-3.5 rounded-2xl bg-gray-50 text-xs text-gray-500 flex items-center gap-2 border border-gray-100">
            <Clock className="w-4 h-4 text-gray-400 shrink-0" />
            <span>Store packing in progress · A nearby rider is being assigned.</span>
          </div>
        )}
      </div>

      {/* Items in this Order */}
      <div className="bg-white rounded-3xl border border-gray-100 p-5 space-y-3 shadow-sm">
        <h2 className="text-xs font-black uppercase tracking-wider text-gray-500 border-b pb-2">
          Items in this delivery ({order.items?.length ?? 0})
        </h2>

        <div className="divide-y divide-gray-100">
          {(order.items ?? []).map((it: any) => (
            <div key={it.id} className="py-2.5 flex items-center justify-between text-xs sm:text-sm gap-2">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center font-bold text-gray-600 text-xs shrink-0">
                  {it.quantity}x
                </div>
                <span className="font-bold text-gray-800 truncate">
                  {it.name_snapshot}{" "}
                  <span className="text-[11px] text-gray-400 font-normal">({it.label_snapshot})</span>
                </span>
              </div>
              <span className="font-black text-gray-900 shrink-0">
                ₹{Number(it.unit_price) * it.quantity}
              </span>
            </div>
          ))}
        </div>

        <div className="border-t pt-3 flex items-center justify-between font-black text-sm sm:text-base text-gray-900">
          <span>Total Paid ({order.payment_method.toUpperCase()})</span>
          <span className="tracking-tight text-[#f66002]">₹{order.grand_total}</span>
        </div>
      </div>
    </div>
  );
}
