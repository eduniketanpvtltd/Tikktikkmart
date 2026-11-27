"use client";

import { enqueueUndo } from "@/components/ui/UndoToast";
import { MotionSpring } from "@/lib/ui/spring";
import { useLayoutEffect, useRef, type PointerEvent } from "react";
import { Minus, Plus, Trash2 } from "lucide-react";
import { useCartStore, type CartItem } from "@/stores/cartStore";
import { QuantityNumber } from "@/components/customer/QuantityNumber";
import { signalStockLimit } from "@/components/customer/CustomerFeedback";
import { AnimatedRupees, formatRupees } from "@/components/customer/AnimatedRupees";
import { CatalogImage } from "@/components/customer/CatalogImage";

export function CartRow({
  item,
  initialIndex,
  stock,
  orderLimit,
}: {
  item: CartItem;
  initialIndex?: number;
  stock?: number;
  orderLimit?: number;
}) {
  const setQty = useCartStore((state) => state.setQty);
  const row = useRef<HTMLDivElement>(null);
  const content = useRef<HTMLDivElement>(null);
  const stepper = useRef<HTMLDivElement>(null);
  const spring = useRef<MotionSpring>(null);
  const drag = useRef<{ id: number; x: number; y: number; distance: number; origin: number; at: number; velocity: number }>(null);
  const removing = useRef(false);
  const stockLimit = stock ?? item.stockLimit;
  const purchaseLimit = orderLimit ?? item.maxQty;
  const maxQty = Math.min(stockLimit ?? Infinity, purchaseLimit);

  useLayoutEffect(() => {
    const element = content.current;
    if (!element) return;
    const motion = new MotionSpring((x) => {
      element.style.transform = x ? `translateX(${x}px)` : "";
    });
    spring.current = motion;
    return () => motion.stop();
  }, []);

  function remove(swiped = false) {
    if (removing.current) return;
    removing.current = true;
    const finish = () => {
      const state = useCartStore.getState();
      const position = state.items.findIndex((entry) => entry.variantId === item.variantId);
      const removed = state.items[position];
      if (!removed) return;
      state.setQty(item.variantId, 0);
      enqueueUndo("Removed from cart", () => {
        const current = useCartStore.getState();
        if (current.storeId !== state.storeId || current.items.some((entry) => entry.variantId === removed.variantId)) return;
        const items = [...current.items];
        items.splice(position, 0, removed);
        useCartStore.setState({ items });
      });
    };
    const element = row.current;
    if (!element || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      finish();
      return;
    }

    if (swiped && content.current) {
      spring.current?.moveTo(-content.current.getBoundingClientRect().width);
    }
    const height = element.getBoundingClientRect().height;
    void element.animate([{ height: `${height}px` }, { height: "0px" }], {
      duration: 300, easing: "ease-out", fill: "forwards",
    }).finished.catch(() => {}).then(finish);
  }

  function onPointerDown(event: PointerEvent<HTMLDivElement>) {
    if (!event.isPrimary || event.button !== 0 || (event.target as Element).closest("button, a") || removing.current) return;
    const origin = spring.current?.value ?? 0;
    spring.current?.stop();
    drag.current = { id: event.pointerId, x: event.clientX, y: event.clientY, distance: 0, origin, at: performance.now(), velocity: 0 };
  }

  function onPointerMove(event: PointerEvent<HTMLDivElement>) {
    const gesture = drag.current;
    if (!gesture || gesture.id !== event.pointerId || !spring.current) return;
    const x = event.clientX - gesture.x;
    const y = event.clientY - gesture.y;
    if (!gesture.distance && (x > -8 || Math.abs(y) > Math.abs(x))) return;
    if (!event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.setPointerCapture(event.pointerId);
    const at = performance.now();
    const distance = Math.min(0, gesture.origin + x);
    const velocity = (distance - spring.current.value) * 1000 / Math.max(8, at - gesture.at);
    gesture.distance = distance;
    gesture.velocity = .45 * gesture.velocity + .55 * velocity;
    gesture.at = at;
    spring.current.place(distance);
  }

  function finishPointer(event: PointerEvent<HTMLDivElement>, cancelled = false) {
    const gesture = drag.current;
    if (!gesture || gesture.id !== event.pointerId) return;
    drag.current = null;

    const velocity = performance.now() - gesture.at < 90 ? gesture.velocity : 0;
    if (spring.current) spring.current.velocity = velocity;
    if (!cancelled && (gesture.distance < -72 || (gesture.distance < -24 && velocity < -650))) {
      remove(true);
    } else spring.current?.moveTo(0);
  }

  return (
    <div
      ref={row}
      data-cart-row
      className={`relative overflow-hidden bg-[var(--theme-danger-bg)] ${initialIndex == null ? "" : "cart-row-entry"}`}
      style={initialIndex == null ? undefined : { "--cart-row-order": initialIndex } as React.CSSProperties}
    >
      <span aria-hidden="true" className="pointer-events-none absolute inset-y-0 right-4 flex items-center gap-2 text-xs font-bold text-[color:var(--theme-danger)]">
        <Trash2 className="size-4" /> Remove
      </span>
      <div
        ref={content}
        className="cart-row-content relative grid touch-pan-y grid-cols-[50px_minmax(0,1fr)_auto] items-center gap-3 border-b border-[#F0E4D2] bg-white px-[14px] py-2.5"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={finishPointer}
        onPointerCancel={(event) => finishPointer(event, true)}
        onPointerLeave={(event) => {
          if (!event.currentTarget.hasPointerCapture(event.pointerId)) finishPointer(event, true);
        }}
      >
        <div className="cart-row-thumbnail relative size-[50px] overflow-hidden rounded-xl border border-[#F0E4D2] bg-[#FFF6EA]">
          <CatalogImage src={item.image} className="object-contain p-1" />
        </div>
        <div className="min-w-0">
          <h3 className="layout-wrap text-[13px] leading-snug font-bold text-[#3A2418]">{item.name}</h3>
          <p className="mt-0.5 truncate text-[11px] text-[#8A7060]">{item.label}</p>
        </div>
        <div className="cart-row-controls flex min-w-0 flex-col items-end">
          <div ref={stepper} className="flex shrink-0 items-center rounded-full border border-[#EADBC6] bg-[#FBE3CF] text-[#A8421A]">
            <button
              type="button"
              aria-label={`Decrease quantity of ${item.name}`}
              className="grid h-8 w-8 place-items-center"
              onClick={() => {
                if (removing.current) return;
                if (item.quantity === 1) remove();
                else setQty(item.variantId, item.quantity - 1);
              }}
            >
              <Minus aria-hidden="true" className="size-3.5" />
            </button>
            <QuantityNumber value={item.quantity} />
            <button
              type="button"
              aria-label={`Increase quantity of ${item.name}`}
              className="grid h-8 w-8 place-items-center"
              onClick={(event) => {
                if (removing.current) return;
                const limits = { maxQty, stockLimit };
                if (item.quantity >= maxQty) {
                  if (item.quantity > maxQty) setQty(item.variantId, maxQty, limits);
                  signalStockLimit(stepper.current ?? event.currentTarget, stockLimit ?? Infinity, purchaseLimit);
                  return;
                }
                setQty(item.variantId, item.quantity + 1, limits);
              }}
            >
              <Plus aria-hidden="true" className="size-3.5" />
            </button>
          </div>
          <div className="mt-1 flex items-baseline gap-1.5">
            {item.mrp > item.price && <s className="text-[11px] leading-tight text-[#8A7060]">{formatRupees(item.mrp * item.quantity)}</s>}
            <span className="text-[13px] font-extrabold leading-tight text-[#3A2418]"><AnimatedRupees value={item.price * item.quantity} /></span>
          </div>
        </div>
      </div>
    </div>
  );
}
