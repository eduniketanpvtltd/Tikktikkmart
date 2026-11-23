"use client";

import { useLayoutEffect, useRef, type PointerEvent, type ReactNode } from "react";
import { MotionSpring } from "@/lib/ui/spring";

export function SwipeableSheet({ children, onClose, labelledBy }: {
  children: ReactNode;
  onClose: () => void;
  labelledBy: string;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const spring = useRef<MotionSpring>(null);
  const drag = useRef<{ id: number; y: number; at: number; origin: number; velocity: number }>(null);
  const lastDrag = useRef(0);
  const close = useRef(onClose);
  useLayoutEffect(() => { close.current = onClose; }, [onClose]);

  useLayoutEffect(() => {
    const modal = dialog.current;
    const sheet = panel.current;
    if (!modal || !sheet) return;
    const restore = document.activeElement;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    modal.showModal();
    modal.querySelector<HTMLElement>("[data-dialog-initial-focus]")?.focus({ preventScroll: true });
    let height = sheet.offsetHeight;
    const resize = new ResizeObserver(() => { height = sheet.offsetHeight; });
    resize.observe(sheet);
    const motion = new MotionSpring((offset) => {
      sheet.style.transform = `translateY(${offset}px)`;
      modal.style.setProperty("--sheet-dim", String(1 - Math.min(1, Math.max(0, offset / height))));
    });
    spring.current = motion;
    if (matchMedia("(max-width: 639px)").matches) {
      motion.place(sheet.offsetHeight);
      motion.moveTo(0);
    }
    return () => {
      resize.disconnect();
      motion.stop();
      modal.close();
      document.body.style.overflow = previous;
      if (restore instanceof HTMLElement && restore.isConnected) restore.focus({ preventScroll: true });
    };
  }, []);

  function dismiss() {
    if (!spring.current || !panel.current) return close.current();
    const position = panel.current.getBoundingClientRect();
    spring.current.moveTo(spring.current.value + window.innerHeight - position.top + 12, () => close.current());
  }

  function finish(event: PointerEvent, cancelled = false) {
    const gesture = drag.current;
    const motion = spring.current;
    if (!gesture || gesture.id !== event.pointerId || !motion || !panel.current) return;
    drag.current = null;
    motion.velocity = performance.now() - gesture.at < 90 ? gesture.velocity : 0;
    if (!cancelled && (motion.value > panel.current.offsetHeight * .3 || (motion.value > 14 && motion.velocity > 650))) dismiss();
    else motion.moveTo(0);
  }

  return (
    <dialog ref={dialog} aria-labelledby={labelledBy} className="interaction-dialog"
      onCancel={(event) => { event.preventDefault(); dismiss(); }}
      onClick={(event) => { if (event.target === event.currentTarget) dismiss(); }}>
      <div className="interaction-sheet" ref={panel}>
        <button type="button" aria-label="Close sheet" className="interaction-sheet-handle"
          onClick={(event) => { if (!event.detail || performance.now() - lastDrag.current > 300) dismiss(); }}
          onPointerDown={(event) => {
            if (!event.isPrimary || event.button !== 0 || !spring.current) return;
            event.currentTarget.setPointerCapture(event.pointerId);
            spring.current.stop();
            lastDrag.current = -Infinity;
            drag.current = { id: event.pointerId, y: event.clientY, at: performance.now(), origin: spring.current.value, velocity: 0 };
          }}
          onPointerMove={(event) => {
            const gesture = drag.current;
            const motion = spring.current;
            if (!gesture || !motion || gesture.id !== event.pointerId) return;
            const now = performance.now();
            const offset = gesture.origin + event.clientY - gesture.y;
            const value = offset < 0 ? -Math.sqrt(-offset) * 3 : offset;
            const velocity = (value - motion.value) * 1000 / Math.max(8, now - gesture.at);
            gesture.velocity = .4 * gesture.velocity + .6 * velocity;
            gesture.at = now;
            motion.place(value);
          }}
          onPointerCancel={(event) => finish(event, true)}
          onPointerUp={(event) => {
            const moved = drag.current && Math.abs(event.clientY - drag.current.y) > 5;
            if (moved) lastDrag.current = performance.now();
            finish(event);
          }}><span /></button>
        {children}
      </div>
    </dialog>
  );
}
