"use client";

import { SwipeableSheet } from "@/components/ui/SwipeableSheet";
import { CodeInput } from "@/components/ui/CodeInput";
import { useRef, useState, useEffect, type CSSProperties } from "react";
import Link from "next/link";
import { AccountAvatar } from "@/components/customer/AccountAvatar";
import { formatRupees } from "@/components/customer/AnimatedRupees";
import { RiderDropsSkeleton, RiderEarningsSkeleton, RiderHomeSkeleton } from "./RiderHomeSkeleton";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertCircle, ArrowRight, Bike, Check, CheckCircle2, ClipboardList, House, MapPin,
  Navigation, Phone, ShieldAlert, Star, Store, TrendingUp, User,
} from "lucide-react";
import { useAuth, type SessionUser } from "@/components/providers/AppProviders";
import { apiFetch } from "@/lib/api/client";
import { isRouteActive } from "@/lib/orders/tracking";

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
  payout: number | null;
  demoDeliveryOtp?: string;
  pickupPin: string;
  codAmount?: number;
  offerId?: string;
  offeredAt?: string;
}

const bonusTarget = 16;
const bonusValue = 250;
const demoChart = [18, 26, 40, 22, 34, 52, 30, 46, 38, 56, 44, 50];

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
};

type RiderOrder = {
  id: string;
  order_no: number | null;
  grand_total: number;
  payment_method: string;
  distance_m: number | null;
  eta_minutes: number | null;
  address_snapshot: Partial<Record<"line1" | "line2" | "landmark" | "city" | "receiver_name" | "receiver_phone", string>> | null;
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
  activeOrder: (RiderOrder & {
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
  const { firebaseUser, user: sessionUser, loading: authLoading } = useAuth();
  const riderKey = ["rider-me", firebaseUser?.uid] as const;
  const query = useQueryClient();
  const stepInFlight = useRef(false);
  const [stepPending, setStepPending] = useState(false);
  // State
  const [demoOnline, setDemoOnline] = useState(true);
  const [showDemoEarnings, setShowDemoEarnings] = useState(false);
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

  // Active delivery order
  const [activeOrder, setActiveOrder] = useState<DeliveryOrder | null>(null);

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
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isTripsModalOpen, setIsTripsModalOpen] = useState(false);
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
    if (!incomingOffer) return;
    const deadline = incomingOffer.offeredAt ? Date.parse(incomingOffer.offeredAt) + 30_000 : Date.now() + 30_000;
    const tick = () => {
      const remaining = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
      setOfferCountdown(remaining);
      if (!remaining) {
        respondedOffer.current = incomingOffer.offerId;
        setIncomingOffer(null);
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
    setIncomingOffer((previous) => previous?.offerId === offer.id ? previous : ({
      id: order.id, orderNumber: `TTM-${order.order_no}`, storeName: order.store?.name || "Pickup store",
      storeAddress: order.store?.address || "", storePhone: "", customerName: "Customer",
      customerAddress: [order.address_snapshot?.landmark, order.address_snapshot?.city].filter(Boolean).join(", "),
      customerPhone: "", itemsCount: 0, itemsSummary: "", pickupPin: "",
      estimatedMinutes: Number(order.eta_minutes ?? 0), distanceKm: Number(order.distance_m ?? 0) / 1000,
      payout: offer.payout == null ? null : Number(offer.payout),
      codAmount: order.payment_method === "cod" ? Number(order.grand_total) : 0,
      offerId: offer.id, offeredAt: offer.offered_at,
    }));
  }, [backendData?.pendingOffer, liveMode, isOnline, activeOrder]);

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
        itemsSummary: (bOrder.items ?? []).map((item: { name_snapshot: string }) => item.name_snapshot).join(", "),
        estimatedMinutes: Number(bOrder.eta_minutes ?? 0),
        distanceKm: Number(bOrder.distance_m ?? 0) / 1000,
        payout: bOrder.assignments?.[0]?.payout == null ? null : Number(bOrder.assignments[0].payout),
        codAmount: bOrder.payment_method === "cod" ? Number(bOrder.grand_total) : 0,
        pickupPin: bOrder.pickup_code ?? ""
      });
      const steps: Record<string, 1 | 2 | 3 | 4> = { rider_at_store: 2, picked_up: 3, out_for_delivery: 3, arrived: 4 };
      setActiveStep(steps[bOrder.status] ?? 1);
    }
  }, [backendData, activeOrder]);

  async function respondToOffer(action: "accept" | "reject") {
    if (!incomingOffer || offerCountdown <= 0 || offerInFlight.current) return;
    const offer = incomingOffer;
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
      void query.invalidateQueries({ queryKey: riderKey });
    } else if (action === "accept") {
      setActiveOrder(offer);
      setActiveStep(1);
    }
    setIncomingOffer(null);
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
      void query.invalidateQueries({ queryKey: riderKey });
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
    if (!await persistStep("picked-up", activeOrder?.pickupPin)) return;
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
        customerArea: activeOrder.customerAddress.split(",")[0],
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
    const mockOrder: DeliveryOrder = {
      id: sampleId,
      orderNumber: sampleId,
      storeName: "TikTikMart Dark Store #104 (Koramangala)",
      storeAddress: "80 Feet Rd, 4th Block, Koramangala, Bengaluru",
      storePhone: "",
      customerName: "Demo customer",
      customerAddress: "Flat 402, Green Glen View, 5th Block, Koramangala",
      customerPhone: "",
      itemsCount: 4,
      itemsSummary: "Amul Taaza Milk (500ml), Modern Brown Bread, Bananas (1kg), Thums Up (750ml)",
      estimatedMinutes: 9,
      distanceKm: 2.4,
      payout: 92,
      demoDeliveryOtp: "5824",
      pickupPin: "7193",
      codAmount: 0
    };
    setIncomingOffer(mockOrder);
    setOfferCountdown(30);
  };

  if (resolvingRider) return <RiderHomeSkeleton />;

  const name = demoMode ? DEMO_RIDER.name : user?.name || "Delivery partner";
  const initials = name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase();
  const vehicle = demoMode ? `${DEMO_RIDER.vehicleNumber} · ${DEMO_RIDER.vehicleModel}`
    : [profile?.vehicle_no, profile?.vehicle_type].filter(Boolean).join(" · ");
  const rating = demoMode ? DEMO_RIDER.rating : profile?.rating;
  const zone = demoMode ? "Koramangala · Dark Store #104" : profile?.home_store?.name || "No assigned store";
  const chart = demoMode ? demoChart : earnings.data?.dailyEarnings ?? [];
  const chartMax = Math.max(1, ...chart);
  const tripsToBonus = Math.max(0, bonusTarget - demoTrips);

  return (
    <div className="rider-home">
      <div className="rider-shell">
        <header className="rider-top">
          <div className="flex min-w-0 items-center gap-3">
            <button type="button" className="rider-identity" onClick={() => setIsProfileModalOpen(true)} aria-label="Open rider profile">
              <span className="rider-avatar">
                <AccountAvatar src={demoMode ? DEMO_RIDER.avatar : sessionUser?.photo_url ?? firebaseUser?.photoURL ?? user?.photo_url} className="rider-avatar-photo"
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
                  ? demoMode ? "Receiving demo offers · 6h 24m today" : "Available for delivery offers"
                  : "Go online to start receiving orders"}</p>
              </div>
              <button type="button" role="switch" aria-label="On duty" aria-checked={isOnline}
                disabled={dutyPending || riderUnavailable} className="rider-duty-switch"
                onClick={() => void toggleDuty()} />
            </div>
            <div className="rider-duty-zone">
              <MapPin size={16} aria-hidden="true" className="rider-muted shrink-0" />
              <p className="min-w-0 flex-1 text-xs"><span className="rider-muted">Zone </span><strong>{zone}</strong></p>
              {demoMode && <span className="rider-chip rider-chip-gold shrink-0">Demo mode</span>}
              {riderUnavailable && <button type="button" disabled={rider.isFetching} className="rider-secondary" onClick={() => void rider.refetch()}>{rider.isFetching ? "Retrying…" : "Retry"}</button>}
            </div>
          </section>

          {loadingEarnings ? <RiderEarningsSkeleton /> : <section className="rider-card rider-earnings" aria-labelledby="rider-earnings-title">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <h2 id="rider-earnings-title">Today’s earnings</h2>
                <p className="rider-earnings-amount">{todayEarnings == null ? "—" : formatRupees(todayEarnings)}</p>
                {demoMode && <span className="rider-chip rider-chip-green mt-2">12% vs yesterday</span>}
              </div>
              {chart.length > 0 && <div className="rider-spark" role="img" aria-label={demoMode ? "Sample earnings chart" : "Earnings over the last seven days"}>
                {chart.map((amount, index) => <i key={index} style={{ "--r-level": Math.max(.04, amount / chartMax) } as CSSProperties} />)}
              </div>}
            </div>
            <div className="rider-metrics">
              <button type="button" onClick={() => setIsTripsModalOpen(true)}>
                <small>Trips</small><strong>{todayTrips ?? "—"}</strong><em>History ›</em>
              </button>
              <button type="button" onClick={() => setShowCod(true)}>
                <small>COD to deposit</small><strong>{todayCod == null ? "—" : formatRupees(todayCod)}</strong><em>Deposit info ›</em>
              </button>
              {demoMode ? (
                <button type="button" onClick={() => setShowDemoEarnings(true)}>
                  <small>Online</small><strong>6.4 h</strong><em>Passbook ›</em>
                </button>
              ) : (
                <Link href="/rider/earnings">
                  <small>Payouts</small><strong>View</strong><em>Passbook ›</em>
                </Link>
              )}
            </div>
            {earnings.isError && <button type="button" className="mt-2 min-h-11 text-xs underline" onClick={() => void earnings.refetch()}>Retry earnings</button>}
          </section>}

          {demoMode ? <section className="rider-card flex items-center gap-3" aria-label="Demo partner bonus">
            <div className="rider-bonus-ring" aria-hidden="true">
              <svg viewBox="0 0 80 80"><circle className="track" cx="40" cy="40" r="33" /><circle className="progress" cx="40" cy="40" r="33" pathLength="100" strokeDashoffset={Math.max(0, 100 * (1 - demoTrips / bonusTarget))} /></svg>
              <b>{Math.min(demoTrips, bonusTarget)}/{bonusTarget}</b>
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2"><h2 className="text-[15px] font-extrabold">Gold partner</h2><span className="rider-chip rider-chip-gold">Gold</span></div>
              <p className="rider-muted my-1 text-xs">{tripsToBonus
                ? <><strong>{tripsToBonus} more {tripsToBonus === 1 ? "trip" : "trips"}</strong> to unlock the {formatRupees(bonusValue)} demo bonus</>
                : <strong>Demo bonus unlocked</strong>}</p>
              <div className="flex flex-wrap gap-1.5"><span className="rider-chip rider-chip-green">+10% payout</span><span className="rider-chip">KYC verified</span></div>
            </div>
          </section> : profile && <section className="rider-card flex items-center gap-3" aria-label="Partner verification">
            <div className="grid size-11 shrink-0 place-items-center rounded-xl bg-[var(--r-chip)]"><User size={20} aria-hidden="true" /></div>
            <div className="min-w-0 flex-1"><h2 className="text-[15px] font-extrabold">Partner verification</h2>
              <p className="rider-muted text-xs">{profile.kyc_status === "approved" ? "KYC verified" : `KYC ${profile.kyc_status || "pending"}`}</p></div>
            <button type="button" className="rider-secondary" onClick={() => setIsProfileModalOpen(true)}>Profile</button>
          </section>}

        {/* ACTIVE DELIVERY ORDER (4-STEP WORKFLOW) */}
        {activeOrder && (
          <div className="rider-card space-y-4">
            {/* Header: Order ID & Payout */}
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div>
                <span className="text-[10px] font-black uppercase text-[#F66002] bg-orange-50 px-2 py-0.5 rounded border border-orange-200">
                  Active delivery
                </span>
                <h3 className="font-extrabold text-base text-[#13193B] mt-1">
                  {activeOrder.orderNumber}
                </h3>
              </div>
              <div className="text-right">
                <span className="text-[10px] font-bold text-gray-400 uppercase">Payout</span>
                <div className="text-xl font-black text-emerald-600">{activeOrder.payout == null ? "—" : formatRupees(activeOrder.payout)}</div>
              </div>
            </div>

            <ol className="rider-route-steps" aria-label="Delivery progress">
              {["Go to store", "Pick up", "En route", "Finish"].map((label, index) => (
                <li key={label} aria-current={activeStep === index + 1 ? "step" : undefined} data-done={activeStep > index + 1}>
                  <i aria-hidden="true" />{label}
                </li>
              ))}
            </ol>
            <div className="grid gap-2 text-xs">
              <div className="flex items-start gap-2 rounded-xl bg-[var(--r-canvas)] p-2.5">
                <Store className="mt-0.5 shrink-0 text-[var(--r-brand)]" size={16} aria-hidden="true" />
                <div><strong>Pickup</strong><p className="rider-muted">{activeOrder.storeName}</p></div>
              </div>
              <div className="flex items-start gap-2 rounded-xl bg-[var(--r-canvas)] p-2.5">
                <MapPin className="mt-0.5 shrink-0 text-[var(--r-green)]" size={16} aria-hidden="true" />
                <div><strong>Drop-off</strong><p className="rider-muted break-words">{activeOrder.customerAddress || "Address unavailable"}</p></div>
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
                  {activeOrder.storePhone && <a
                    href={`tel:${activeOrder.storePhone}`}
                    className="w-9 h-9 rounded-full bg-white border border-gray-200 flex items-center justify-center text-[#13193B] shadow-sm hover:bg-gray-100 shrink-0"
                    aria-label="Call the store"
                  >
                    <Phone className="w-4 h-4" />
                  </a>}
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
                    disabled={stepPending}
                    onClick={handleArriveAtStore}
                    className="rider-primary flex-1"
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
                  disabled={stepPending}
                  onClick={handleVerifyPickup}
                  className="rider-primary w-full"
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
                    {liveOrderId === activeOrder.id && backendData?.activeOrder?.instructions && (
                      <p className="text-xs text-gray-700">Delivery instructions: {backendData.activeOrder.instructions}</p>
                    )}
                    {sharingRoute && gpsError && <p role="status" className="text-xs text-gray-700">Location sharing paused. Check location access on this device.</p>}
                  </div>
                  {activeOrder.customerPhone && <a
                    href={`tel:${activeOrder.customerPhone}`}
                    className="w-9 h-9 rounded-full bg-white border border-gray-200 flex items-center justify-center text-emerald-600 shadow-sm hover:bg-gray-100 shrink-0"
                    aria-label="Call customer"
                  >
                    <Phone className="w-4 h-4" />
                  </a>}
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
                    disabled={stepPending}
                    onClick={handleArriveAtCustomer}
                    className="rider-primary flex-1"
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
                  <CodeInput label="Customer delivery code" value={enteredOtp} onChange={(code) => {
                    setEnteredOtp(code);
                    if (otpError) setOtpError("");
                  }} />
                  {otpError && (
                    <p className="text-red-600 text-xs font-semibold text-center mt-1.5">{otpError}</p>
                  )}
                </div>

                {/* Quick Auto-fill Helper for Demo Testing */}
                {activeOrder.demoDeliveryOtp && <div className="flex items-center justify-between text-[11px] text-gray-500 px-1">
                  <span>Demo Customer OTP:</span>
                  <button
                    type="button"
                    onClick={() => setEnteredOtp(activeOrder.demoDeliveryOtp ?? "")}
                    className="font-extrabold text-[#F66002] hover:underline"
                  >
                    Fill {activeOrder.demoDeliveryOtp} ⚡
                  </button>
                </div>}

                <button
                  disabled={stepPending}
                  onClick={handleCompleteDelivery}
                  className="w-full py-3.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-black text-sm shadow-md flex items-center justify-center gap-2 hover:brightness-105 active:scale-98"
                >
                  <CheckCircle2 className="w-5 h-5" />
                  <span>{stepPending ? "Verifying…" : activeOrder.demoDeliveryOtp ? `Complete Delivery & Receive ₹${activeOrder.payout}` : "Verify code & complete delivery"}</span>
                </button>
              </div>
            )}
          </div>
        )}

          {!riderUnavailable && !activeOrder && (
            <section className="rider-card px-4 py-5 text-center" aria-labelledby="rider-live-title">
              <div className="rider-radar" data-online={isOnline} aria-hidden="true"><i /><i /><i /><span><Bike size={25} /></span></div>
              <h2 id="rider-live-title" className="text-lg font-extrabold">{incomingOffer ? "Order offer received" : isOnline ? "Looking for orders nearby" : "You’re offline"}</h2>
              <p className="rider-muted mx-auto mt-1 max-w-72 text-sm">{incomingOffer
                ? "Review the pickup and drop-off details."
                : isOnline ? "Keep the app open to see incoming offers." : "Switch on duty to start seeing delivery offers."}</p>
              {isOnline && demoMode && !incomingOffer && (
                <button type="button" className="rider-secondary mt-3 border-dashed" onClick={triggerSimulation}>Simulate Delivery Request</button>
              )}
            </section>
          )}

          <section className="rider-card" aria-labelledby="rider-drops-title">
            <div className="flex items-center justify-between gap-2">
              <h2 id="rider-drops-title" className="text-base font-extrabold">Today’s drops{todayTrips == null ? "" : ` (${todayTrips})`}</h2>
              <button type="button" className="min-h-11 shrink-0 px-1 text-xs font-bold text-[var(--r-brand)]" onClick={() => setIsTripsModalOpen(true)}>View All</button>
            </div>
            <TripList trips={completedTrips.slice(0, 3)} loading={loadingEarnings} error={earnings.isError && !earnings.data} />
          </section>
        </main>

        <nav className="rider-tabs" aria-label="Rider navigation">
          <Link href="/rider" aria-current="page" onClick={() => window.scrollTo({ top: 0 })}><House size={21} aria-hidden="true" />Home</Link>
          <button type="button" onClick={() => setIsTripsModalOpen(true)}><ClipboardList size={21} aria-hidden="true" />Trips</button>
          {demoMode ? (
            <button type="button" onClick={() => setShowDemoEarnings(true)}><TrendingUp size={21} aria-hidden="true" />Earnings</button>
          ) : (
            <Link href="/rider/earnings"><TrendingUp size={21} aria-hidden="true" />Earnings</Link>
          )}
          <button type="button" onClick={() => setIsProfileModalOpen(true)}><User size={21} aria-hidden="true" />Profile</button>
        </nav>
      </div>

      {toast && <div role="status" className="fixed top-[calc(12px+env(safe-area-inset-top,0px))] left-1/2 z-[90] flex w-max max-w-[calc(100%-24px)] -translate-x-1/2 items-center gap-2 rounded-2xl bg-[#0f1a3c] px-4 py-2.5 text-sm font-semibold text-white shadow-lg">
        {toast.type === "error" ? <AlertCircle size={17} className="shrink-0" aria-hidden="true" /> : <CheckCircle2 size={17} className="shrink-0" aria-hidden="true" />}
        {toast.message}
      </div>}

      {incomingOffer && (
        <SwipeableSheet onClose={() => { if (!offerPending) void respondToOffer("reject"); }} labelledBy="rider-offer-title">
          <div className="rider-sheet p-4 text-[#101828]">
            <div className="flex items-center gap-3">
              <div className="rider-offer-clock" aria-label={`${offerCountdown} seconds remaining`}>
                <svg viewBox="0 0 64 64" aria-hidden="true"><circle cx="32" cy="32" r="28" stroke="#eef1f8" />
                  <circle cx="32" cy="32" r="28" stroke="#fd5e00" strokeLinecap="round" pathLength="100" strokeDasharray="100" strokeDashoffset={100 * (1 - offerCountdown / 30)} />
                </svg>{offerCountdown}
              </div>
              <div><h2 id="rider-offer-title" className="text-xl font-extrabold">New order nearby</h2><p className="text-xs text-[#526078]">Accept before the timer ends</p></div>
            </div>
            <div className="my-4 rounded-2xl bg-[#0f1a3c] p-4 text-center text-white">
              <p className="text-xs text-[#dce3f4]">Estimated payout</p>
              <p className="text-3xl font-extrabold">{incomingOffer.payout == null ? "—" : formatRupees(incomingOffer.payout)}</p>
            </div>
            <div className="space-y-3 text-sm">
              <p className="flex gap-2"><Store size={17} className="shrink-0 text-[#b83d06]" aria-hidden="true" /> <span><strong>{incomingOffer.storeName}</strong><span className="block text-xs text-[#526078]">Pickup</span></span></p>
              <p className="flex gap-2"><MapPin size={17} className="shrink-0 text-[#067647]" aria-hidden="true" />
                <span><strong>{incomingOffer.customerAddress || "Drop-off area unavailable"}</strong>
                  <span className="block text-xs text-[#526078]">{incomingOffer.codAmount ? "Cash on delivery" : "Prepaid"}{incomingOffer.distanceKm ? ` · ${incomingOffer.distanceKm} km` : ""}</span>
                </span>
              </p>
            </div>
            <div className="mt-4 grid grid-cols-[minmax(0,1fr)_minmax(0,2fr)] gap-2">
              <button type="button" disabled={offerPending} onClick={() => void respondToOffer("reject")} className="rider-secondary">Decline</button>
              <button type="button" disabled={offerPending || !offerCountdown} onClick={() => void respondToOffer("accept")} className="rider-primary">
                Accept Delivery <ArrowRight size={16} aria-hidden="true" />
              </button>
            </div>
          </div>
        </SwipeableSheet>
      )}

      {isTripsModalOpen && (
        <SwipeableSheet onClose={() => setIsTripsModalOpen(false)} labelledBy="rider-sheet-trips">
          <div className="rider-sheet space-y-2 p-4">
            <h2 id="rider-sheet-trips" className="text-lg font-extrabold">Trip History</h2>
            <TripList trips={completedTrips} loading={loadingEarnings} error={earnings.isError && !earnings.data} />
          </div>
        </SwipeableSheet>
      )}

      {demoMode && showDemoEarnings && (
        <SwipeableSheet onClose={() => setShowDemoEarnings(false)} labelledBy="rider-sheet-earnings">
          <div className="rider-sheet space-y-3 p-4">
            <h2 id="rider-sheet-earnings" className="text-lg font-extrabold">Demo earnings</h2>
            <p className="text-2xl font-extrabold">{formatRupees(demoEarnings)}</p>
            <p className="text-sm text-[#526078]">{demoTrips} trips today</p>
            <TripList trips={demoDrops} loading={false} />
          </div>
        </SwipeableSheet>
      )}

      {isProfileModalOpen && (
        <SwipeableSheet onClose={() => setIsProfileModalOpen(false)} labelledBy="rider-sheet-profile">
          <div className="rider-sheet space-y-4 p-4">
            <h2 id="rider-sheet-profile" className="text-lg font-extrabold">Rider profile</h2>
            <dl className="grid gap-2 text-sm">
              <div className="flex justify-between gap-2"><dt>Name</dt><dd className="text-right font-bold">{name}</dd></div>
              <div className="flex justify-between gap-2"><dt>Vehicle</dt><dd className="text-right font-bold">{vehicle || "—"}</dd></div>
              <div className="flex justify-between gap-2"><dt>Assigned store</dt><dd className="text-right font-bold">{zone}</dd></div>
              <div className="flex justify-between gap-2"><dt>Verification</dt><dd className="text-right font-bold">{demoMode ? "Demo profile" : profile?.kyc_status || "Pending"}</dd></div>
            </dl>
            {demoMode && <Link href="/login" className="rider-primary w-full">Sign in</Link>}
            <Link href="/" className="rider-secondary w-full">Back to storefront</Link>
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

function TripList({ trips, loading, error }: { trips: RiderTrip[]; loading?: boolean; error?: boolean }) {
  if (loading) return <div role="status" aria-label="Loading rider trips"><RiderDropsSkeleton /></div>;
  if (!trips.length) return <p className="py-3 text-xs text-[#526078]">{error ? "Trips couldn’t load." : "No completed trips today."}</p>;
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
