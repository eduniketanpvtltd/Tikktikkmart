"use client";

import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Bike,
  Power,
  Navigation,
  CheckCircle2,
  Phone,
  MapPin,
  Clock,
  DollarSign,
  TrendingUp,
  ShieldCheck,
  Star,
  ArrowRight,
  ShieldAlert,
  Camera,
  FileCheck,
  ClipboardList,
  Zap,
  Award,
  User,
  AlertCircle,
  Store,
  ChevronRight,
  X,
} from "lucide-react";
import { useAuth } from "@/components/providers/AppProviders";
import { apiFetch } from "@/lib/api/client";

// Types
interface DeliveryOrder {
  id: string;
  orderNumber: string;
  storeName: string;
  storeAddress: string;
  storePhone: string;
  customerName: string;
  customerAddress: string;
  customerPhone: string;
  itemsCount: number;
  itemsSummary: string;
  estimatedMinutes: number;
  distanceKm: number;
  payout: number;
  deliveryOtp: string;
  pickupPin: string;
  codAmount?: number;
}

const DEMO_RIDER = {
  id: "rider-demo-001",
  name: "Vikram Singh",
  phone: "+91 98765 43210",
  avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&auto=format&fit=crop&q=80",
  rating: 4.92,
  tripsTotal: 1420,
  vehicleNumber: "KA 03 EN 4592",
  vehicleModel: "Ather 450X (Electric)",
  tier: "gold" as "bronze" | "silver" | "gold",
  hoursOnlineToday: 6.4,
  tripsToday: 12,
  earningsToday: 1140,
  codBalance: 420,
  depot: "Koramangala Dark Store #104",
  kycStatus: "verified"
};

export default function RiderDashboardPage() {
  const { user } = useAuth();
  // State
  const [isOnline, setIsOnline] = useState(true);
  const [riderTier] = useState<"bronze" | "silver" | "gold">("gold");
  const [activeStep, setActiveStep] = useState<1 | 2 | 3 | 4>(1);
  const [enteredOtp, setEnteredOtp] = useState("");
  const [otpError, setOtpError] = useState("");
  const [toast, setToast] = useState<{ type: "success" | "error" | "info"; message: string } | null>(null);

  // Incoming offer state
  const [incomingOffer, setIncomingOffer] = useState<DeliveryOrder | null>(null);
  const [offerCountdown, setOfferCountdown] = useState<number>(30);

  // Active delivery order
  const [activeOrder, setActiveOrder] = useState<DeliveryOrder | null>(null);

  // Metrics
  const [todayEarnings, setTodayEarnings] = useState(DEMO_RIDER.earningsToday);
  const [todayTrips, setTodayTrips] = useState(DEMO_RIDER.tripsToday);
  const [todayCod, setTodayCod] = useState(DEMO_RIDER.codBalance);

  // Completed trips history
  const [completedTrips, setCompletedTrips] = useState<Array<{
    id: string;
    orderNumber: string;
    store: string;
    customerArea: string;
    completedAt: string;
    payout: number;
    distanceKm: number;
  }>>([
    {
      id: "trip-1",
      orderNumber: "TTM-90241",
      store: "Koramangala Dark Store #104",
      customerArea: "5th Block, Koramangala",
      completedAt: "42 mins ago",
      payout: 85,
      distanceKm: 2.1
    },
    {
      id: "trip-2",
      orderNumber: "TTM-90238",
      store: "Koramangala Dark Store #104",
      customerArea: "Ejipura Main Road",
      completedAt: "1 hr 15m ago",
      payout: 95,
      distanceKm: 3.4
    },
    {
      id: "trip-3",
      orderNumber: "TTM-90229",
      store: "Koramangala Dark Store #104",
      customerArea: "ST Bed Layout",
      completedAt: "2 hrs ago",
      payout: 75,
      distanceKm: 1.8
    }
  ]);

  // Modals
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isTripsModalOpen, setIsTripsModalOpen] = useState(false);
  const [isEarningsModalOpen, setIsEarningsModalOpen] = useState(false);
  const [isKycModalOpen, setIsKycModalOpen] = useState(false);
  const [isSosModalOpen, setIsSosModalOpen] = useState(false);
  const [isSelfieModalOpen, setIsSelfieModalOpen] = useState(false);
  const [hasDoneSelfie, setHasDoneSelfie] = useState(true);

  // Auto-dismiss toast
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  // Offer countdown timer
  useEffect(() => {
    if (!incomingOffer) return;
    const interval = setInterval(() => {
      setOfferCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          setIncomingOffer(null);
          setToast({ type: "info", message: "Delivery offer expired." });
          return 30;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [incomingOffer]);

  // Real backend integration hook (gracefully coexists with live Supabase order queries)
  const { data: backendData } = useQuery({
    queryKey: ["rider-me", user?.id],
    enabled: Boolean(user),
    refetchInterval: 5000,
    queryFn: async () => {
      try {
        const res = await apiFetch<any>("/api/rider/me");
        return res?.data;
      } catch {
        return null;
      }
    }
  });

  // Sync active backend orders if available
  useEffect(() => {
    if (backendData?.activeOrder && !activeOrder) {
      const bOrder = backendData.activeOrder;
      setActiveOrder({
        id: bOrder.id,
        orderNumber: bOrder.id.slice(0, 8).toUpperCase(),
        storeName: "TikTikMart Hub - 1st Pilot Store",
        storeAddress: "Plot 42, Speed Corridor, Bengaluru",
        storePhone: "+91 80 4920 1100",
        customerName: "Valued Customer",
        customerAddress: bOrder.address?.line1 || "Customer Address, Bengaluru",
        customerPhone: "+91 98765 00000",
        itemsCount: bOrder.items?.length || 3,
        itemsSummary: `${bOrder.items?.length || 3} items (Amul Milk, Bread, Fresh Produce)`,
        estimatedMinutes: 8,
        distanceKm: 2.3,
        payout: 85,
        deliveryOtp: bOrder.delivery_otp || "4321",
        pickupPin: "8821"
      });
      setActiveStep(bOrder.status === "dispatched" ? 3 : 1);
    }
  }, [backendData, activeOrder]);

  // Handlers for Delivery Lifecycle
  const handleAcceptOffer = () => {
    if (!incomingOffer) return;
    setActiveOrder(incomingOffer);
    setIncomingOffer(null);
    setActiveStep(1);
    setToast({
      type: "success",
      message: `Delivery accepted! Step 1: Head to ${incomingOffer.storeName} for pickup.`
    });
  };

  const handleRejectOffer = () => {
    setIncomingOffer(null);
    setToast({ type: "info", message: "Delivery passed. Ready for next offer." });
  };

  const handleArriveAtStore = () => {
    setActiveStep(2);
    setToast({
      type: "success",
      message: "Arrived at Dark Store! Step 2: Show pickup PIN to packer and scan bag."
    });
  };

  const handleVerifyPickup = () => {
    setActiveStep(3);
    setToast({
      type: "success",
      message: "Bag collected & secured! Step 3: Out for delivery to customer doorstep."
    });
  };

  const handleArriveAtCustomer = () => {
    setActiveStep(4);
    setToast({
      type: "success",
      message: "Arrived at customer location! Step 4: Ask customer for the 4-digit Delivery OTP."
    });
  };

  const handleCompleteDelivery = () => {
    if (!activeOrder) return;
    const cleanOtp = enteredOtp.trim();

    // Verify against order OTP or demo code
    if (cleanOtp !== activeOrder.deliveryOtp && cleanOtp !== "4321" && cleanOtp !== "1234") {
      setOtpError(`Invalid OTP. Ask customer or enter demo code: ${activeOrder.deliveryOtp}`);
      return;
    }

    // Success: credit earnings & update metrics
    const earned = activeOrder.payout;
    setTodayEarnings((prev) => prev + earned);
    setTodayTrips((prev) => prev + 1);
    if (activeOrder.codAmount) {
      setTodayCod((prev) => prev + (activeOrder.codAmount || 0));
    }

    setCompletedTrips((prev) => [
      {
        id: `trip-${Date.now()}`,
        orderNumber: activeOrder.orderNumber,
        store: activeOrder.storeName,
        customerArea: activeOrder.customerAddress.split(",")[0],
        completedAt: "Just now",
        payout: earned,
        distanceKm: activeOrder.distanceKm
      },
      ...prev
    ]);

    setToast({
      type: "success",
      message: `🎉 Delivery completed! ₹${earned} credited to your TikTikMart balance.`
    });

    setActiveOrder(null);
    setActiveStep(1);
    setEnteredOtp("");
    setOtpError("");
  };

  // Simulate incoming delivery request
  const triggerSimulation = () => {
    if (activeOrder) {
      setToast({ type: "info", message: "You already have an active delivery in progress!" });
      return;
    }
    const sampleId = "TTM-" + Math.floor(10000 + Math.random() * 90000);
    const mockOrder: DeliveryOrder = {
      id: sampleId,
      orderNumber: sampleId,
      storeName: "TikTikMart Dark Store #104 (Koramangala)",
      storeAddress: "80 Feet Rd, 4th Block, Koramangala, Bengaluru",
      storePhone: "+91 80 2553 4410",
      customerName: "Rohan Sharma",
      customerAddress: "Flat 402, Green Glen View, 5th Block, Koramangala",
      customerPhone: "+91 98451 22891",
      itemsCount: 4,
      itemsSummary: "Amul Taaza Milk (500ml), Modern Brown Bread, Bananas (1kg), Thums Up (750ml)",
      estimatedMinutes: 9,
      distanceKm: 2.4,
      payout: 92,
      deliveryOtp: "5824",
      pickupPin: "7193",
      codAmount: 0
    };
    setIncomingOffer(mockOrder);
    setOfferCountdown(30);
    setToast({ type: "info", message: "🔔 New 10-Minute Delivery Offer Received!" });
  };

  return (
    <div className="min-h-screen bg-[#F4F6F9] text-gray-900 flex flex-col font-sans pb-16">
      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-full shadow-lg text-sm font-semibold flex items-center gap-2 transition-all animate-in fade-in slide-in-from-top-4 ${
            toast.type === "success"
              ? "bg-[#13193B] text-white border border-[#F66002]"
              : toast.type === "error"
              ? "bg-red-600 text-white"
              : "bg-[#13193B] text-[#FFD269] border border-white/20"
          }`}
        >
          {toast.type === "success" && <CheckCircle2 className="w-4 h-4 text-[#F66002]" />}
          {toast.type === "error" && <AlertCircle className="w-4 h-4 text-white" />}
          {toast.type === "info" && <Zap className="w-4 h-4 text-[#FFD269]" />}
          <span>{toast.message}</span>
        </div>
      )}

      {/* TOP HEADER: Midnight Navy + Orange */}
      <header className="bg-[#13193B] text-white pt-4 pb-5 px-4 shadow-md sticky top-0 z-40">
        <div className="max-w-xl mx-auto flex items-center justify-between gap-3">
          {/* Left: Avatar & Rider Details */}
          <div
            onClick={() => setIsProfileModalOpen(true)}
            className="flex items-center gap-3 cursor-pointer select-none group min-w-0"
            title="View Full Profile & KYC"
          >
            <div className="relative">
              <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-[#F66002] shadow-sm">
                <img
                  src={DEMO_RIDER.avatar}
                  alt={DEMO_RIDER.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                />
              </div>
              <span
                className={`absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full border-2 border-[#13193B] ${
                  isOnline ? "bg-emerald-500 animate-pulse" : "bg-gray-400"
                }`}
              />
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="font-extrabold text-[15px] text-white truncate leading-tight">
                  {DEMO_RIDER.name}
                </h2>
                <span className="bg-amber-400/20 text-[#FFD269] text-[10px] font-black px-1.5 py-0.5 rounded flex items-center gap-0.5">
                  {DEMO_RIDER.rating} <Star className="w-2.5 h-2.5 fill-[#FFD269]" />
                </span>
                <span className="bg-[#F66002]/20 border border-[#F66002]/40 text-[#F66002] text-[9px] font-black uppercase px-1.5 py-0.5 rounded">
                  {riderTier}
                </span>
              </div>
              <p className="text-[11px] text-gray-300 truncate mt-0.5">
                {DEMO_RIDER.vehicleNumber} • {DEMO_RIDER.vehicleModel}
              </p>
            </div>
          </div>

          {/* Right: SOS, Online Toggle, Exit */}
          <div className="flex items-center gap-2 shrink-0">
            {/* SOS Emergency */}
            <button
              onClick={() => setIsSosModalOpen(true)}
              className="bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/40 text-[11px] font-black px-2.5 py-1.5 rounded-full flex items-center gap-1 transition-colors"
              title="Emergency SOS"
            >
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>SOS</span>
            </button>

            {/* Shift On/Off Duty Toggle */}
            <button
              onClick={() => {
                const next = !isOnline;
                setIsOnline(next);
                setToast({
                  type: next ? "success" : "info",
                  message: next ? "You are now ON DUTY. Ready for 10-min orders." : "You are now OFFLINE."
                });
              }}
              className={`text-[11px] font-black px-3 py-1.5 rounded-full flex items-center gap-1.5 transition-all shadow-sm ${
                isOnline
                  ? "bg-emerald-500 text-white hover:bg-emerald-600 ring-2 ring-emerald-400/40"
                  : "bg-white/10 text-gray-300 hover:bg-white/20 border border-white/20"
              }`}
            >
              <Power className="w-3.5 h-3.5" />
              <span>{isOnline ? "ON DUTY" : "OFFLINE"}</span>
            </button>
          </div>
        </div>
      </header>

      {/* MAIN CONTENT CONTAINER */}
      <main className="max-w-xl mx-auto w-full px-4 pt-3 space-y-3 flex-1">
        {/* PARTNER TIER & INCENTIVE PROGRESSION CARD */}
        <div className="bg-gradient-to-r from-[#13193B] to-[#1E2652] rounded-2xl p-4 text-white shadow-sm border border-white/10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-[#F66002]/20 border border-[#F66002]/40 flex items-center justify-center text-[#F66002]">
                <Award className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black uppercase text-[#FFD269] tracking-wider">
                    {riderTier} Partner Tier
                  </span>
                  <span className="bg-emerald-500/20 text-emerald-400 text-[10px] font-bold px-1.5 py-0.2 rounded">
                    +10% Payout Multiplier
                  </span>
                </div>
                <p className="text-[11px] text-gray-300">
                  {DEMO_RIDER.hoursOnlineToday} hrs online • {todayTrips} / 16 trips for daily ₹250 bonus
                </p>
              </div>
            </div>

            <button
              onClick={() => setIsSelfieModalOpen(true)}
              className="bg-white/10 hover:bg-white/15 text-[11px] font-bold text-[#FFD269] px-2.5 py-1.5 rounded-lg border border-white/20 flex items-center gap-1 shrink-0"
              title="Daily Safety & Helmet Verification"
            >
              <Camera className="w-3.5 h-3.5" />
              <span>{hasDoneSelfie ? "Verified ✓" : "Verify Helmet"}</span>
            </button>
          </div>

          {/* Tier Progress Bar */}
          <div className="mt-3">
            <div className="flex justify-between text-[10px] font-bold text-gray-300 mb-1">
              <span>Shift Progress: {todayTrips} trips</span>
              <span>4 more to unlock ₹250 Gold Bonus</span>
            </div>
            <div className="w-full bg-white/10 rounded-full h-2 overflow-hidden">
              <div
                className="bg-gradient-to-r from-[#FFD269] to-[#F66002] h-full rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, (todayTrips / 16) * 100)}%` }}
              />
            </div>
          </div>
        </div>

        {/* METRICS ROW (3 CARDS) */}
        <div className="grid grid-cols-3 gap-2">
          {/* Today's Earnings */}
          <div
            onClick={() => setIsEarningsModalOpen(true)}
            className="bg-white rounded-2xl p-3 shadow-sm border border-gray-100 cursor-pointer hover:border-[#F66002] transition-colors group"
          >
            <div className="flex items-center justify-between text-gray-400 mb-1">
              <span className="text-[11px] font-bold text-gray-500">Earnings</span>
              <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
            </div>
            <div className="text-xl font-extrabold text-[#13193B] group-hover:text-[#F66002] transition-colors">
              ₹{todayEarnings}
            </div>
            <span className="text-[10px] font-semibold text-emerald-600 flex items-center gap-0.5 mt-0.5">
              <span>View Passbook</span>
              <ChevronRight className="w-3 h-3" />
            </span>
          </div>

          {/* Completed Trips */}
          <div
            onClick={() => setIsTripsModalOpen(true)}
            className="bg-white rounded-2xl p-3 shadow-sm border border-gray-100 cursor-pointer hover:border-[#F66002] transition-colors group"
          >
            <div className="flex items-center justify-between text-gray-400 mb-1">
              <span className="text-[11px] font-bold text-gray-500">Trips</span>
              <Bike className="w-3.5 h-3.5 text-[#F66002]" />
            </div>
            <div className="text-xl font-extrabold text-[#13193B] group-hover:text-[#F66002] transition-colors">
              {todayTrips}
            </div>
            <span className="text-[10px] font-semibold text-gray-500 flex items-center gap-0.5 mt-0.5">
              <span>History</span>
              <ChevronRight className="w-3 h-3" />
            </span>
          </div>

          {/* COD Balance */}
          <div
            onClick={() => {
              setToast({
                type: "info",
                message: `Cash balance of ₹${todayCod} can be deposited at dark store end of shift.`
              });
            }}
            className="bg-white rounded-2xl p-3 shadow-sm border border-gray-100 cursor-pointer hover:border-[#F66002] transition-colors group"
          >
            <div className="flex items-center justify-between text-gray-400 mb-1">
              <span className="text-[11px] font-bold text-gray-500">COD Cash</span>
              <DollarSign className="w-3.5 h-3.5 text-amber-500" />
            </div>
            <div className="text-xl font-extrabold text-[#13193B] group-hover:text-[#F66002] transition-colors">
              ₹{todayCod}
            </div>
            <span className="text-[10px] font-semibold text-amber-600 flex items-center gap-0.5 mt-0.5">
              <span>Deposit Info</span>
              <ChevronRight className="w-3 h-3" />
            </span>
          </div>
        </div>

        {/* 4-PILL QUICK ACTIONS */}
        <div className="grid grid-cols-4 gap-2">
          <button
            onClick={() => setIsProfileModalOpen(true)}
            className="bg-white hover:bg-orange-50/50 rounded-xl py-2.5 px-1 border border-gray-100 shadow-sm flex flex-col items-center justify-center text-center transition-colors"
          >
            <User className="w-4 h-4 text-[#13193B] mb-1" />
            <span className="text-[11px] font-bold text-gray-700">Profile</span>
          </button>
          <button
            onClick={() => setIsTripsModalOpen(true)}
            className="bg-white hover:bg-orange-50/50 rounded-xl py-2.5 px-1 border border-gray-100 shadow-sm flex flex-col items-center justify-center text-center transition-colors"
          >
            <ClipboardList className="w-4 h-4 text-[#13193B] mb-1" />
            <span className="text-[11px] font-bold text-gray-700">Trips</span>
          </button>
          <button
            onClick={() => setIsKycModalOpen(true)}
            className="bg-white hover:bg-orange-50/50 rounded-xl py-2.5 px-1 border border-gray-100 shadow-sm flex flex-col items-center justify-center text-center transition-colors"
          >
            <FileCheck className="w-4 h-4 text-[#13193B] mb-1" />
            <span className="text-[11px] font-bold text-gray-700">KYC Docs</span>
          </button>
          <button
            onClick={() => setIsEarningsModalOpen(true)}
            className="bg-white hover:bg-orange-50/50 rounded-xl py-2.5 px-1 border border-gray-100 shadow-sm flex flex-col items-center justify-center text-center transition-colors"
          >
            <TrendingUp className="w-4 h-4 text-[#F66002] mb-1" />
            <span className="text-[11px] font-bold text-gray-700">Passbook</span>
          </button>
        </div>

        {/* INCOMING DELIVERY OFFER (RINGING MODAL/CARD) */}
        {incomingOffer && (
          <div className="bg-white rounded-2xl p-4 shadow-xl border-2 border-[#F66002] animate-bounce-short relative overflow-hidden">
            {/* Top Bar with Payout & Timer */}
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-emerald-500 animate-ping" />
                <span className="text-xs font-black uppercase text-[#F66002] tracking-wider">
                  New Delivery Offer!
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-gray-400" />
                <span className="font-extrabold text-sm text-[#13193B]">
                  {offerCountdown}s remaining
                </span>
              </div>
            </div>

            {/* Payout & Distance Banner */}
            <div className="my-3 bg-gradient-to-r from-orange-50 to-amber-50 rounded-xl p-3 flex items-center justify-between border border-[#F66002]/20">
              <div>
                <span className="text-[11px] font-bold text-gray-500 uppercase">Guaranteed Payout</span>
                <div className="text-2xl font-black text-[#F66002]">₹{incomingOffer.payout}</div>
              </div>
              <div className="text-right">
                <span className="text-[11px] font-bold text-gray-500 uppercase">Trip Distance</span>
                <div className="text-base font-extrabold text-[#13193B]">
                  {incomingOffer.distanceKm} km • ~{incomingOffer.estimatedMinutes} mins
                </div>
              </div>
            </div>

            {/* Route Summary */}
            <div className="space-y-2 text-xs">
              <div className="flex items-start gap-2">
                <Store className="w-4 h-4 text-[#13193B] shrink-0 mt-0.5" />
                <div>
                  <div className="font-extrabold text-gray-800">{incomingOffer.storeName}</div>
                  <div className="text-gray-500 text-[11px]">{incomingOffer.storeAddress}</div>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <MapPin className="w-4 h-4 text-[#F66002] shrink-0 mt-0.5" />
                <div>
                  <div className="font-extrabold text-gray-800">{incomingOffer.customerName}</div>
                  <div className="text-gray-500 text-[11px]">{incomingOffer.customerAddress}</div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-2 gap-3 mt-4 pt-3 border-t border-gray-100">
              <button
                onClick={handleRejectOffer}
                className="py-3 rounded-xl border border-gray-300 text-gray-700 font-bold text-sm hover:bg-gray-50 transition-colors"
              >
                Pass / Reject
              </button>
              <button
                onClick={handleAcceptOffer}
                className="py-3 rounded-xl bg-gradient-to-r from-[#F66002] to-[#ff7a29] text-white font-extrabold text-sm shadow-md hover:brightness-105 active:scale-98 transition-all flex items-center justify-center gap-1.5"
              >
                <span>Accept Delivery</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* ACTIVE DELIVERY ORDER (4-STEP WORKFLOW) */}
        {activeOrder && (
          <div className="bg-white rounded-2xl p-4 shadow-md border border-gray-200 space-y-4">
            {/* Header: Order ID & Payout */}
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div>
                <span className="text-[10px] font-black uppercase text-[#F66002] bg-orange-50 px-2 py-0.5 rounded border border-orange-200">
                  Active 10-Min Delivery
                </span>
                <h3 className="font-extrabold text-base text-[#13193B] mt-1">
                  Order #{activeOrder.orderNumber}
                </h3>
              </div>
              <div className="text-right">
                <span className="text-[10px] font-bold text-gray-400 uppercase">Payout</span>
                <div className="text-xl font-black text-emerald-600">₹{activeOrder.payout}</div>
              </div>
            </div>

            {/* 4-Step Stepper Bar */}
            <div>
              <div className="grid grid-cols-4 gap-1 mb-2">
                {[
                  { step: 1, label: "To Store" },
                  { step: 2, label: "Pickup Bag" },
                  { step: 3, label: "En Route" },
                  { step: 4, label: "Customer Drop" }
                ].map((s) => (
                  <div key={s.step} className="text-center">
                    <div
                      className={`h-1.5 rounded-full mb-1 transition-all ${
                        activeStep >= s.step ? "bg-[#F66002]" : "bg-gray-200"
                      }`}
                    />
                    <span
                      className={`text-[10px] font-bold block truncate ${
                        activeStep === s.step
                          ? "text-[#F66002] font-black"
                          : activeStep > s.step
                          ? "text-gray-700"
                          : "text-gray-400"
                      }`}
                    >
                      {s.step}. {s.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* STEP 1: Head to Store */}
            {activeStep === 1 && (
              <div className="space-y-3 bg-gray-50/80 rounded-xl p-3 border border-gray-100">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-gray-500">
                      <Store className="w-3.5 h-3.5 text-[#13193B]" />
                      <span>PICKUP DARK STORE</span>
                    </div>
                    <div className="font-extrabold text-sm text-gray-900">{activeOrder.storeName}</div>
                    <div className="text-xs text-gray-500">{activeOrder.storeAddress}</div>
                  </div>
                  <a
                    href={`tel:${activeOrder.storePhone}`}
                    className="w-9 h-9 rounded-full bg-white border border-gray-200 flex items-center justify-center text-[#13193B] shadow-sm hover:bg-gray-100 shrink-0"
                    title="Call Dark Store Manager"
                  >
                    <Phone className="w-4 h-4" />
                  </a>
                </div>

                <div className="flex gap-2 pt-2">
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                      activeOrder.storeAddress
                    )}`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex-1 py-2.5 rounded-xl border border-gray-300 bg-white text-gray-800 text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm"
                  >
                    <Navigation className="w-3.5 h-3.5 text-[#13193B]" />
                    <span>Navigate to Store</span>
                  </a>
                  <button
                    onClick={handleArriveAtStore}
                    className="flex-1 py-2.5 rounded-xl bg-[#13193B] text-white text-xs font-extrabold flex items-center justify-center gap-1.5 shadow-sm hover:bg-[#1a2350]"
                  >
                    <span>I have Arrived ✓</span>
                  </button>
                </div>
              </div>
            )}

            {/* STEP 2: Verify & Pickup Bag */}
            {activeStep === 2 && (
              <div className="space-y-3 bg-orange-50/60 rounded-xl p-3 border border-[#F66002]/20">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-bold text-gray-500 uppercase">
                      Show Pickup PIN to Store Dispatcher
                    </span>
                    <div className="text-2xl font-black text-[#F66002] tracking-wider">
                      {activeOrder.pickupPin}
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] font-bold text-gray-500">Items Count</span>
                    <div className="text-sm font-extrabold text-[#13193B]">
                      {activeOrder.itemsCount} Items
                    </div>
                  </div>
                </div>

                <p className="text-xs text-gray-600 bg-white/70 p-2.5 rounded-lg border border-orange-100">
                  <span className="font-bold">Bag Content:</span> {activeOrder.itemsSummary}
                </p>

                <button
                  onClick={handleVerifyPickup}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-[#F66002] to-[#ff7a29] text-white font-extrabold text-sm shadow-md flex items-center justify-center gap-2 hover:brightness-105 active:scale-98"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Verify & Confirm Bag Collection</span>
                </button>
              </div>
            )}

            {/* STEP 3: En Route to Customer */}
            {activeStep === 3 && (
              <div className="space-y-3 bg-gray-50/80 rounded-xl p-3 border border-gray-100">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-[#F66002]">
                      <MapPin className="w-3.5 h-3.5" />
                      <span>DELIVERY LOCATION</span>
                    </div>
                    <div className="font-extrabold text-sm text-gray-900">{activeOrder.customerName}</div>
                    <div className="text-xs text-gray-600">{activeOrder.customerAddress}</div>
                  </div>
                  <a
                    href={`tel:${activeOrder.customerPhone}`}
                    className="w-9 h-9 rounded-full bg-white border border-gray-200 flex items-center justify-center text-emerald-600 shadow-sm hover:bg-gray-100 shrink-0"
                    title="Call Customer"
                  >
                    <Phone className="w-4 h-4" />
                  </a>
                </div>

                <div className="flex gap-2 pt-2">
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                      activeOrder.customerAddress
                    )}`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex-1 py-2.5 rounded-xl border border-gray-300 bg-white text-gray-800 text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm"
                  >
                    <Navigation className="w-3.5 h-3.5 text-[#13193B]" />
                    <span>Open Maps</span>
                  </a>
                  <button
                    onClick={handleArriveAtCustomer}
                    className="flex-1 py-2.5 rounded-xl bg-[#13193B] text-white text-xs font-extrabold flex items-center justify-center gap-1.5 shadow-sm hover:bg-[#1a2350]"
                  >
                    <span>Arrived at Doorstep ✓</span>
                  </button>
                </div>
              </div>
            )}

            {/* STEP 4: Collect Delivery OTP */}
            {activeStep === 4 && (
              <div className="space-y-3 bg-amber-50/60 rounded-xl p-3.5 border border-amber-200">
                <div className="text-center space-y-1">
                  <span className="text-xs font-extrabold text-[#13193B]">
                    Collect 4-Digit Customer Delivery OTP
                  </span>
                  <p className="text-[11px] text-gray-500">
                    Ask customer for OTP sent to their phone or app screen
                  </p>
                </div>

                {/* OTP Input Field */}
                <div>
                  <input
                    type="text"
                    maxLength={4}
                    value={enteredOtp}
                    onChange={(e) => {
                      setEnteredOtp(e.target.value);
                      if (otpError) setOtpError("");
                    }}
                    placeholder="Enter 4-digit OTP"
                    className="w-full text-center tracking-[10px] text-2xl font-black text-[#13193B] py-3 rounded-xl border border-amber-300 bg-white focus:outline-none focus:ring-2 focus:ring-[#F66002]"
                  />
                  {otpError && (
                    <p className="text-red-600 text-xs font-semibold text-center mt-1.5">{otpError}</p>
                  )}
                </div>

                {/* Quick Auto-fill Helper for Demo Testing */}
                <div className="flex items-center justify-between text-[11px] text-gray-500 px-1">
                  <span>Demo Customer OTP:</span>
                  <button
                    type="button"
                    onClick={() => setEnteredOtp(activeOrder.deliveryOtp)}
                    className="font-extrabold text-[#F66002] hover:underline"
                  >
                    Fill {activeOrder.deliveryOtp} ⚡
                  </button>
                </div>

                <button
                  onClick={handleCompleteDelivery}
                  className="w-full py-3.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-black text-sm shadow-md flex items-center justify-center gap-2 hover:brightness-105 active:scale-98"
                >
                  <CheckCircle2 className="w-5 h-5" />
                  <span>Complete Delivery & Receive ₹{activeOrder.payout}</span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* NO ACTIVE ORDER & ONLINE: WAITING STATE */}
        {isOnline && !activeOrder && !incomingOffer && (
          <div className="bg-white rounded-2xl p-6 text-center shadow-sm border border-gray-100 space-y-3">
            <div className="w-16 h-16 rounded-full bg-orange-50 border border-orange-200 mx-auto flex items-center justify-center text-[#F66002]">
              <Bike className="w-8 h-8 animate-pulse" />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-[#13193B]">
                Waiting for Nearby 10-Min Orders
              </h3>
              <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">
                You are high priority in the {DEMO_RIDER.depot} zone. Keep the app open to receive alerts instantly.
              </p>
            </div>

            {/* Test Simulation Button */}
            <div className="pt-2">
              <button
                onClick={triggerSimulation}
                className="inline-flex items-center gap-2 bg-[#F66002] hover:bg-[#e05702] text-white text-xs font-extrabold px-4 py-2.5 rounded-full shadow-md transition-all active:scale-95"
              >
                <Zap className="w-3.5 h-3.5 fill-white" />
                <span>Simulate Delivery Request ⚡</span>
              </button>
            </div>
          </div>
        )}

        {/* OFFLINE BANNER */}
        {!isOnline && (
          <div className="bg-gradient-to-r from-gray-800 to-gray-900 rounded-2xl p-5 text-white text-center shadow-sm space-y-2">
            <Power className="w-8 h-8 text-gray-400 mx-auto" />
            <h3 className="font-extrabold text-sm text-gray-200">You are Currently Offline</h3>
            <p className="text-xs text-gray-400 max-w-xs mx-auto">
              Go On Duty to receive instant 10-minute grocery delivery offers in your area.
            </p>
            <button
              onClick={() => {
                setIsOnline(true);
                setToast({ type: "success", message: "You are back ON DUTY!" });
              }}
              className="mt-2 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-extrabold px-5 py-2.5 rounded-full shadow-md"
            >
              Go On Duty Now
            </button>
          </div>
        )}

        {/* TODAY'S RECENT COMPLETED TRIPS SUMMARY */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-extrabold text-xs text-[#13193B] uppercase tracking-wider flex items-center gap-1.5">
              <ClipboardList className="w-3.5 h-3.5 text-[#F66002]" />
              <span>Today&apos;s Completed Drops ({completedTrips.length})</span>
            </h4>
            <button
              onClick={() => setIsTripsModalOpen(true)}
              className="text-[11px] font-bold text-[#F66002] hover:underline"
            >
              View All
            </button>
          </div>

          <div className="divide-y divide-gray-100">
            {completedTrips.slice(0, 3).map((trip) => (
              <div key={trip.id} className="py-2.5 flex items-center justify-between text-xs">
                <div>
                  <div className="font-extrabold text-gray-800 flex items-center gap-1.5">
                    <span>{trip.orderNumber}</span>
                    <span className="text-[10px] text-gray-400">• {trip.completedAt}</span>
                  </div>
                  <div className="text-[11px] text-gray-500">{trip.customerArea}</div>
                </div>
                <div className="text-right">
                  <div className="font-black text-emerald-600">+₹{trip.payout}</div>
                  <div className="text-[10px] text-gray-400">{trip.distanceKm} km</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>

      {/* ===================== MODALS ===================== */}

      {/* 1. RIDER PROFILE MODAL */}
      {isProfileModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in">
          <div className="bg-white w-full max-w-md rounded-t-3xl sm:rounded-3xl p-5 max-h-[90vh] overflow-y-auto space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-gray-100">
              <h3 className="font-extrabold text-base text-[#13193B]">Delivery Partner Profile</h3>
              <button
                onClick={() => setIsProfileModalOpen(false)}
                className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex items-center gap-3">
              <img
                src={DEMO_RIDER.avatar}
                alt={DEMO_RIDER.name}
                className="w-16 h-16 rounded-full border-2 border-[#F66002] object-cover"
              />
              <div>
                <h4 className="font-black text-lg text-gray-900">{DEMO_RIDER.name}</h4>
                <p className="text-xs text-gray-500">{DEMO_RIDER.phone}</p>
                <div className="flex items-center gap-1.5 mt-1">
                  <span className="bg-emerald-50 text-emerald-700 text-[10px] font-extrabold px-2 py-0.5 rounded-full border border-emerald-200">
                    KYC Verified ✓
                  </span>
                  <span className="bg-amber-50 text-amber-700 text-[10px] font-extrabold px-2 py-0.5 rounded-full border border-amber-200">
                    {DEMO_RIDER.rating} ★
                  </span>
                </div>
              </div>
            </div>

            <div className="space-y-2 text-xs bg-gray-50 p-3 rounded-xl border border-gray-100">
              <div className="flex justify-between py-1 border-b border-gray-200">
                <span className="text-gray-500">Partner ID:</span>
                <span className="font-bold text-gray-800">{DEMO_RIDER.id}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-gray-200">
                <span className="text-gray-500">Assigned Depot:</span>
                <span className="font-bold text-gray-800">{DEMO_RIDER.depot}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-gray-200">
                <span className="text-gray-500">Vehicle:</span>
                <span className="font-bold text-gray-800">{DEMO_RIDER.vehicleNumber}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-gray-500">Total Lifetime Trips:</span>
                <span className="font-bold text-gray-800">{DEMO_RIDER.tripsTotal} deliveries</span>
              </div>
            </div>

            <button
              onClick={() => {
                setIsProfileModalOpen(false);
                setIsKycModalOpen(true);
              }}
              className="w-full py-2.5 rounded-xl border border-[#F66002] text-[#F66002] font-bold text-xs hover:bg-orange-50"
            >
              View Uploaded KYC & Vehicle Documents
            </button>
          </div>
        </div>
      )}

      {/* 2. TRIPS HISTORY MODAL */}
      {isTripsModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in">
          <div className="bg-white w-full max-w-md rounded-t-3xl sm:rounded-3xl p-5 max-h-[85vh] overflow-y-auto space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-gray-100">
              <div>
                <h3 className="font-extrabold text-base text-[#13193B]">Trip History</h3>
                <p className="text-[11px] text-gray-500">{completedTrips.length} completed trips today</p>
              </div>
              <button
                onClick={() => setIsTripsModalOpen(false)}
                className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2">
              {completedTrips.map((t) => (
                <div
                  key={t.id}
                  className="p-3 bg-gray-50 rounded-xl border border-gray-100 flex items-center justify-between"
                >
                  <div className="space-y-0.5">
                    <div className="font-extrabold text-xs text-gray-900">{t.orderNumber}</div>
                    <div className="text-[11px] text-gray-500">{t.customerArea}</div>
                    <div className="text-[10px] text-gray-400">
                      {t.distanceKm} km • Completed {t.completedAt}
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="font-black text-sm text-emerald-600">+₹{t.payout}</span>
                    <span className="block text-[10px] text-emerald-500 font-bold">Paid</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 3. EARNINGS PASSBOOK MODAL */}
      {isEarningsModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in">
          <div className="bg-white w-full max-w-md rounded-t-3xl sm:rounded-3xl p-5 max-h-[85vh] overflow-y-auto space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-gray-100">
              <h3 className="font-extrabold text-base text-[#13193B]">Earnings Passbook</h3>
              <button
                onClick={() => setIsEarningsModalOpen(false)}
                className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="bg-gradient-to-r from-[#13193B] to-[#1E2652] rounded-2xl p-4 text-white">
              <span className="text-[11px] font-bold text-gray-300 uppercase">Today&apos;s Total Payout</span>
              <div className="text-3xl font-black text-[#FFD269] mt-0.5">₹{todayEarnings}</div>
              <p className="text-[11px] text-gray-300 mt-1">
                Settles automatically to Bank Account via UPI every Tuesday & Friday
              </p>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between py-2 border-b border-gray-100">
                <span className="text-gray-600">Base Trip Pay ({todayTrips} trips @ ₹45):</span>
                <span className="font-bold text-gray-900">₹{todayTrips * 45}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-gray-100">
                <span className="text-gray-600">Distance & Surge Pay:</span>
                <span className="font-bold text-gray-900">₹{todayEarnings - (todayTrips * 45) - 150}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-gray-100">
                <span className="text-gray-600">Gold Tier Multiplier (+10%):</span>
                <span className="font-bold text-emerald-600">+₹95</span>
              </div>
              <div className="flex justify-between py-2 border-b border-gray-100">
                <span className="text-gray-600">Customer Tips:</span>
                <span className="font-bold text-emerald-600">+₹55</span>
              </div>
              <div className="flex justify-between py-2 font-black text-sm text-[#13193B]">
                <span>Net Total:</span>
                <span>₹{todayEarnings}</span>
              </div>
            </div>

            <div className="p-3 bg-orange-50 rounded-xl border border-orange-200 text-xs text-orange-900">
              <div className="font-extrabold flex items-center gap-1.5 mb-0.5">
                <Zap className="w-3.5 h-3.5 text-[#F66002]" />
                <span>Next Weekly Payout: Tuesday, 10:00 AM</span>
              </div>
              <span>Linked UPI: vikram.singh@oksbi (Verified)</span>
            </div>
          </div>
        </div>
      )}

      {/* 4. KYC & DOCUMENTS MODAL */}
      {isKycModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in">
          <div className="bg-white w-full max-w-md rounded-t-3xl sm:rounded-3xl p-5 max-h-[85vh] overflow-y-auto space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-gray-100">
              <div>
                <h3 className="font-extrabold text-base text-[#13193B]">KYC & Vehicle Docs</h3>
                <p className="text-[11px] text-emerald-600 font-bold">All 5 documents verified ✓</p>
              </div>
              <button
                onClick={() => setIsKycModalOpen(false)}
                className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2 text-xs">
              {[
                { name: "Aadhaar Card", number: "XXXX XXXX 8912", status: "Verified" },
                { name: "Driving License", number: "KA03 20210084920", status: "Verified" },
                { name: "Vehicle RC Book", number: "KA 03 EN 4592", status: "Verified" },
                { name: "Two-Wheeler Insurance", number: "HDFC-ERGO-98112-25", status: "Active" },
                { name: "Bank Account / UPI", number: "vikram.singh@oksbi", status: "Verified" }
              ].map((doc) => (
                <div
                  key={doc.name}
                  className="p-3 bg-gray-50 rounded-xl border border-gray-100 flex items-center justify-between"
                >
                  <div>
                    <div className="font-extrabold text-gray-900">{doc.name}</div>
                    <div className="text-[11px] text-gray-500">{doc.number}</div>
                  </div>
                  <span className="bg-emerald-50 text-emerald-700 text-[10px] font-extrabold px-2 py-0.5 rounded-full border border-emerald-200">
                    {doc.status} ✓
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 5. EMERGENCY SOS MODAL */}
      {isSosModalOpen && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in">
          <div className="bg-white w-full max-w-md rounded-t-3xl sm:rounded-3xl p-5 max-h-[85vh] overflow-y-auto space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-gray-100">
              <div className="flex items-center gap-2 text-red-600">
                <ShieldAlert className="w-5 h-5" />
                <h3 className="font-extrabold text-base">Emergency SOS</h3>
              </div>
              <button
                onClick={() => setIsSosModalOpen(false)}
                className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-gray-600">
              Emergency assistance broadcasts your live GPS location to TikTikMart Fleet Operations and contacts local emergency services.
            </p>

            <div className="space-y-2">
              <a
                href="tel:112"
                className="w-full py-3 rounded-xl bg-red-600 hover:bg-red-700 text-white font-extrabold text-sm flex items-center justify-center gap-2 shadow-md"
              >
                <Phone className="w-4 h-4" />
                <span>Call National Emergency (112)</span>
              </a>
              <a
                href="tel:108"
                className="w-full py-3 rounded-xl bg-red-500 hover:bg-red-600 text-white font-extrabold text-sm flex items-center justify-center gap-2 shadow-md"
              >
                <Phone className="w-4 h-4" />
                <span>Call Medical Ambulance (108)</span>
              </a>
              <a
                href="tel:1800100200"
                className="w-full py-3 rounded-xl bg-[#13193B] hover:bg-[#1a2350] text-white font-extrabold text-sm flex items-center justify-center gap-2 shadow-md"
              >
                <ShieldCheck className="w-4 h-4 text-[#FFD269]" />
                <span>Call TikTikMart Fleet Control Center</span>
              </a>
            </div>

            <div className="p-3 bg-red-50 rounded-xl border border-red-200 text-[11px] text-red-800">
              <span className="font-bold">Live GPS Anchor:</span> 12.9352° N, 77.6245° E (Koramangala, Bengaluru)
            </div>
          </div>
        </div>
      )}

      {/* 6. DAILY HELMET & SELFIE VERIFICATION MODAL */}
      {isSelfieModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in">
          <div className="bg-white w-full max-w-md rounded-t-3xl sm:rounded-3xl p-5 max-h-[85vh] overflow-y-auto space-y-4 text-center">
            <div className="flex items-center justify-between pb-2 border-b border-gray-100 text-left">
              <h3 className="font-extrabold text-base text-[#13193B]">Helmet & Safety Check</h3>
              <button
                onClick={() => setIsSelfieModalOpen(false)}
                className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="w-44 h-44 rounded-full border-4 border-dashed border-[#F66002] mx-auto overflow-hidden relative flex items-center justify-center bg-gray-50">
              <img
                src={DEMO_RIDER.avatar}
                alt="Selfie"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                <Camera className="w-8 h-8 text-white drop-shadow" />
              </div>
            </div>

            <div>
              <h4 className="font-extrabold text-sm text-gray-900">AI Safety Verification</h4>
              <p className="text-xs text-gray-500 mt-1 max-w-xs mx-auto">
                Make sure your helmet is fastened and your face is well-lit before taking the selfie.
              </p>
            </div>

            <button
              onClick={() => {
                setHasDoneSelfie(true);
                setIsSelfieModalOpen(false);
                setToast({
                  type: "success",
                  message: "Safety selfie approved! Helmet detected. You are cleared for deliveries."
                });
              }}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-[#F66002] to-[#ff7a29] text-white font-extrabold text-sm shadow-md flex items-center justify-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Capture & Verify Helmet</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
