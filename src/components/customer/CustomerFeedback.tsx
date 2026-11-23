"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Check } from "lucide-react";

const feedbackEvent = "tiktikmart:feedback";
let sequence = 0;
type Feedback = { message: string; celebrate: boolean; id: number };

export function showCustomerToast(message: string, celebrate = false) {
  window.dispatchEvent(new CustomEvent<Feedback>(feedbackEvent, {
    detail: { message, celebrate, id: ++sequence },
  }));
}

export function signalStockLimit(button: HTMLElement, stock: number, orderLimit = stock) {
  if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    button.animate(
      [-5, 4, -3, 2, 0].map((x) => ({ transform: `translateX(${x}px)` })),
      { duration: 270 },
    );
  }
  showCustomerToast(stock <= orderLimit ? `Only ${stock} left in stock` : `Limit of ${orderLimit} per order`);
}

const confettiColors = ["var(--brand-orange-strong)", "var(--brand-orange-soft)", "var(--navy)", "var(--peach)"];

export function CustomerFeedback() {
  const [feedback, setFeedback] = useState<Feedback>();

  useEffect(() => {
    let timeout: number;
    function show(event: Event) {
      window.clearTimeout(timeout);
      setFeedback((event as CustomEvent<Feedback>).detail);
      timeout = window.setTimeout(() => setFeedback(undefined), 1800);
    }
    window.addEventListener(feedbackEvent, show);
    return () => {
      window.removeEventListener(feedbackEvent, show);
      window.clearTimeout(timeout);
    };
  }, []);

  if (!feedback) return null;

  return createPortal(
    <div key={feedback.id} className="customer-toast pointer-events-none fixed inset-x-0 z-[80] flex justify-center px-4">
      <div role="status" className="flex max-w-full items-center gap-2 rounded-full bg-[var(--navy)] px-4 py-2.5 text-center text-sm font-bold text-white shadow-lg">
        <Check aria-hidden="true" className="size-4 shrink-0 text-[color:var(--theme-on-navy)]" />
        {feedback.message}
      </div>
      {feedback.celebrate && (
        <div aria-hidden="true" className="absolute left-1/2 top-8 motion-reduce:hidden">
          {Array.from({ length: 24 }, (_, index) => {
            const angle = (index / 24) * Math.PI * 2;
            const radius = 90 + (index % 5) * 23;
            return <i key={index} className="order-confetti" style={{
              backgroundColor: confettiColors[index % confettiColors.length],
              "--confetti-x": `${Math.cos(angle) * radius}px`,
              "--confetti-y": `${Math.sin(angle) * radius}px`,
              "--confetti-turn": `${index % 2 ? 320 : -260}deg`,
            } as React.CSSProperties} />;
          })}
        </div>
      )}
    </div>,
    document.body,
  );
}
