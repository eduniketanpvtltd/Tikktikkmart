"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, ArrowRight, Bike, Box, CheckCircle2, Home, Package } from "lucide-react";
import { formatRupees } from "@/components/customer/AnimatedRupees";
import { LayoutSkeleton } from "@/components/ui/LayoutSkeleton";
import { apiFetch } from "@/lib/api/client";
import { useAuth } from "@/components/providers/AppProviders";
import type { OrderStatus, PaymentMethod } from "@/types/db";

type OrderSummary = {
  id: string;
  order_no: number;
  status: OrderStatus;
  placed_at: string;
  grand_total: number;
  payment_method: PaymentMethod;
  store: { name: string } | null;
  items: { name_snapshot: string | null; quantity: number }[];
};

const statuses: Record<OrderStatus, { label: string; tone: "active" | "waiting" | "complete" | "closed" }> = {
  placed: { label: "Placed", tone: "active" },
  payment_pending: { label: "Payment pending", tone: "waiting" },
  confirmed: { label: "Confirmed", tone: "active" },
  accepted_by_store: { label: "Preparing", tone: "active" },
  picking: { label: "Packing", tone: "active" },
  packed: { label: "Packed", tone: "active" },
  rider_assigned: { label: "Rider assigned", tone: "active" },
  rider_at_store: { label: "At pickup", tone: "active" },
  picked_up: { label: "Picked up", tone: "active" },
  out_for_delivery: { label: "Out for delivery", tone: "active" },
  arrived: { label: "Rider arrived", tone: "active" },
  delivered: { label: "Delivered", tone: "complete" },
  cancelled: { label: "Cancelled", tone: "closed" },
  rejected_by_store: { label: "Declined by store", tone: "closed" },
  payment_failed: { label: "Payment failed", tone: "closed" },
  delivery_failed: { label: "Delivery failed", tone: "closed" },
  refunded: { label: "Refunded", tone: "complete" },
};

const statusColors = {
  active: "bg-[#FBE3CF] text-[#A8421A]",
  waiting: "bg-[#FFF3CD] text-[#854D0E]",
  complete: "bg-[#E3F0DA] text-[#2E7D4F]",
  closed: "bg-[#FEECEB] text-[#B42318]",
};

const ORDER_STEPS = [
  { label: "Confirmed", icon: CheckCircle2 },
  { label: "Packing", icon: Box },
  { label: "On the way", icon: Bike },
  { label: "Delivered", icon: Home },
] as const;

function getOrderStepIndex(status: OrderStatus): number {
  switch (status) {
    case "placed":
    case "payment_pending":
    case "confirmed":
    case "accepted_by_store":
      return 0;
    case "picking":
    case "packed":
    case "rider_assigned":
    case "rider_at_store":
      return 1;
    case "picked_up":
    case "out_for_delivery":
    case "arrived":
      return 2;
    case "delivered":
    case "refunded":
      return 3;
    default:
      return 0;
  }
}

const orderDate = new Intl.DateTimeFormat("en-IN", {
  day: "numeric", month: "short", hour: "numeric", minute: "2-digit", timeZone: "Asia/Kolkata",
});

const primaryAction = "inline-flex min-h-10 items-center justify-center gap-2 rounded-full bg-[#A8421A] px-5 py-2 text-xs font-bold text-white transition-colors hover:bg-[#8E3513]";
const focusRing = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#A8421A]";

function OrderCard({ order }: { order: OrderSummary }) {
  const { label, tone } = statuses[order.status];
  const trackable = tone === "active";
  const stepIndex = getOrderStepIndex(order.status);
  const date = new Date(order.placed_at);
  const count = order.items.reduce((sum, item) => sum + item.quantity, 0);
  const names = [...new Set(order.items.flatMap((item) => item.name_snapshot ? [item.name_snapshot] : []))];
  const namesPreview = names.slice(0, 3).join(", ");
  const more = names.length - 3;
  const titleId = `order-heading-${order.id}`;

  return (
    <article aria-labelledby={titleId} className="rounded-2xl border border-[#F0E4D2] bg-white p-4">
      <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
        <h2 id={titleId} className="min-w-0 break-words text-[15px] font-extrabold leading-tight tabular-nums text-[#3A2418]">Order #{order.order_no}</h2>
        <span className={`inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-0.5 text-[11px] font-bold ${statusColors[tone]}`}>
          {trackable && <span className="size-1.5 rounded-full bg-current" aria-hidden="true" />}
          {label}
        </span>
      </div>
      <div className="mt-1 flex flex-wrap items-center gap-x-2 text-[11px] text-[#8A7060]">
        <span>{order.store?.name ?? "Tikk Tikk Mart"}</span>
        {Number.isFinite(date.getTime()) && (
          <>
            <span aria-hidden="true">·</span>
            <time dateTime={order.placed_at}>{orderDate.format(date)}</time>
          </>
        )}
      </div>

      {trackable && (
        <div className="relative my-4">
          <div className="absolute top-3.5 left-[12.5%] right-[12.5%] h-[3px] rounded-full bg-[#F0E4D2]" />
          <div
            className="absolute top-3.5 left-[12.5%] h-[3px] rounded-full bg-[#A8421A] transition-all duration-500"
            style={{ width: `${(stepIndex / 3) * 75}%` }}
          />
          <div className="relative flex">
            {ORDER_STEPS.map((step, i) => {
              const Icon = step.icon;
              const done = i <= stepIndex;
              return (
                <div key={step.label} className={`flex-1 text-center text-[11px] font-medium ${done ? "text-[#3A2418]" : "text-[#A89484]"}`}>
                  <div className={`mx-auto mb-1 flex size-7 items-center justify-center rounded-full ${done ? "bg-[#A8421A] text-white" : "bg-[#F0E4D2] text-[#A89484]"}`}>
                    <Icon size={14} aria-hidden="true" />
                  </div>
                  {step.label}
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="mt-3 grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3 border-t border-[#F0E4D2] pt-3">
        <div className="min-w-0">
          <p className="text-xs font-bold text-[#3A2418]">{count} {count === 1 ? "item" : "items"}</p>
          {!!names.length && (
            <p className="mt-0.5 line-clamp-2 break-words text-xs leading-relaxed text-[#8A7060]">
              {namesPreview}{more > 0 ? ` +${more} more` : ""}
            </p>
          )}
        </div>
        <div className="text-right">
          <p className="text-base font-extrabold leading-tight tabular-nums text-[#3A2418]">{formatRupees(Number(order.grand_total))}</p>
          <p className="mt-0.5 text-[11px] leading-snug text-[#8A7060]">
            {order.payment_method === "cod" ? "Cash on delivery" : "Online payment"}
          </p>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-[#F0E4D2] pt-3">
        <Link href={`/orders/${order.id}`} aria-describedby={titleId}
          className={`${focusRing} ${trackable ? primaryAction : "inline-flex min-h-10 items-center justify-center gap-1.5 rounded-full border border-[#EADBC6] bg-[#FBF6EE] px-4 py-2 text-xs font-bold text-[#3A2418] hover:bg-[#FBE3CF]"} flex-1`}>
          {trackable ? "Track delivery" : "View order details"} <ArrowRight size={14} aria-hidden="true" className="shrink-0" />
        </Link>
        <Link href="/" className={`${focusRing} inline-flex min-h-10 shrink-0 items-center rounded-full border border-[#A8421A] px-4 py-2 text-xs font-bold text-[#A8421A] hover:bg-[#FBE3CF]/50`}>
          Shop again
        </Link>
      </div>
    </article>
  );
}

export default function OrdersListPage() {
  const { user, loading } = useAuth();
  const orders = useQuery({
    queryKey: ["my-orders", user?.id],
    enabled: Boolean(user),
    queryFn: async ({ signal }) => {
      const res = await apiFetch<OrderSummary[]>("/api/orders", { signal });
      return res.data ?? [];
    },
  });

  const activeOrders = (orders.data ?? []).filter((o) => statuses[o.status].tone === "active" || statuses[o.status].tone === "waiting");
  const pastOrders = (orders.data ?? []).filter((o) => statuses[o.status].tone !== "active" && statuses[o.status].tone !== "waiting");

  return (
    <div className="mx-auto max-w-2xl space-y-4 pb-6 text-[#3A2418]">
      <header className="flex items-center gap-3">
        <Link href="/" aria-label="Back to Home"
          className={`${focusRing} grid size-10 shrink-0 place-items-center rounded-full bg-[#FBE3CF] text-[#A8421A] hover:bg-[#F5D3B6]`}>
          <ArrowLeft size={18} aria-hidden="true" />
        </Link>
        <div className="min-w-0">
          <h1 className="text-xl font-extrabold leading-tight tracking-tight sm:text-2xl">Orders</h1>
          <p className="mt-0.5 text-xs leading-snug text-[#8A7060]">Track deliveries and view past orders</p>
        </div>
      </header>

      {loading || orders.isLoading ? (
        <LayoutSkeleton shape="list" label="Loading order history" />
      ) : !user || !orders.data?.length ? (
        <section className="space-y-3 rounded-2xl border border-[#F0E4D2] bg-white px-5 py-9 text-center">
          <span className="mx-auto grid size-12 place-items-center rounded-full bg-[#FBE3CF] text-[#A8421A]">
            <Package size={22} aria-hidden="true" />
          </span>
          <h2 className="text-base font-extrabold text-[#3A2418]">
            {!user ? "Sign in to view your orders" : orders.isError ? "Orders couldn’t load" : "No orders yet"}
          </h2>
          <p className="text-xs text-[#8A7060]">
            {!user ? "Track deliveries from the account you ordered with."
              : orders.isError ? "Try loading your order history again." : "Your orders will appear here after checkout."}
          </p>
          {user && orders.isError ? (
            <button type="button" onClick={() => void orders.refetch()} className={`${primaryAction} ${focusRing}`}>Try again</button>
          ) : (
            <Link href={user ? "/" : "/login"} className={`${primaryAction} ${focusRing}`}>{user ? "Start shopping" : "Sign in"}</Link>
          )}
        </section>
      ) : (
        <div className="space-y-5">
          {activeOrders.length > 0 && (
            <section aria-label="Active orders" className="space-y-2.5">
              <h2 className="text-xs font-extrabold uppercase tracking-wider text-[#8A7060]">Active</h2>
              <ul className="space-y-3">
                {activeOrders.map((order) => <li key={order.id}><OrderCard order={order} /></li>)}
              </ul>
            </section>
          )}
          {pastOrders.length > 0 && (
            <section aria-label="Past orders" className="space-y-2.5">
              <h2 className="text-xs font-extrabold uppercase tracking-wider text-[#8A7060]">Past orders</h2>
              <ul className="space-y-3">
                {pastOrders.map((order) => <li key={order.id}><OrderCard order={order} /></li>)}
              </ul>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
