"use client";

import { useLayoutEffect, useRef } from "react";

export function QuantityNumber({ value }: { value: number }) {
  const digit = useRef<HTMLSpanElement>(null);
  const previous = useRef(value);

  useLayoutEffect(() => {
    const direction = Math.sign(value - previous.current);
    previous.current = value;
    if (!direction || !digit.current || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const animation = digit.current.animate([
      { transform: `translateY(${direction * 100}%)`, opacity: 0 },
      { transform: "translateY(0)", opacity: 1 },
    ], { duration: 190, easing: "ease-out" });
    return () => animation.cancel();
  }, [value]);

  return <span className="inline-grid min-w-4 overflow-hidden text-center text-xs font-extrabold tabular-nums" aria-live="polite">
    <span ref={digit}>{value}</span>
  </span>;
}
