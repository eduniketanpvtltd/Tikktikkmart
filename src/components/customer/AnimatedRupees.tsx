"use client";

import { useEffect, useRef, useState } from "react";

const currency = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 2 });

export function formatRupees(value: number) {
  return `₹${currency.format(value)}`;
}

export function AnimatedRupees({ value, duration = 500 }: { value: number; duration?: number }) {
  const displayed = useRef(0);
  const [amount, setAmount] = useState(0);

  useEffect(() => {
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (motion.matches) {
      displayed.current = value;
      setAmount(value);
      return;
    }

    const from = displayed.current;
    const start = performance.now();
    let frame: number;
    const finish = () => {
      displayed.current = value;
      setAmount(value);
    };

    function tick(now: number) {
      if (motion.matches) {
        finish();
        return;
      }
      const progress = Math.min(1, (now - start) / duration);
      displayed.current = from + (value - from) * (1 - (1 - progress) ** 3);
      setAmount(displayed.current);
      if (progress < 1) frame = requestAnimationFrame(tick);
    }

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value, duration]);

  return (
    <span className="tabular-nums">
      <span className="sr-only">{formatRupees(value)}</span>
      <span aria-hidden="true">{formatRupees(amount)}</span>
    </span>
  );
}
