"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertCircle, Check, ChevronLeft, Clock, Copy, CreditCard, MapPin, MessageCircle, Phone, Share2, Star } from "lucide-react";
import { AccountAvatar } from "@/components/customer/AccountAvatar";
import { AnimatedRupees, formatRupees } from "@/components/customer/AnimatedRupees";
import { CatalogImage } from "@/components/customer/CatalogImage";
import { showCustomerToast } from "@/components/customer/CustomerFeedback";
import { getCardImage } from "@/components/customer/ProductCard";
import { TrackingMap } from "@/components/maps/TrackingMap";
import { LayoutSkeleton } from "@/components/ui/LayoutSkeleton";
import { SwipeableSheet } from "@/components/ui/SwipeableSheet";
import { enqueueUndo, useUndoKeys } from "@/components/ui/UndoToast";
import { useAuth } from "@/components/providers/AppProviders";
import { apiFetch } from "@/lib/api/client";
import { fetchBrowseCatalog } from "@/lib/catalog/browse";
import { addOnOrderStatuses, addOnWindowMs, cancellableOrderStatuses, deliveryInstructionOptions, isRouteActive, type TrackedOrder } from "@/lib/orders/tracking";
import { useCartStore } from "@/stores/cartStore";
import type { OrderStatus, Product } from "@/types/db";
import "./tracking.css";

const steps = [
  { states: ["placed", "confirmed"], title: "Order confirmed", subtitle: "We received your order" },
  { states: ["accepted_by_store", "picking", "packed", "rider_assigned", "rider_at_store"], title: "Packing your items", subtitle: "The store gets your order ready for pickup" },
  { states: ["picked_up", "out_for_delivery"], title: "Out for delivery", subtitle: "Your delivery partner is on the way" },
  { states: ["arrived"], title: "Arriving now", subtitle: "Get ready to receive your order" },
  { states: ["delivered"], title: "Delivered", subtitle: "Enjoy your items" },
];
const unsuccessful: Partial<Record<OrderStatus, string>> = {
  cancelled: "Order cancelled", rejected_by_store: "The store couldn’t fulfill your order",
  payment_failed: "Payment unsuccessful", delivery_failed: "Delivery unsuccessful", refunded: "Order refunded",
};
const descriptions = [
  "We’re getting your items ready", "The store is preparing your items", "Your delivery partner has picked up your order",
  "Your delivery partner is at the drop-off point", "Your groceries have arrived",
];
const titles = ["Order placed successfully", "Preparing your order", "Out for delivery", "Your rider has arrived", "Order delivered"];
const clockTime = new Intl.DateTimeFormat("en-IN", { hour: "numeric", minute: "2-digit", timeZone: "Asia/Kolkata" });

function paymentLabel(order: TrackedOrder) {
  if (order.status === "refunded" || order.payment_status === "refunded") return "Refunded";
  if (order.payment_status === "captured") return "Paid";
  if (order.payment_status === "partially_refunded") return "Partially refunded";
  if (order.payment_status === "failed" || order.status === "payment_failed") return "Failed";
  if (order.status in unsuccessful) return "Closed";
  if (order.payment_method === "cod") return order.status === "delivered" ? "Collected on delivery" : "Pay on delivery";
  return "Payment pending";
}

export default function OrderTrackingPage() {
  const { id } = useParams<{ id: string }>();
  const { user, loading: checkingSession } = useAuth();
  const router = useRouter();
  const cache = useQueryClient();
  const [help, setHelp] = useState(false);
  const [sharedLink, setSharedLink] = useState<string>();
  const [copiedOtp, setCopiedOtp] = useState(false);
  const [raisedHeader, setRaisedHeader] = useState(false);
  const [addedVariants, setAddedVariants] = useState<string[]>([]);
  const [pending, setPending] = useState<string>();
  const [now, setNow] = useState<number>();
  const action = useRef(false);
  const cancelKey = `cancel-order:${id}`;
  const cancelPending = useUndoKeys().has(cancelKey);
  const queryKey = ["order-detail", id, user?.id];
  const detail = useQuery({
    queryKey,
    enabled: Boolean(user),
    queryFn: async ({ signal }) => {
      const result = await apiFetch<TrackedOrder>(`/api/orders/${id}`, { signal });
      if (!result.data) throw new Error("Could not load order tracking");
      return result.data;
    },
    retry: (count, error) => !/^HTTP (401|403|404):/.test(error.message) && count < 2,
    refetchInterval: ({ state }) => state.data?.status === "delivered" || (state.data && state.data.status in unsuccessful) ? false : 5000,
  });
  const order = detail.data;
  const closed = Boolean(order && (order.status === "delivered" || order.status in unsuccessful));
  const addDeadline = order ? Date.parse(order.placed_at) + addOnWindowMs : 0;
  const addSeconds = now && Number.isFinite(addDeadline) ? Math.max(0, Math.ceil((addDeadline - now) / 1000)) : 0;
  const addOnOffer = Boolean(order && order.payment_method === "cod" && addOnOrderStatuses.includes(order.status) && addSeconds > 0);
  const addOnEnabled = addOnOffer && order?.customer_rating !== undefined;
  const suggestions = useQuery({
    queryKey: ["home", order?.store?.id],
    enabled: Boolean(addOnEnabled && order?.store),
    queryFn: ({ signal }) => fetchBrowseCatalog(order?.store?.id ?? null, signal),
  });

  useEffect(() => {
    if (!order?.id || closed) return;
    const tick = () => setNow(Date.now());
    tick();
    const timer = window.setInterval(tick, 1000);
    return () => window.clearInterval(timer);
  }, [order?.id, closed]);

  useEffect(() => {
    const update = () => setRaisedHeader(window.scrollY > 8);
    update();
    window.addEventListener("scroll", update, { passive: true });
    return () => window.removeEventListener("scroll", update);
  }, []);

  useEffect(() => {
    if (!copiedOtp) return;
    const reset = window.setTimeout(() => setCopiedOtp(false), 1800);
    return () => window.clearTimeout(reset);
  }, [copiedOtp]);

  useEffect(() => {
    if (order?.status !== "delivered" || !order.delivered_at || Date.now() - Date.parse(order.delivered_at) > 60_000) return;
    const key = `ttm-delivered:${order.id}`;
    try {
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, "1");
      showCustomerToast("Order delivered", true);
    } catch {}
  }, [order?.id, order?.status, order?.delivered_at]);

  const renderEntry = (title: string, description: string, link: string, label: string) => (
    <div className="order-tracking order-tracking-entry">
      <h1>{title}</h1><p>{description}</p>
      <Link href={link} className="order-action order-action-primary">{label}</Link>
    </div>
  );

  if (checkingSession || detail.isLoading) return <div className="order-tracking"><LayoutSkeleton shape="order" label="Loading order tracking" /></div>;
  if (!user) return renderEntry("Sign in to track your order", "Use the account that placed this order.", `/login?next=${encodeURIComponent(`/orders/${id}`)}`, "Sign in");
  if (!order) {
    if (/^HTTP (401|403|404):/.test(detail.error?.message ?? "")) {
      return renderEntry("Order unavailable", "Check My orders for orders linked to your account.", "/orders", "My orders");
    }
    return <div className="order-tracking order-tracking-entry"><h1>Tracking couldn’t load</h1>
      <p>Try again to load your order.</p>
      <button type="button" className="order-action order-action-primary" onClick={() => void detail.refetch()}>Try again</button>
      <Link href="/orders">My orders</Link>
    </div>;
  }

  const failure = unsuccessful[order.status];
  const awaitingPayment = order.status === "payment_pending";
  const stage = Math.max(0, steps.findIndex(({ states }) => states.includes(order.status)));
  const heading = failure ?? (awaitingPayment ? "Waiting for payment confirmation" : titles[stage]);
  const statusDescription = failure ? "View your order summary or contact the store for help."
    : awaitingPayment ? "We’ll start preparing your order once payment is confirmed." : descriptions[stage];
  const activeRoute = isRouteActive(order.status);
  const estimateMs = order.tracking?.estimatedAt ? Date.parse(order.tracking.estimatedAt) : 0;
  const minutes = now && estimateMs ? Math.ceil((estimateMs - now) / 60_000) : 0;
  const totalItems = order.items.filter(({ status }) => status !== "out_of_stock").reduce((sum, item) => sum + item.quantity, 0);
  const payment = paymentLabel(order);
  const canCancel = cancellableOrderStatuses.includes(order.status) && !["authorized", "captured"].includes(order.payment_status ?? "");
  const address = order.address_snapshot;
  const contact = order.rider?.phone || order.store?.phone;
  const instructions = (order.instructions ?? "").split(/,\s*/).filter(Boolean);
  const otherInstructions = instructions.filter((text) => !deliveryInstructionOptions.some((option) => option === text));
  const delivered = order.status === "delivered";

  function cancel() {
    enqueueUndo("Order cancellation scheduled", () => {}, async () => {
      try {
        const result = await apiFetch(`/api/orders/${id}/cancel`, { method: "POST" });
        if (!result.ok) throw new Error(result.error || "Couldn’t cancel the order");
        showCustomerToast("Order cancelled");
      } finally {
        await cache.invalidateQueries({ queryKey });
      }
    }, undefined, cancelKey);
  }

  async function copy(text: string, success: string, reportFailure = true) {
    try {
      await navigator.clipboard.writeText(text);
      showCustomerToast(success);
      return true;
    } catch {
      if (reportFailure) showCustomerToast("Couldn’t copy. Try again.");
      return false;
    }
  }

  async function share() {
    const url = new URL(`/orders/${id}`, window.location.origin).href;
    if (navigator.share) {
      try {
        await navigator.share({ title: "Tikk Tikk Mart order tracking", url });
        return;
      } catch (error) {
        if (error instanceof Error && error.name === "AbortError") return;
      }
    }
    if (!(await copy(url, "Tracking link copied", false))) setSharedLink(url);
  }

  async function update(key: string, body: object, message: string) {
    if (action.current) return false;
    action.current = true;
    setPending(key);
    try {
      const result = await apiFetch<Partial<TrackedOrder> | null>(`/api/orders/${id}`, { method: "PATCH", body: JSON.stringify(body) });
      if (!result.ok) {
        showCustomerToast(result.error || "Couldn’t update the order");
        return false;
      }
      if (result.data) cache.setQueryData<TrackedOrder>(queryKey, (previous) => previous && ({ ...previous, ...result.data }));
      showCustomerToast(message);
      return true;
    } finally {
      await cache.invalidateQueries({ queryKey });
      action.current = false;
      setPending(undefined);
    }
  }

  async function reorder(previous: TrackedOrder) {
    const cart = useCartStore.getState();
    if (!cart.storeId || !cart.serviceable) {
      showCustomerToast("Choose a delivery location to reorder");
      router.push("/");
      return;
    }
    if (action.current) return;
    action.current = true;
    setPending("reorder");
    try {
      const params = new URLSearchParams({ reorder: "1", storeId: cart.storeId });
      const result = await apiFetch<Product[]>(`/api/orders/${id}?${params}`);
      if (useCartStore.getState().storeId !== cart.storeId) throw new Error("Delivery location changed");
      const available = new Map((result.data ?? []).flatMap((product) => (product.variants ?? []).map((variant) => [variant.id, { product, variant }] as const)));
      let added = 0;
      let requested = 0;
      for (const item of previous.items) {
        if (!item.variant_id || item.status === "out_of_stock") continue;
        requested += item.quantity;
        const match = available.get(item.variant_id);
        if (!match) continue;
        const { product, variant } = match;
        const maxQty = Math.min(variant.stock_available ?? 0, variant.max_qty_per_order ?? 10);
        const existing = useCartStore.getState().items.find(({ variantId }) => variantId === variant.id)?.quantity ?? 0;
        const quantity = Math.min(item.quantity, maxQty - existing);
        if (quantity <= 0) continue;
        if (!existing) cart.addItem({
          variantId: variant.id, productId: product.id, name: product.name, label: variant.label,
          image: getCardImage(product), price: variant.effective_price ?? variant.base_price, mrp: variant.mrp, maxQty, stockLimit: variant.stock_available,
        });
        cart.setQty(variant.id, existing + quantity, { maxQty, stockLimit: variant.stock_available });
        added += quantity;
      }
      if (!added) {
        showCustomerToast("No additional items are available to reorder");
        return;
      }
      showCustomerToast(added < requested ? "Available items added to cart" : "Items added to cart");
      router.push("/cart");
    } catch {
      showCustomerToast("Couldn’t reorder. Try again.");
    } finally {
      action.current = false;
      setPending(undefined);
    }
  }

  const addCandidates = (suggestions.data?.products ?? []).filter((product) => {
    const variant = product.variants?.[0];
    return variant && (addedVariants.includes(variant.id) ||
      ((variant.stock_available ?? 0) > 0 && !order.items.some((item) => item.variant_id === variant.id)));
  }).slice(0, 8);

  return (
    <div className="order-tracking">
      <header className="tracking-header" data-raised={raisedHeader}>
        <Link href="/orders" className="tracking-back" aria-label="Back to My orders"><ChevronLeft aria-hidden="true" size={23} /></Link>
        <div><h1>Order #{order.order_no}</h1><p>Placed at {clockTime.format(new Date(order.placed_at))}</p></div>
        <button type="button" className="tracking-help" onClick={() => setHelp(true)}>Help</button>
      </header>

      <section className="tracking-hero" aria-live="polite">
        <span key={Boolean(failure) ? "failed" : awaitingPayment ? "payment" : "confirmed"} className="tracking-mark" data-tone={failure ? "danger" : awaitingPayment ? "waiting" : "success"}>
          {failure ? <AlertCircle aria-hidden="true" size={38} /> : awaitingPayment ? <Clock aria-hidden="true" size={38} /> : <Check aria-hidden="true" size={42} strokeWidth={3} />}
        </span>
        <h2>{heading}</h2><p>{statusDescription}</p>
        {!closed && !awaitingPayment && order.status !== "arrived" && (minutes > 0
          ? <div className="tracking-eta"><span>Est. arrival in</span><strong key={minutes}>{minutes}</strong><span>min</span></div>
          : <p className="tracking-estimate-note">Arrival estimate updating</p>)}
        {!failure && !awaitingPayment && <div className="tracking-progress" aria-hidden="true"><span style={{ transform: `scaleX(${[.08, .25, .55, .9, 1][stage]})` }} /></div>}
      </section>

      <div className="tracking-content">
        {detail.isRefetchError && <p className="tracking-notice" role="status">Updates are temporarily delayed. Showing the last known status.</p>}

        {!closed && !awaitingPayment && (
          <TrackingMap store={order.tracking?.store ?? null} drop={order.tracking?.drop ?? null}
            rider={order.tracking?.rider ?? null} active={activeRoute} />
        )}

        {!failure && !awaitingPayment && <section className="tracking-card">
          <h2>Order status</h2>
          <ol className="tracking-timeline">
            {steps.map(({ title, subtitle, states }, index) => {
              const done = index < stage || order.status === "delivered";
              const current = index === stage && !done;
              const recordedAt = order.history.filter((entry) => states.includes(entry.to_status))
                .map((entry) => entry.created_at).sort()[0];
              return <li key={title} data-done={done} aria-current={current ? "step" : undefined}>
                <span className="tracking-step-dot" aria-hidden="true">{done && <Check size={14} strokeWidth={3} />}</span>
                <div><strong>{title}</strong><p>{subtitle}</p></div>
                {recordedAt && <time dateTime={recordedAt}>{clockTime.format(new Date(recordedAt))}</time>}
              </li>;
            })}
          </ol>
        </section>}

        {order.rider && activeRoute && <section className="tracking-card tracking-partner" aria-label="Delivery partner">
          <AccountAvatar src={order.rider.photo_url} className="tracking-avatar" fallback={<span className="tracking-avatar">{(order.rider.name ?? "DP").split(/\s+/).slice(0, 2).map((part) => part[0]).join("")}</span>} />
          <div><h2>{order.rider.name || "Delivery partner"}</h2>
            <p>{[order.rider.rating && `${Number(order.rider.rating).toFixed(1)} rating`, order.rider.vehicle_type, order.rider.vehicle_number].filter(Boolean).join(" · ") || "On the way with your order"}</p></div>
          {order.rider.phone && <>
            <a className="tracking-icon-button" href={`tel:${order.rider.phone}`} aria-label="Call delivery partner"><Phone size={19} aria-hidden="true" /></a>
            <a className="tracking-icon-button" href={`sms:${order.rider.phone}`} aria-label="Text delivery partner"><MessageCircle size={19} aria-hidden="true" /></a>
          </>}
        </section>}

        {order.delivery_otp && activeRoute && <section className="tracking-card tracking-otp">
          <div><h2>Delivery OTP</h2><p>Share this code with your rider at handover.</p></div>
          <strong>{order.delivery_otp}</strong>
          <button type="button" className="tracking-icon-button" aria-label="Copy delivery OTP" onClick={async () => {
            if (order.delivery_otp && await copy(order.delivery_otp, "Delivery OTP copied")) setCopiedOtp(true);
          }}>{copiedOtp ? <Check size={18} /> : <Copy size={18} />}</button>
        </section>}

        {order.status === "delivered" && order.customer_rating !== undefined && <section className="tracking-card tracking-rating">
          <h2>Delivered! How was it?</h2>
          <div className="tracking-stars" role="group" aria-label="Rate your delivery">
            {[1, 2, 3, 4, 5].map((rating) => <button key={rating} type="button" disabled={Boolean(pending)}
              aria-label={`Rate ${rating} out of 5`} aria-pressed={order.customer_rating === rating} data-filled={rating <= (order.customer_rating ?? 0)}
              onClick={() => void update("rating", { action: "rating", rating }, "Thanks for rating your delivery")}><Star aria-hidden="true" size={27} /></button>)}
          </div>
          <p>{order.customer_rating ? `Your rating: ${order.customer_rating} out of 5` : "Your feedback helps us improve"}</p>
        </section>}

        {!closed && !awaitingPayment && <section className="tracking-card">
          <div className="tracking-add-heading"><h2>Add more to this order</h2>
            <span>{addOnEnabled ? `${Math.floor(addSeconds / 60)}:${String(addSeconds % 60).padStart(2, "0")}` : "Closed"}</span></div>
          <p className="tracking-card-note">{addOnEnabled ? "No extra delivery fee before packing begins."
            : addOnOffer ? "Add-ons are currently unavailable."
            : order.payment_method === "online" ? "Use a new order to shop for more items." : "The add-on window has closed."}</p>
          {addOnEnabled && (suggestions.isLoading ? <div className="tracking-suggestion-loading"><LayoutSkeleton shape="products" label="Loading add-ons" /></div>
            : addCandidates.length > 0 ? <div className="tracking-suggestions" aria-label="Suggested add-ons" tabIndex={0}>
              {addCandidates.map((product) => {
                const variant = product.variants![0];
                const added = addedVariants.includes(variant.id);
                return <article key={product.id}>
                  <Link href={`/product/${product.slug}`} aria-label={product.name}>
                    <span className="tracking-suggestion-image"><CatalogImage src={getCardImage(product)} /></span><span className="tracking-suggestion-name">{product.name}</span>
                  </Link>
                  <div><strong>{formatRupees(variant.effective_price ?? variant.base_price)}</strong>
                    <button type="button" disabled={added || Boolean(pending)} aria-label={added ? `${product.name} added` : `Add ${product.name} to this order`} onClick={async () => {
                      if (await update(variant.id, { action: "add-item", variantId: variant.id }, "Added to your order")) {
                        setAddedVariants((previous) => [...previous, variant.id]);
                      }
                    }}>
                      {added ? "Added" : pending === variant.id ? "Adding…" : "Add"}
                    </button>
                  </div>
                </article>;
              })}
            </div> : <p className="tracking-card-note">{suggestions.isError ? "Suggestions couldn’t load." : "No add-ons are available right now."}</p>)}
        </section>}

        {(!closed || instructions.length > 0) && <section className="tracking-card">
          <h2>Delivery instructions</h2>
          {!closed && <div className="tracking-instructions">
            {deliveryInstructionOptions.map((option) => {
              const selected = instructions.includes(option);
              return <button key={option} type="button" aria-pressed={selected} disabled={Boolean(pending)}
                onClick={() => {
                  const next = selected ? instructions.filter((text) => text !== option) : [...instructions, option];
                  void update("instructions", { action: "instructions", instructions: next.join(", ") }, "Delivery instructions saved");
                }}>{option}</button>;
            })}
          </div>}
          {(closed ? instructions.length > 0 : otherInstructions.length > 0) &&
            <p className="tracking-card-note">{(closed ? instructions : otherInstructions).join(", ")}</p>}
        </section>}

        <section className="tracking-card">
          <h2>Order summary <span>({totalItems} {totalItems === 1 ? "item" : "items"})</span></h2>
          <ul className="tracking-items">
            {order.items.map((item) => <li key={item.id}>
              <span className="tracking-thumbnail"><CatalogImage src={item.image_snapshot} /></span>
              <div><strong>{item.name_snapshot ?? "Item"}</strong><p>{[item.label_snapshot, `× ${item.quantity}`, item.status === "out_of_stock" && "Out of stock"].filter(Boolean).join(" · ")}</p></div>
              {item.status !== "out_of_stock" && <strong>{formatRupees(Number(item.unit_price) * item.quantity)}</strong>}
            </li>)}
          </ul>
          <dl className="tracking-bill">
            <div><dt>Items total</dt><dd><AnimatedRupees value={Number(order.items_total)} duration={450} /></dd></div>
            <div><dt>Delivery charge</dt><dd>{Number(order.delivery_fee) > 0 ? formatRupees(Number(order.delivery_fee)) : "FREE"}</dd></div>
            <div><dt>Handling charge</dt><dd>{formatRupees(Number(order.handling_fee))}</dd></div>
            {Number(order.small_cart_fee) > 0 && <div><dt>Small cart fee</dt><dd>{formatRupees(Number(order.small_cart_fee))}</dd></div>}
            {Number(order.tip) > 0 && <div><dt>Tip</dt><dd>{formatRupees(Number(order.tip))}</dd></div>}
            {Number(order.discount) > 0 && <div><dt>Discount</dt><dd>−{formatRupees(Number(order.discount))}</dd></div>}
            <div className="tracking-bill-total"><dt>{payment === "Paid" || payment === "Collected on delivery" ? "Total paid" : "Order total"}</dt><dd><AnimatedRupees value={Number(order.grand_total)} duration={450} /></dd></div>
          </dl>
        </section>

        <section className="tracking-card tracking-details" aria-label="Delivery and payment details">
          <div><MapPin aria-hidden="true" /><div><h2>Delivery address</h2>
            <p>{[address?.line1, address?.line2, address?.landmark, [address?.city, address?.state, address?.pincode].filter(Boolean).join(", ")].filter(Boolean).join(", ") || "Address unavailable"}</p></div></div>
          <div><CreditCard aria-hidden="true" /><div><h2>Payment</h2>
            <p>{order.payment_method === "cod" ? "Cash on delivery" : "Online payment"} · {payment}</p></div></div>
        </section>
      </div>

      <div className="tracking-footer">
        {canCancel && <button type="button" className="order-action" disabled={cancelPending} onClick={cancel}>{cancelPending ? "Cancelling…" : "Cancel order"}</button>}
        {failure ? <Link href="/" className="order-action order-action-primary">Continue shopping</Link>
          : <button type="button" disabled={pending === "reorder"} className="order-action order-action-primary" aria-label={delivered ? undefined : "Share tracking link"} onClick={() => void (delivered ? reorder(order) : share())}>
            {!delivered && <Share2 aria-hidden="true" size={17} />}{pending === "reorder" ? "Checking stock…" : delivered ? "Reorder" : "Share tracking"}
          </button>}
      </div>

      {help && <SwipeableSheet labelledBy="tracking-help-title" onClose={() => setHelp(false)}>
        <div className="tracking-help-sheet">
          <h2 id="tracking-help-title">Help with order #{order.order_no}</h2>
          {contact ? <a href={`tel:${contact}`} className="order-action order-action-primary"><Phone aria-hidden="true" size={17} />{order.rider?.phone ? "Call delivery partner" : "Call the store"}</a>
            : <p>Contact details are unavailable for this order.</p>}
          {order.rider?.phone && order.store?.phone && <a href={`tel:${order.store.phone}`} className="order-action">Call the store</a>}
          <Link href="/orders" className="order-action">My orders</Link>
        </div>
      </SwipeableSheet>}
      {sharedLink && <SwipeableSheet labelledBy="tracking-share-title" onClose={() => setSharedLink(undefined)}>
        <div className="tracking-help-sheet">
          <h2 id="tracking-share-title">Share tracking link</h2>
          <p>This link requires the account that placed the order.</p>
          <input type="url" aria-label="Tracking link" value={sharedLink} readOnly data-dialog-initial-focus onFocus={(event) => event.currentTarget.select()} />
        </div>
      </SwipeableSheet>}
    </div>
  );
}
