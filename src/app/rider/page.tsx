"use client";

import { SwipeableSheet } from "@/components/ui/SwipeableSheet";
import { useRef, useState, useEffect, type CSSProperties } from "react";
import Link from "next/link";
import { AccountAvatar } from "@/components/customer/AccountAvatar";
import { formatRupees } from "@/components/customer/AnimatedRupees";
import { RiderDropsSkeleton, RiderEarningsSkeleton, RiderHomeSkeleton } from "./RiderHomeSkeleton";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle, Bike, Check, ChevronLeft, ChevronRight, ClipboardList, House,
  Phone, ShieldAlert, Star, TrendingUp, User,
} from "lucide-react";
import { useAuth, type SessionUser } from "@/components/providers/AppProviders";
import { apiFetch } from "@/lib/api/client";
import { isRouteActive } from "@/lib/orders/tracking";

import { RiderDelivery, RiderDeliveryReceipt, type DeliveryOrder } from "./RiderDelivery";

const bonusTarget = 16;
const bonusValue = 250;

type RiderTrip = {
  id: string;
  orderNumber: string;
  customerArea: string;
  completedAt: string;
  payout: number;
  distanceKm: number | null;
};

type Earnings = {
  codBalance: number;
  todayTrips: number;
  todayEarned: number;
  todayDrops: RiderTrip[];
  dailyEarnings: number[];
  recentDrops?: RiderTrip[];
};

type RiderOrder = {
  id: string;
  order_no: number | null;
  grand_total: number;
  payment_method: string;
  distance_m: number | null;
  eta_minutes: number | null;
  address_snapshot: Partial<Record<"line1" | "line2" | "landmark" | "city" | "receiver_name" | "receiver_phone", string>> | null;
  items?: { quantity: number }[];
  store: { name: string; address: string; phone?: string | null } | null;
};

type RiderDashboard = {
  user: SessionUser;
  profile: {
    is_online: boolean;
    kyc_status: string | null;
    rating: number | null;
    vehicle_no: string | null;
    vehicle_type: string | null;
    home_store: { name: string } | null;
  } | null;
  activeOrder: (Omit<RiderOrder, "items"> & {
    status: string;
    pickup_code: string | null;
    instructions: string | null;
    items: { quantity: number; name_snapshot: string }[];
    assignments: { payout: number | null }[];
  }) | null;
  pendingOffer: { id: string; offered_at: string; payout: number | null; order: RiderOrder | null } | null;
};

function RiderSosButton({ onOpen }: { onOpen: () => void }) {
  const timer = useRef<number | undefined>(undefined);
  const [held, setHeld] = useState(false);
  useEffect(() => () => window.clearTimeout(timer.current), []);
  const stop = () => { window.clearTimeout(timer.current); setHeld(false); };
  return <button type="button" className="rider-sos" aria-label="Open emergency support, hold on touch"
    data-held={held ? "" : undefined}
    onPointerDown={(event) => {
      if (event.button !== 0 || !event.isPrimary) return;
      stop();
      setHeld(true);
      timer.current = window.setTimeout(() => { setHeld(false); onOpen(); }, 1400);
    }}
    onPointerUp={stop} onPointerLeave={stop} onPointerCancel={stop}
    onClick={(event) => { if (event.detail === 0) onOpen(); }}>
    <svg width="46" height="46" viewBox="0 0 48 48" aria-hidden="true"><circle cx="24" cy="24" r="21" pathLength="100" /></svg>
    SOS
  </button>;
}

const DEMO_RIDER = {
  id: "rider-demo-001",
  name: "Vikram Singh",
  phone: "+91 98765 43210",
  avatar: "/rider/demo-avatar.jpg",
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

const demoItems = [
  { name: "Fresh Red Onions · 1 kg", quantity: 1 },
  { name: "Kurkure Masala Munch", quantity: 2 },
  { name: "Coca-Cola 750 ml", quantity: 1 },
  { name: "Amul Taaza Milk", quantity: 2 },
  { name: "Farm Eggs", quantity: 1 },
];

function demoOrder(orderNumber: string, customerArea: string, payout: number, itemsCount: number, distanceKm: number, estimatedMinutes: number, codAmount = 0): DeliveryOrder {
  return {
    id: orderNumber, orderNumber, storeName: "Dark Store #104", storeAddress: "Gate 2, Koramangala 4th Block",
    storePhone: "", customerName: "Ananya R.", customerArea, customerAddress: "Flat 4B, Sunrise Apartments",
    customerPhone: "", itemsCount, items: itemsCount === 7 ? demoItems : demoItems.filter((item) => item.name !== "Amul Taaza Milk"),
    estimatedMinutes, distanceKm, pickupDistanceKm: 0.6, pickupMinutes: 3, dropMinutes: 9,
    payout, demoDeliveryOtp: "4821", pickupPin: "7193", codAmount,
  };
}

const initialDemoOffers = [
  demoOrder("TTM-90245", "HSR Layout, Sector 2", 90, 7, 2.4, 18),
  demoOrder("TTM-90246", "Ejipura Main Road", 75, 5, 1.8, 14, 320),
];

export default function RiderDashboardPage() {
  const { firebaseUser, user: sessionUser, loading: authLoading } = useAuth();
  const riderKey = ["rider-me", firebaseUser?.uid] as const;
  const query = useQueryClient();
  const stepInFlight = useRef(false);
  const [stepPending, setStepPending] = useState(false);
  // State
  const [demoOnline, setDemoOnline] = useState(true);
  const [dutyPending, setDutyPending] = useState(false);
  const [offerPending, setOfferPending] = useState(false);
  const offerInFlight = useRef(false);
  const respondedOffer = useRef<string | undefined>(undefined);
  const [activeStep, setActiveStep] = useState<1 | 2 | 3 | 4>(1);
  const [enteredOtp, setEnteredOtp] = useState("");
  const [otpError, setOtpError] = useState("");
  const [toast, setToast] = useState<{ type: "success" | "error" | "info"; message: string } | null>(null);

  // Incoming offer state
  const [incomingOffer, setIncomingOffer] = useState<DeliveryOrder | null>(null);
  const [offerCountdown, setOfferCountdown] = useState(30);
  const [demoOffers, setDemoOffers] = useState(initialDemoOffers);
  const demoAutoprompted = useRef(false);
  const [offerSheetOpen, setOfferSheetOpen] = useState(false);

  // Active delivery order
  const [activeOrder, setActiveOrder] = useState<DeliveryOrder | null>(null);
  const [deliveryOpen, setDeliveryOpen] = useState(false);
  const [openingOrderId, setOpeningOrderId] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<DeliveryOrder | null>(null);
  const [checkedItems, setCheckedItems] = useState<number[]>([]);

  // Metrics
  const [demoEarnings, setDemoEarnings] = useState(DEMO_RIDER.earningsToday);
  const [demoTrips, setDemoTrips] = useState(DEMO_RIDER.tripsToday);
  const [demoCod, setDemoCod] = useState(DEMO_RIDER.codBalance);

  // Completed trips history
  const [demoDrops, setDemoDrops] = useState<RiderTrip[]>([
    {
      id: "trip-1",
      orderNumber: "TTM-90241",
      customerArea: "5th Block, Koramangala",
      completedAt: "42 mins ago",
      payout: 85,
      distanceKm: 2.1
    },
    {
      id: "trip-2",
      orderNumber: "TTM-90238",
      customerArea: "Ejipura Main Road",
      completedAt: "1 hr 15m ago",
      payout: 95,
      distanceKm: 3.4
    },
    {
      id: "trip-3",
      orderNumber: "TTM-90229",
      customerArea: "ST Bed Layout",
      completedAt: "2 hrs ago",
      payout: 75,
      distanceKm: 1.8
    }
  ]);

  // Modals
  const [profilePanel, setProfilePanel] = useState<"kyc" | "vehicle" | "help" | null>(null);
  const [earningsRange, setEarningsRange] = useState<"day" | "week">("week");
  const [selectedEarningsBar, setSelectedEarningsBar] = useState<number | null>(null);
  const [tripRange, setTripRange] = useState<"today" | "week">("today");
  const [homeTab, setHomeTab] = useState<"home" | "trips" | "earnings" | "profile">("home");
  const [showCod, setShowCod] = useState(false);
  const [isSosModalOpen, setIsSosModalOpen] = useState(false);


  // Auto-dismiss toast
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const rider = useQuery<RiderDashboard>({
    queryKey: riderKey,
    enabled: Boolean(firebaseUser),
    refetchOnMount: true,
    staleTime: 5_000,
    refetchInterval: ({ state }) => state.data?.profile?.is_online || state.data?.activeOrder ? 5000 : false,
    queryFn: async ({ signal }) => (await apiFetch<RiderDashboard>("/api/rider/me", { signal })).data!,
  });
  const backendData = rider.data;
  const user = sessionUser ?? backendData?.user;
  const profile = backendData?.profile;
  const changeTab = (tab: typeof homeTab) => {
    setHomeTab(tab);
    setProfilePanel(null);
    window.scrollTo(0, 0);
  };

  const resolvingRider = firebaseUser ? rider.isPending : authLoading;
  const riderUnavailable = rider.isError && !backendData;
  const liveMode = Boolean(profile || user?.role === "rider");
  const demoMode = !resolvingRider && !riderUnavailable && !liveMode;
  const isOnline = demoMode ? demoOnline : Boolean(profile?.is_online);
  const earnings = useQuery({
    queryKey: ["rider-earnings", user?.id, "summary"],
    enabled: liveMode && Boolean(user?.id),
    refetchOnMount: true,
    queryFn: async ({ signal }) => (await apiFetch<Earnings>("/api/rider/earnings?summary=1", { signal })).data,
  });
  const loadingEarnings = liveMode && earnings.isPending;
  const todayEarnings = demoMode ? demoEarnings : earnings.data?.todayEarned;
  const todayTrips = demoMode ? demoTrips : earnings.data?.todayTrips;
  const todayCod = demoMode ? demoCod : earnings.data?.codBalance;
  const completedTrips = demoMode ? demoDrops : earnings.data?.todayDrops ?? [];

  useEffect(() => {
    if (!demoMode || !isOnline || activeOrder || receipt || homeTab !== "home" || demoAutoprompted.current || !demoOffers[0]) return;
    const timer = window.setTimeout(() => {
      demoAutoprompted.current = true;
      setOfferCountdown(20);
      setIncomingOffer(demoOffers[0]);
      setOfferSheetOpen(true);
    }, 3500);
    return () => window.clearTimeout(timer);
  }, [demoMode, isOnline, activeOrder, receipt, homeTab, demoOffers]);

  useEffect(() => {
    if (!incomingOffer) return;
    const deadline = incomingOffer.offeredAt ? Date.parse(incomingOffer.offeredAt) + 30_000 : Date.now() + 20_000;
    const tick = () => {
      const remaining = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
      setOfferCountdown(remaining);
      if (!remaining) {
        respondedOffer.current = incomingOffer.offerId;
        setIncomingOffer(null);
        setOfferSheetOpen(false);
        setToast({ type: "info", message: "Delivery offer expired." });
      }
    };
    tick();
    const timer = window.setInterval(tick, 1000);
    return () => window.clearInterval(timer);
  }, [incomingOffer]);

  useEffect(() => {
    const offer = backendData?.pendingOffer;
    if (!liveMode || !isOnline || activeOrder || !offer?.order || offer.id === respondedOffer.current) return;
    if (Date.parse(offer.offered_at) + 30_000 <= Date.now()) return;
    const order = offer.order;
    if (incomingOffer?.offerId === offer.id) return;
    setOfferSheetOpen(true);
    setIncomingOffer({
      id: order.id, orderNumber: `TTM-${order.order_no}`, storeName: order.store?.name || "Pickup store",
      storeAddress: order.store?.address || "", storePhone: "", customerName: "Customer",
      customerAddress: [order.address_snapshot?.landmark, order.address_snapshot?.city].filter(Boolean).join(", "),
      customerPhone: "", itemsCount: order.items?.reduce((total, item) => total + item.quantity, 0) ?? 0, items: [], pickupPin: "",
      estimatedMinutes: Number(order.eta_minutes ?? 0), distanceKm: Number(order.distance_m ?? 0) / 1000,
      payout: offer.payout == null ? null : Number(offer.payout),
      codAmount: order.payment_method === "cod" ? Number(order.grand_total) : 0,
      offerId: offer.id, offeredAt: offer.offered_at,
    });
  }, [backendData?.pendingOffer, liveMode, isOnline, activeOrder, incomingOffer?.offerId]);

  async function toggleDuty() {
    if (activeOrder) {
      setToast({ type: "info", message: "Finish the active delivery before changing duty status." });
      return;
    }
    if (resolvingRider || riderUnavailable || dutyPending) return;
    const next = !isOnline;
    if (demoMode) setDemoOnline(next);
    else {
      setDutyPending(true);
      const result = await apiFetch("/api/rider/status", {
        method: "POST", body: JSON.stringify({ is_online: next }),
      });
      setDutyPending(false);
      if (!result.ok) {
        setToast({ type: "error", message: result.error || "Couldn’t update duty status." });
        return;
      }
      query.setQueryData<RiderDashboard>(riderKey, (data) => data?.profile
        ? { ...data, profile: { ...data.profile, is_online: next } } : data);
      void query.invalidateQueries({ queryKey: riderKey });
    }
    if (!next) setIncomingOffer(null);
    setToast({ type: "info", message: next ? "You’re online." : "You’re offline." });
  }

  const liveOrder = backendData?.activeOrder;
  const liveOrderId = liveOrder?.id;
  const sharingRoute = Boolean(liveOrder && isRouteActive(liveOrder.status));
  const [gpsError, setGpsError] = useState(false);
  useEffect(() => {
    if (!sharingRoute || !liveOrderId || !navigator.geolocation) return;
    let lastSentAt = 0;
    let sending = false;
    const request = new AbortController();
    const watch = navigator.geolocation.watchPosition(({ coords }) => {
      if (sending || Date.now() - lastSentAt < 7000) return;
      lastSentAt = Date.now();
      sending = true;
      void apiFetch("/api/rider/location", {
        method: "POST", signal: request.signal,
        body: JSON.stringify({ orderId: liveOrderId, lat: coords.latitude, lng: coords.longitude,
          heading: coords.heading ?? undefined, speed: coords.speed ?? undefined }),
      }).then(({ ok }) => {
        if (!request.signal.aborted) setGpsError(!ok);
      }).finally(() => { sending = false; });
    }, () => setGpsError(true), { enableHighAccuracy: true, maximumAge: 5000, timeout: 15000 });
    return () => {
      navigator.geolocation.clearWatch(watch);
      request.abort();
    };
  }, [liveOrderId, sharingRoute]);

  // Sync active backend orders if available
  useEffect(() => {
    if (backendData?.activeOrder && !activeOrder) {
      const bOrder = backendData.activeOrder;
      setActiveOrder({
        id: bOrder.id,
        orderNumber: bOrder.order_no == null ? bOrder.id.slice(0, 8).toUpperCase() : `TTM-${bOrder.order_no}`,
        storeName: bOrder.store?.name || "Pickup store",
        storeAddress: bOrder.store?.address || "",
        storePhone: bOrder.store?.phone || "",
        customerName: bOrder.address_snapshot?.receiver_name || "Customer",
        customerAddress: [bOrder.address_snapshot?.line1, bOrder.address_snapshot?.line2, bOrder.address_snapshot?.city].filter(Boolean).join(", "),
        customerPhone: bOrder.address_snapshot?.receiver_phone ?? "",
        itemsCount: (bOrder.items ?? []).reduce((total: number, item: { quantity: number }) => total + item.quantity, 0),
        items: (bOrder.items ?? []).map((item) => ({ name: item.name_snapshot, quantity: item.quantity })),
        estimatedMinutes: Number(bOrder.eta_minutes ?? 0),
        distanceKm: Number(bOrder.distance_m ?? 0) / 1000,
        payout: bOrder.assignments?.[0]?.payout == null ? null : Number(bOrder.assignments[0].payout),
        codAmount: bOrder.payment_method === "cod" ? Number(bOrder.grand_total) : 0,
        pickupPin: bOrder.pickup_code ?? ""
      });
      const steps: Record<string, 1 | 2 | 3 | 4> = { rider_at_store: 2, picked_up: 3, out_for_delivery: 3, arrived: 4 };
      setActiveStep(steps[bOrder.status] ?? 1);
      if (bOrder.id === openingOrderId) {
        setOpeningOrderId(null);
        setDeliveryOpen(true);
        window.scrollTo(0, 0);
      }
    }
  }, [backendData, activeOrder, openingOrderId]);

  async function respondToOffer(action: "accept" | "reject", offer = incomingOffer) {
    if (!offer || (offer.offerId && offerCountdown <= 0) || offerInFlight.current) return;
    if (offer.offerId) {
      offerInFlight.current = true;
      setOfferPending(true);
      const result = await apiFetch(`/api/rider/offers/${offer.offerId}/respond`, {
        method: "POST", body: JSON.stringify({ action }),
      });
      offerInFlight.current = false;
      setOfferPending(false);
      if (!result.ok) {
        setToast({ type: "error", message: result.error || "Couldn’t respond to this order." });
        void query.invalidateQueries({ queryKey: riderKey });
        return;
      }
      respondedOffer.current = offer.offerId;
      if (action === "accept") setOpeningOrderId(offer.id);
      void query.invalidateQueries({ queryKey: riderKey });
    } else if (action === "accept") {
      demoAutoprompted.current = true;
      setActiveOrder(offer);
      setActiveStep(1);
      setDeliveryOpen(true);
      window.scrollTo(0, 0);
    }
    if (!offer.offerId) setDemoOffers((offers) => offers.filter((entry) => entry.id !== offer.id));
    setIncomingOffer(null);
    setOfferSheetOpen(false);
    setCheckedItems([]);
    setToast({ type: "info", message: action === "accept" ? "Order accepted." : "Order declined." });
  }

  async function persistStep(step: string, code?: string) {
    if (!activeOrder || stepInFlight.current) return false;
    if (activeOrder.demoDeliveryOtp) return true;
    stepInFlight.current = true;
    setStepPending(true);
    try {
      const result = await apiFetch(`/api/rider/orders/${activeOrder.id}/step`, {
        method: "POST", body: JSON.stringify({ step, code }),
      });
      if (!result.ok) {
        const message = result.error ?? "The delivery status couldn’t be updated.";
        if (step === "deliver") setOtpError(message);
        else setToast({ type: "error", message });
        return false;
      }
      if (step !== "deliver") void query.invalidateQueries({ queryKey: riderKey });
      return true;
    } finally {
      stepInFlight.current = false;
      setStepPending(false);
    }
  }

  const handleArriveAtStore = async () => {
    if (!await persistStep("arrived-store")) return;
    setActiveStep(2);
    setToast({
      type: "success",
      message: "Arrived at Dark Store! Step 2: Show pickup PIN to packer and scan bag."
    });
  };

  const handleVerifyPickup = async () => {
    if (!activeOrder || checkedItems.length !== activeOrder.items.length) return;
    if (!await persistStep("picked-up", activeOrder.pickupPin)) return;
    setActiveStep(3);
    setToast({
      type: "success",
      message: "Bag collected & secured! Step 3: Out for delivery to customer doorstep."
    });
  };

  const handleArriveAtCustomer = async () => {
    if (!await persistStep("arrived")) return;
    setActiveStep(4);
    setToast({
      type: "success",
      message: "Arrived at customer location! Step 4: Ask customer for the 4-digit Delivery OTP."
    });
  };

  const handleCompleteDelivery = async () => {
    if (!activeOrder) return;
    const cleanOtp = enteredOtp.trim();

    if (!/^\d{4}$/.test(cleanOtp)) {
      setOtpError("Enter the four-digit delivery code.");
      return;
    }
    if (!activeOrder.demoDeliveryOtp) {
      if (!await persistStep("deliver", cleanOtp)) return;
      query.setQueryData<RiderDashboard>(riderKey, (data) => data ? { ...data, activeOrder: null } : data);
      void query.invalidateQueries({ queryKey: riderKey });
      setReceipt(activeOrder);
      setDeliveryOpen(false);
      window.scrollTo(0, 0);
      setActiveOrder(null);
      setEnteredOtp("");
      setOtpError("");
      setActiveStep(1);
      void query.invalidateQueries({ queryKey: ["rider-earnings", user?.id] });
      setToast({ type: "success", message: "Delivery confirmed." });
      return;
    }
    if (cleanOtp !== activeOrder.demoDeliveryOtp) {
      setOtpError("Invalid delivery code.");
      return;
    }

    // Success: credit earnings & update metrics
    const earned = activeOrder.payout ?? 0;
    setDemoEarnings((prev) => prev + earned);
    setDemoTrips((prev) => prev + 1);
    if (activeOrder.codAmount) {
      setDemoCod((prev) => prev + (activeOrder.codAmount || 0));
    }

    setDemoDrops((prev) => [
      {
        id: `trip-${Date.now()}`,
        orderNumber: activeOrder.orderNumber,
        customerArea: activeOrder.customerArea || activeOrder.customerAddress.split(",")[0],
        completedAt: "Just now",
        payout: earned,
        distanceKm: activeOrder.distanceKm
      },
      ...prev
    ]);

    setToast({
      type: "success",
      message: `Demo delivery completed. ${formatRupees(earned)} added to the demo total.`
    });

    setReceipt(activeOrder);
    setDeliveryOpen(false);
    window.scrollTo(0, 0);
    setActiveOrder(null);
    setActiveStep(1);
    setEnteredOtp("");
    setOtpError("");
  };

  // Simulate incoming delivery request
  const triggerSimulation = () => {
    if (!demoMode || !isOnline || incomingOffer) return;
    if (activeOrder) {
      setToast({ type: "info", message: "You already have an active delivery in progress!" });
      return;
    }
    const sampleId = "TTM-" + Math.floor(10000 + Math.random() * 90000);
    const offer = demoOrder(sampleId, "BTM 2nd Stage", 85, 7, 2.9, 16);
    demoAutoprompted.current = true;
    setDemoOffers((offers) => [...offers, offer]);
    setIncomingOffer(offer);
    setOfferSheetOpen(true);
    setOfferCountdown(20);
  };

  if (resolvingRider) return <RiderHomeSkeleton />;

  const name = demoMode ? DEMO_RIDER.name : user?.name || "Delivery partner";
  const initials = name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase();
  const vehicle = demoMode ? DEMO_RIDER.vehicleNumber
    : [profile?.vehicle_no, profile?.vehicle_type].filter(Boolean).join(" · ");
  const rating = demoMode ? DEMO_RIDER.rating : profile?.rating;
  const zone = demoMode ? "Koramangala" : profile?.home_store?.name || "No assigned store";
  const chart = earningsRange === "day"
    ? demoMode ? [40, 90, 160, 210, 140, 180, 320, 0] : [todayEarnings ?? 0]
    : demoMode ? [820, 960, 1100, 740, 1280, 1450, demoEarnings] : earnings.data?.dailyEarnings ?? [];
  const earningsLabel = earningsRange === "day" ? "Today" : "This week";
  const selectEarningsRange = (range: typeof earningsRange) => { setEarningsRange(range); setSelectedEarningsBar(null); };
  const visibleTrips = !demoMode && tripRange === "week" ? earnings.data?.recentDrops ?? completedTrips : completedTrips;
  const chartMax = Math.max(1, ...chart);
  const avatar = demoMode ? DEMO_RIDER.avatar : sessionUser?.photo_url ?? firebaseUser?.photoURL ?? user?.photo_url;
  const resumeDelivery = () => { setDeliveryOpen(true); window.scrollTo(0, 0); };
  const isDeliveryScreen = Boolean(receipt || (deliveryOpen && activeOrder));
  const availableOffers = demoMode ? demoOffers : incomingOffer ? [incomingOffer] : [];
  const tripsToBonus = Math.max(0, bonusTarget - demoTrips);

  return (
    <div className="rider-home">
      <div className="rider-shell">
        {receipt ? <RiderDeliveryReceipt order={receipt} onHome={() => { setReceipt(null); changeTab("home"); }} />
        : deliveryOpen && activeOrder ? <RiderDelivery order={activeOrder} step={activeStep} pending={stepPending}
          preparing={liveOrder?.status === "picking"} instructions={liveOrder?.instructions} gpsError={gpsError}
          otp={enteredOtp} otpError={otpError} onOtp={(value) => { setEnteredOtp(value); setOtpError(""); }}
          checked={checkedItems} onCheck={(index) => setCheckedItems((current) => current.includes(index) ? current.filter((item) => item !== index) : [...current, index])}
          onBack={() => { setDeliveryOpen(false); window.scrollTo(0, 0); }}
          onNext={() => void [handleArriveAtStore, handleVerifyPickup, handleArriveAtCustomer, handleCompleteDelivery][activeStep - 1]()} />
        : homeTab === "home" && <>
        <header className="rider-top">
          <div className="flex min-w-0 items-center gap-3">
            <button type="button" className="rider-identity" onClick={() => changeTab("profile")} aria-label="Open rider profile">
              <span className="rider-avatar">
                <AccountAvatar src={avatar} className="rider-avatar-photo"
                  fallback={<span className="rider-avatar-photo">{initials}</span>} />
                <i className="rider-availability" data-online={isOnline} aria-hidden="true" />
              </span>
              <span className="rider-identity-copy">
                <strong>{name}</strong>
                <span>
                  {rating != null && <b className="rider-rating"><Star size={11} fill="currentColor" aria-hidden="true" />{Number(rating).toFixed(2)}</b>}
                  <span className="truncate">{vehicle || "Rider dashboard"}</span>
                </span>
              </span>
            </button>
            <RiderSosButton onOpen={() => setIsSosModalOpen(true)} />
          </div>
        </header>

        <main className="rider-content">
          <section className="rider-card" aria-labelledby="rider-duty-title">
            <div className="flex items-center gap-3">
              <div className="min-w-0 flex-1">
                <h1 id="rider-duty-title" className="rider-duty-title">{riderUnavailable ? "Duty status unavailable" : isOnline ? "You’re online" : "You’re offline"}</h1>
                <p className="rider-muted mt-0.5 text-xs">{riderUnavailable ? "Duty status couldn’t load." : isOnline
                  ? demoMode ? "Receiving orders · 6h 24m today" : "Available for delivery offers"
                  : "Go online to start receiving orders"}</p>
              </div>
              <button type="button" role="switch" aria-label="On duty" aria-checked={isOnline}
                disabled={dutyPending || riderUnavailable} className="rider-duty-switch"
                onClick={() => void toggleDuty()} />
            </div>
            <div className="rider-duty-zone">
              <p className="min-w-0 flex-1 text-xs"><span className="rider-muted">Zone </span><strong>{zone}</strong></p>
              {demoMode && <span className="rider-demand" title="Demo mode"><i aria-hidden="true" />High demand<span className="sr-only"> · Demo mode</span></span>}
              {riderUnavailable && <button type="button" disabled={rider.isFetching} className="rider-secondary" onClick={() => void rider.refetch()}>{rider.isFetching ? "Retrying…" : "Retry"}</button>}
            </div>
          </section>

          {activeOrder ? (
            <button type="button" className="rider-active-order" onClick={resumeDelivery}>
              <span><small>Delivery in progress</small><strong>{activeOrder.orderNumber}{activeOrder.payout != null && ` · ${formatRupees(activeOrder.payout)}`}</strong></span>
              <span>Resume ›</span>
            </button>
          ) : openingOrderId ? (
            <section className="rider-card" role="status"><p className="font-bold">Opening your accepted order…</p><p className="rider-muted text-sm">Retrieving pickup details.</p>{!rider.isFetching && <button type="button" className="rider-inline-action" onClick={() => void rider.refetch()}>Refresh order</button>}</section>
          ) : !riderUnavailable && (
            <section className="rider-offers" aria-labelledby="rider-offers-title">
              {isOnline && <div className="rider-offers-heading">
                <h2 id="rider-offers-title">Orders near you</h2><span><i aria-hidden="true" />{availableOffers.length} available</span>
              </div>}
              {isOnline && availableOffers.length ? availableOffers.map((offer) => (
                <article key={offer.id} className="rider-card rider-offer-card">
                  <div data-demo={demoMode} className="rider-offer-time" role={demoMode ? undefined : "progressbar"} aria-label={demoMode ? undefined : "Time left to accept"} aria-valuemin={demoMode ? undefined : 0} aria-valuemax={demoMode ? undefined : 30} aria-valuenow={demoMode ? undefined : offerCountdown}><i style={{ transform: `scaleX(${demoMode ? 1 : offerCountdown / 30})` }} /></div>
                  <div className="rider-offer-meta">
                    <div><p className="rider-muted text-xs font-semibold">You’ll earn</p><strong className="rider-offer-pay">{offer.payout == null ? "—" : formatRupees(offer.payout)}</strong></div>
                    <div>
                      <span className="rider-chip rider-chip-green">{offer.codAmount ? `COD ${formatRupees(offer.codAmount)}` : "Prepaid"}</span>
                      {offer.itemsCount > 0 && <span className="rider-chip">{offer.itemsCount} items</span>}
                      {offer.estimatedMinutes > 0 && <span className="rider-chip">~{offer.estimatedMinutes} min</span>}
                    </div>
                  </div>
                  <RiderOfferRoute order={offer} />
                  <div className="rider-offer-actions">
                    <button type="button" disabled={offerPending || (!demoMode && !offerCountdown)} className="rider-secondary" onClick={() => void respondToOffer("reject", offer)}>Decline</button>
                    <button type="button" disabled={offerPending || (!demoMode && !offerCountdown)} className="rider-primary" onClick={() => void respondToOffer("accept", offer)}>Accept order</button>
                  </div>
                </article>
              )) : (
                <div className="rider-card rider-idle">
                  {isOnline && <div className="rider-radar" data-online aria-hidden="true"><i /><i /><i /><span><Bike size={25} /></span></div>}
                  <h3 id={isOnline ? undefined : "rider-offers-title"}>{isOnline ? "Looking for orders nearby" : "You’re offline"}</h3>
                  <p className="rider-muted mt-1 text-sm">{isOnline ? "Keep the app open to see incoming offers." : "Switch on duty to see delivery offers."}</p>
                  {isOnline && demoMode && <button type="button" className="rider-inline-action mt-1" onClick={triggerSimulation}>Simulate a new order</button>}
                </div>
              )}
            </section>
          )}

          {loadingEarnings ? <RiderEarningsSkeleton /> : <section className="rider-card rider-metrics-card" aria-label="Today’s activity">
            <div className="rider-metric-strip">
              <button type="button" onClick={() => changeTab("earnings")}><small>Earnings</small><strong>{todayEarnings == null ? "—" : formatRupees(todayEarnings)}</strong></button>
              <button type="button" onClick={() => changeTab("trips")}><small>Trips</small><strong>{todayTrips ?? "—"}</strong></button>
              <button type="button" onClick={() => setShowCod(true)}><small>COD due</small><strong>{todayCod == null ? "—" : formatRupees(todayCod)}</strong></button>
            </div>
            {earnings.isError && <button type="button" className="rider-inline-action mt-2" onClick={() => void earnings.refetch()}>Retry earnings</button>}
          </section>}

          {demoMode ? <section className="rider-card flex items-center gap-3" aria-label="Demo partner bonus">
            <div className="rider-bonus-ring" aria-hidden="true">
              <svg viewBox="0 0 80 80"><circle className="track" cx="40" cy="40" r="33" /><circle className="progress" cx="40" cy="40" r="33" pathLength="100" strokeDashoffset={Math.max(0, 100 * (1 - demoTrips / bonusTarget))} /></svg>
              <b>{Math.min(demoTrips, bonusTarget)}/{bonusTarget}</b>
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2"><h2 className="text-[15px] font-extrabold">Gold bonus · {formatRupees(bonusValue)}</h2></div>
              <p className="rider-muted my-1 text-xs">{tripsToBonus
                ? <><strong>{tripsToBonus} more {tripsToBonus === 1 ? "trip" : "trips"}</strong> to unlock</>
                : <strong>Demo bonus unlocked</strong>}</p>
            </div>
          </section> : profile && <section className="rider-card flex items-center gap-3" aria-label="Partner verification">
            <div className="grid size-11 shrink-0 place-items-center rounded-xl bg-[var(--r-chip)]"><User size={20} aria-hidden="true" /></div>
            <div className="min-w-0 flex-1"><h2 className="text-[15px] font-extrabold">Partner verification</h2>
              <p className="rider-muted text-xs">{profile.kyc_status === "approved" ? "KYC verified" : `KYC ${profile.kyc_status || "pending"}`}</p></div>
            <button type="button" className="rider-secondary" onClick={() => changeTab("profile")}>Profile</button>
          </section>}

          {demoMode && <button className="rider-demo-alert" type="button" onClick={() => { changeTab("profile"); setProfilePanel("kyc"); }}>
            <AlertTriangle size={21} aria-hidden="true" /><span><strong>Insurance expires in 12 days</strong><small>Upload a new policy to keep receiving orders</small></span>
          </button>}
        </main></>}

        {!isDeliveryScreen && homeTab !== "home" && (
          <main className="rider-subscreen" aria-labelledby="rider-sub-title">
            <header className="flex items-center gap-2.5">
              {profilePanel && <button type="button" className="rider-icon-action" onClick={() => setProfilePanel(null)} aria-label="Back to profile"><ChevronLeft size={25} aria-hidden="true" /></button>}
              <h1 id="rider-sub-title">{homeTab === "trips" ? "Trips" : homeTab === "earnings" ? "Earnings" : profilePanel === "kyc" ? "KYC & documents" : profilePanel === "vehicle" ? "My vehicle" : profilePanel === "help" ? "Help & support" : "Profile"}</h1>
            </header>
            <div className="rider-sub-content">
              {homeTab === "trips" && <>
                <div className="rider-segment" role="group" aria-label="Trip date range">
                  <button type="button" aria-pressed={tripRange === "today"} onClick={() => setTripRange("today")}>Today</button>
                  <button type="button" aria-pressed={tripRange === "week"} onClick={() => setTripRange("week")}>Last 7 days</button>
                </div>
                <section className="rider-card">
                  <h2 className="font-extrabold">{tripRange === "today" ? "Today’s trips" : "Recent trips"}</h2>
                  <TripList trips={visibleTrips} loading={loadingEarnings} error={earnings.isError && !earnings.data} emptyText={tripRange === "week" ? "No completed trips in the last seven days." : undefined} />
                </section>
              </>}
              {homeTab === "earnings" && <>
                <div className="rider-segment" role="group" aria-label="Earnings date range">
                  <button type="button" aria-pressed={earningsRange === "day"} onClick={() => selectEarningsRange("day")}>Day</button>
                  <button type="button" aria-pressed={earningsRange === "week"} onClick={() => selectEarningsRange("week")}>Week</button>
                </div>
                {loadingEarnings ? <RiderEarningsSkeleton /> : <section className="rider-card rider-earnings">
                  <h2>{earningsLabel}{demoMode ? " · Demo" : ""}</h2>
                  <p className="rider-earnings-amount">{todayEarnings == null ? "—" : formatRupees(selectedEarningsBar == null ? earningsRange === "day" ? todayEarnings : chart.reduce((sum, amount) => sum + amount, 0) : chart[selectedEarningsBar] ?? 0)}</p>
                  {chart.length > 0 && <div className="rider-earnings-chart" role="group" aria-label="Earnings chart">
                    {chart.map((amount, index) => {
                      const label = earningsRange === "week"
                        ? new Intl.DateTimeFormat("en", { weekday: "short", timeZone: "Asia/Kolkata" }).format(new Date(Date.now() - (chart.length - index - 1) * 86_400_000))
                        : demoMode ? ["6a", "8a", "10a", "12p", "2p", "4p", "6p", "8p"][index] : "Today";
                      return <button type="button" key={index} aria-label={`${label}, ${formatRupees(amount)}`} aria-pressed={(selectedEarningsBar ?? chart.length - 1) === index} onClick={() => setSelectedEarningsBar(index)}>
                        <i style={{ "--r-level": Math.max(.04, amount / chartMax) } as CSSProperties} /><small>{label}</small>
                      </button>;
                    })}
                  </div>}
                  {earnings.isError && !earnings.data && <button type="button" className="min-h-11 underline" onClick={() => void earnings.refetch()}>Retry earnings</button>}
                </section>}
                <section className="rider-card"><h2 className="font-extrabold">Passbook</h2>
                  <TripList trips={completedTrips} loading={loadingEarnings} error={earnings.isError && !earnings.data} />
                  {!demoMode && <Link href="/rider/earnings" className="rider-secondary mt-3">View payouts and history</Link>}
                </section>
              </>}
              {homeTab === "profile" && <>
                {!profilePanel && <>
                  <section className="rider-card rider-profile-card"><AccountAvatar src={avatar} className="rider-avatar-photo" fallback={<span className="rider-avatar-photo">{initials}</span>} /><h2>{name}</h2>{user?.phone && <p className="rider-muted text-sm">{user.phone}</p>}
                    <div className="mt-2 flex justify-center gap-2">
                      {demoMode && <span className="rider-chip rider-chip-gold">GOLD</span>}
                      {rating != null && <span className="rider-chip rider-chip-green">★ {Number(rating).toFixed(2)}</span>}
                    </div>
                  </section>
                  <section className="rider-card rider-profile-list" aria-label="Rider account">
                    <button type="button" onClick={() => setProfilePanel("kyc")}><span className="rider-profile-icon"><Check size={17} aria-hidden="true" /></span><span><strong>KYC & documents</strong><small>{demoMode ? "Demo documents" : profile?.kyc_status || "Pending"}</small></span><ChevronRight size={18} aria-hidden="true" /></button>
                    <button type="button" onClick={() => setProfilePanel("vehicle")}><span className="rider-profile-icon"><Bike size={17} aria-hidden="true" /></span><span><strong>My vehicle</strong><small>{vehicle || "Vehicle details"}</small></span><ChevronRight size={18} aria-hidden="true" /></button>
                    <button type="button" onClick={() => setProfilePanel("help")}><span className="rider-profile-icon">?</span><span><strong>Help & support</strong><small>Safety and delivery support</small></span><ChevronRight size={18} aria-hidden="true" /></button>
                  </section>
                  {demoMode && <Link href="/login" className="rider-primary">Sign in</Link>}<Link href="/" className="rider-secondary">Back to storefront</Link>
                </>}
                {profilePanel === "kyc" && <>
                  {demoMode && <div className="rider-demo-alert"><AlertTriangle size={21} aria-hidden="true" /><span><strong>Action needed</strong><small>Demo insurance expires in 12 days</small></span></div>}
                  <section className="rider-card rider-account-details"><h2>Verification</h2><p className="rider-muted text-sm">{demoMode ? "Demo profile" : profile?.kyc_status || "Pending"}</p></section>
                </>}
                {profilePanel === "vehicle" && <section className="rider-card rider-earnings"><h2>Registered vehicle</h2><p className="text-xl font-extrabold">{demoMode ? DEMO_RIDER.vehicleModel : profile?.vehicle_type || "Vehicle unavailable"}</p><p className="text-sm">{demoMode ? DEMO_RIDER.vehicleNumber : profile?.vehicle_no}</p></section>}
                {profilePanel === "help" && <section className="rider-card rider-account-details"><h2>Help & support</h2><button type="button" className="rider-inline-action" onClick={() => setIsSosModalOpen(true)}>Emergency support</button>{activeOrder?.storePhone && <a className="rider-secondary ml-2" href={`tel:${activeOrder.storePhone}`}>Call the store</a>}</section>}
              </>}
            </div>
          </main>
        )}

        {!isDeliveryScreen && activeOrder && <button type="button" className="rider-resume-pill" onClick={resumeDelivery}><i aria-hidden="true" /> Delivery in progress <strong>Resume ›</strong></button>}
        {!isDeliveryScreen && <nav className="rider-tabs" aria-label="Rider navigation">
          <button type="button" aria-current={homeTab === "home" ? "page" : undefined} onClick={() => changeTab("home")}><House size={21} aria-hidden="true" />Home</button>
          <button type="button" aria-current={homeTab === "trips" ? "page" : undefined} onClick={() => changeTab("trips")}><ClipboardList size={21} aria-hidden="true" />Trips</button>
          <button type="button" aria-current={homeTab === "earnings" ? "page" : undefined} onClick={() => changeTab("earnings")}><TrendingUp size={21} aria-hidden="true" />Earnings</button>
          <button type="button" aria-current={homeTab === "profile" ? "page" : undefined} onClick={() => changeTab("profile")}><User size={21} aria-hidden="true" />Profile</button>
        </nav>}
      </div>

      {toast && <div role="status" className={`rider-toast ${isDeliveryScreen ? "rider-toast-delivery" : ""}`}>
        {toast.message}
      </div>}

      {incomingOffer && offerSheetOpen && !isDeliveryScreen && !activeOrder && (
        <SwipeableSheet onClose={() => { if (!offerPending) setOfferSheetOpen(false); }} labelledBy="rider-offer-title" variant="rider-offer">
          <div className="rider-offer-sheet">
            <div className="flex items-center gap-[14px]">
              <div className="rider-offer-clock" aria-label={`${offerCountdown} seconds remaining`}>
                <svg viewBox="0 0 64 64" aria-hidden="true"><circle cx="32" cy="32" r="28" stroke="#eef1f8" />
                  <circle cx="32" cy="32" r="28" stroke="#fd5e00" strokeLinecap="round" pathLength="100" strokeDasharray="100" strokeDashoffset={100 * (1 - offerCountdown / (demoMode ? 20 : 30))} />
                </svg>{offerCountdown}
              </div>
              <div><h2 id="rider-offer-title" tabIndex={-1} data-dialog-initial-focus>New order nearby</h2><p className="text-xs text-[#526078]">Accept before the timer ends</p></div>
            </div>
            <div className="rider-offer-sheet-pay">
              <p className="text-xs text-[#dce3f4]">You’ll earn</p>
              <p>{incomingOffer.payout == null ? "—" : formatRupees(incomingOffer.payout)}</p>
            </div>
            <RiderOfferRoute order={incomingOffer} detailed />
            <div className="rider-offer-actions">
              <button type="button" disabled={offerPending} onClick={() => void respondToOffer("reject")} className="rider-secondary">Decline</button>
              <button type="button" disabled={offerPending || !offerCountdown} onClick={() => void respondToOffer("accept")} className="rider-primary">
                Accept order
              </button>
            </div>
          </div>
        </SwipeableSheet>
      )}

      {showCod && (
        <SwipeableSheet onClose={() => setShowCod(false)} labelledBy="rider-sheet-cod">
          <div className="rider-sheet space-y-3 p-4">
            <h2 id="rider-sheet-cod" className="text-lg font-extrabold">Cash on delivery balance</h2>
            <p className="text-2xl font-extrabold">{todayCod == null ? "—" : formatRupees(todayCod)}</p>
            <p className="text-sm text-[#526078]">{demoMode ? "Sample balance for the rider preview." : "Contact your assigned store for cash handover instructions."}</p>
            {activeOrder?.storePhone && <a href={`tel:${activeOrder.storePhone}`} className="rider-primary w-full">Call the store</a>}
          </div>
        </SwipeableSheet>
      )}

      {isSosModalOpen && (
        <SwipeableSheet onClose={() => setIsSosModalOpen(false)} labelledBy="rider-sheet-sos">
          <div className="rider-sheet space-y-3 p-4">
            <h2 id="rider-sheet-sos" className="flex items-center gap-2 text-lg font-extrabold"><ShieldAlert size={22} className="text-red-700" aria-hidden="true" />Emergency support</h2>
            <p className="text-sm text-[#526078]">If you need urgent help, use the phone link to call emergency services.</p>
            <a href="tel:112" className="rider-primary w-full"><Phone size={17} aria-hidden="true" />Call emergency services (112)</a>
          </div>
        </SwipeableSheet>
      )}
    </div>
  );
}

function RiderOfferRoute({ order, detailed = false }: { order: DeliveryOrder; detailed?: boolean }) {
  return (
    <ol className="rider-offer-route">
      <li><strong>{order.storeName}</strong><p>Pickup{order.pickupDistanceKm != null && ` · ${order.pickupDistanceKm} km away`}</p></li>
      <li><strong>{order.customerArea || order.customerAddress || "Drop-off area unavailable"}</strong><p>Drop{order.distanceKm > 0 && ` · ${order.distanceKm} km`}{detailed && order.itemsCount > 0 && ` · ${order.itemsCount} items`}{detailed && (order.codAmount ? ` · COD ${formatRupees(order.codAmount)}` : " · Prepaid")}</p></li>
    </ol>
  );
}

function TripList({ trips, loading, error, emptyText = "No completed trips today." }: { trips: RiderTrip[]; loading?: boolean; error?: boolean; emptyText?: string }) {
  if (loading) return <div role="status" aria-label="Loading rider trips"><RiderDropsSkeleton /></div>;
  if (!trips.length) return <p className="py-3 text-xs text-[#526078]">{error ? "Trips couldn’t load." : emptyText}</p>;
  return (
    <ul className="divide-y divide-[#e4e7ef]">
      {trips.map((trip) => (
        <li key={trip.id} className="flex items-center gap-2.5 py-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#e7f8ef] text-[#067647]"><Check size={18} aria-hidden="true" /></span>
          <div className="min-w-0 flex-1">
            <strong className="text-sm">{trip.orderNumber}</strong>
            <p className="break-words text-xs text-[#526078]">{trip.customerArea} · {trip.completedAt}</p>
          </div>
          <div className="shrink-0 text-right"><strong className="text-sm text-[#067647]">+{formatRupees(trip.payout)}</strong>
            {trip.distanceKm != null && <p className="text-xs text-[#526078]">{trip.distanceKm.toFixed(1)} km</p>}</div>
        </li>
      ))}
    </ul>
  );
}
