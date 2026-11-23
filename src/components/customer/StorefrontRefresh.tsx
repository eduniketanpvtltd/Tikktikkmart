"use client";

import { useEffect, useState, type RefObject } from "react";
import { createPortal } from "react-dom";
import { ShoppingBasket } from "lucide-react";
import { showCustomerToast } from "@/components/customer/CustomerFeedback";

const threshold = 68;

export function StorefrontRefresh({
  storefront,
  refresh,
}: {
  storefront: RefObject<HTMLDivElement | null>;
  refresh: () => Promise<{ isError: boolean }>;
}) {
  const [distance, setDistance] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    const root = storefront.current;
    if (!root) return;
    let gesture: { x: number; y: number; distance: number } | undefined;
    let inFlight = false;
    let mounted = true;

    function start(event: TouchEvent) {
      if (inFlight || window.scrollY > 1 || event.touches.length !== 1) return;
      if (!(event.target instanceof Element) || event.target.closest("button, input, textarea, dialog")) return;
      const touch = event.touches[0];
      gesture = { x: touch.clientX, y: touch.clientY, distance: 0 };
    }

    function move(event: TouchEvent) {
      if (!gesture || event.touches.length !== 1) return;
      const touch = event.touches[0];
      const dy = touch.clientY - gesture.y;
      const dx = touch.clientX - gesture.x;
      if (dy < -8 || (!gesture.distance && Math.abs(dx) > 12 && Math.abs(dx) > dy)) {
        gesture = undefined;
        setDistance(0);
        return;
      }
      if (!gesture.distance && dy < 9) return;
      if (event.cancelable) event.preventDefault();
      gesture.distance = Math.max(0, Math.min(96, dy * 0.64));
      setDistance(gesture.distance);
    }

    function cancel() {
      gesture = undefined;
      if (!inFlight) setDistance(0);
    }

    function end() {
      const shouldRefresh = (gesture?.distance ?? 0) >= threshold;
      gesture = undefined;
      if (!shouldRefresh) {
        setDistance(0);
        return;
      }

      inFlight = true;
      setDistance(threshold);
      setRefreshing(true);
      root?.setAttribute("data-storefront-refreshing", "");
      void Promise.all([
        refresh(),
        new Promise((resolve) => window.setTimeout(resolve, 450)),
      ]).then(([result]) => {
        if (mounted) showCustomerToast(result.isError ? "Couldn’t refresh. Try again." : "Updated just now");
      }).catch(() => {
        if (mounted) showCustomerToast("Couldn’t refresh. Try again.");
      }).finally(() => {
        if (!mounted) return;
        root?.removeAttribute("data-storefront-refreshing");
        setRefreshing(false);
        setDistance(0);
        inFlight = false;
      });
    }

    root.addEventListener("touchstart", start, { passive: true });
    root.addEventListener("touchmove", move, { passive: false });
    root.addEventListener("touchend", end);
    root.addEventListener("touchcancel", cancel);
    return () => {
      mounted = false;
      root.removeAttribute("data-storefront-refreshing");
      root.removeEventListener("touchstart", start);
      root.removeEventListener("touchmove", move);
      root.removeEventListener("touchend", end);
      root.removeEventListener("touchcancel", cancel);
    };
  }, [storefront, refresh]);

  if (!distance && !refreshing) return null;
  return createPortal(
    <div className="pointer-events-none fixed inset-x-0 top-36 z-50 flex justify-center lg:top-27">
      <div role="status" aria-label={refreshing ? "Refreshing products" : "Pull to refresh products"} data-refresh-basket
        className="grid size-11 place-items-center rounded-full bg-[var(--white)] text-[color:var(--theme-orange-text)] shadow-lg"
        style={{ translate: `0 ${distance}px` }}
      >
        <ShoppingBasket aria-hidden="true" className={`size-5 ${refreshing ? "motion-safe:animate-spin" : ""}`} />
      </div>
    </div>,
    document.body,
  );
}
