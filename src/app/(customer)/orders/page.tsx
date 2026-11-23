"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, ArrowRight, Package } from "lucide-react";
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
  active: "bg-[var(--peach-light)] text-[color:var(--theme-orange-text)]",
  waiting: "bg-[var(--theme-warning-bg)] text-[color:var(--theme-warning)]",
  complete: "bg-[var(--theme-success-bg)] text-[color:var(--theme-success)]",
  closed: "bg-[var(--theme-danger-bg)] text-[color:var(--theme-danger)]",
};

const orderDate = new Intl.DateTimeFormat("en-IN", {
  day: "numeric", month: "short", hour: "numeric", minute: "2-digit", timeZone: "Asia/Kolkata",
});

const primaryAction = "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[var(--theme-orange-fill)] px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-[var(--theme-orange-hover)]";
const focusRing = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--theme-orange-text)]";

function OrderCard({ order }: { order: OrderSummary }) {
  const { label, tone } = statuses[order.status];
  const trackable = tone === "active";
  const date = new Date(order.placed_at);
  const count = order.items.reduce((sum, item) => sum + item.quantity, 0);
  const names = [...new Set(order.items.flatMap((item) => item.name_snapshot ? [item.name_snapshot] : []))];
  const namesPreview = names.slice(0, 3).join(", ");
  const more = names.length - 3;
  const titleId = `order-heading-${order.id}`;

  return (
    <article aria-labelledby={titleId} className="rounded-[18px] border border-[color:var(--theme-line)] bg-[var(--white)]">
      <div className="p-4 sm:px-5">
        <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
          <h2 id={titleId} className="min-w-0 break-words text-base font-extrabold leading-tight tabular-nums">Order #{order.order_no}</h2>
          <span className={`inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-bold ${statusColors[tone]}`}>
            {trackable && <span className="size-1.5 rounded-full bg-current" aria-hidden="true" />}
            {label}
          </span>
        </div>
        <p className="mt-1.5 break-words text-sm leading-snug text-[color:var(--theme-muted)]">{order.store?.name ?? "Tikk Tikk Mart"}</p>
        {Number.isFinite(date.getTime()) && (
          <time dateTime={order.placed_at} className="mt-0.5 block text-xs leading-snug text-[color:var(--theme-muted)]">{orderDate.format(date)}</time>
        )}

        <div className="mt-4 grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3 border-t border-[color:var(--theme-line)] pt-3.5">
          <div className="min-w-0">
            <p className="text-sm font-bold">{count} {count === 1 ? "item" : "items"}</p>
            {!!names.length && (
              <p className="mt-0.5 line-clamp-2 break-words text-xs leading-relaxed text-[color:var(--theme-muted)]">
                {namesPreview}{more > 0 ? ` +${more} more` : ""}
              </p>
            )}
          </div>
          <div className="text-right">
            <p className="text-lg font-extrabold leading-tight tabular-nums">{formatRupees(Number(order.grand_total))}</p>
            <p className="mt-0.5 text-xs leading-snug text-[color:var(--theme-muted)]">
              {order.payment_method === "cod" ? "Cash on delivery" : "Online payment"}
            </p>
          </div>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-[color:var(--theme-line)] px-4 py-3 sm:px-5">
        <Link href={`/orders/${order.id}`} aria-describedby={titleId}
          className={`${focusRing} ${trackable ? primaryAction : "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[color:var(--theme-line)] px-4 py-2 text-sm font-bold hover:bg-[var(--peach-light)]"} flex-1`}>
          {trackable ? "Track delivery" : "View order details"} <ArrowRight size={16} aria-hidden="true" className="shrink-0" />
        </Link>
        <Link href="/" className={`${focusRing} inline-flex min-h-11 shrink-0 items-center rounded-lg px-2 text-sm font-bold text-[color:var(--theme-orange-text)] hover:underline`}>
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

  return (
    <div className="mx-auto max-w-2xl space-y-5 text-[color:var(--theme-ink)]">
      <header className="flex items-center gap-3">
        <Link href="/" aria-label="Back to Home"
          className={`${focusRing} grid size-11 shrink-0 place-items-center rounded-xl border border-[color:var(--theme-line)] bg-[var(--white)] hover:bg-[var(--peach-light)]`}>
          <ArrowLeft size={19} aria-hidden="true" />
        </Link>
        <div className="min-w-0">
          <h1 className="text-xl font-extrabold leading-tight tracking-tight sm:text-2xl">My Orders</h1>
          <p className="mt-0.5 text-sm leading-snug text-[color:var(--theme-muted)]">Track deliveries and view past orders</p>
        </div>
      </header>

      {loading || orders.isLoading ? (
        <LayoutSkeleton shape="list" label="Loading order history" />
      ) : !user || !orders.data?.length ? (
        <section className="space-y-3 rounded-[18px] border border-[color:var(--theme-line)] bg-[var(--white)] px-5 py-9 text-center">
          <span className="mx-auto grid size-12 place-items-center rounded-xl bg-[var(--peach-light)] text-[color:var(--theme-orange-text)]">
            <Package size={23} aria-hidden="true" />
          </span>
          <h2 className="text-base font-extrabold">
            {!user ? "Sign in to view your orders" : orders.isError ? "Orders couldn’t load" : "No orders yet"}
          </h2>
          <p className="text-sm text-[color:var(--theme-muted)]">
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
        <ul aria-label="Order history" className="space-y-3">
          {orders.data.map((order) => <li key={order.id}><OrderCard order={order} /></li>)}
        </ul>
      )}
    </div>
  );
}
