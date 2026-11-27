"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

export function FeaturedCarousel({ children }: { children: ReactNode[] }) {
  const count = children.length;
  const [active, setActive] = useState(0);
  const swipeStartX = useRef<number | null>(null);

  useEffect(() => {
    if (count < 2) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const timer = window.setInterval(() => {
      setActive((current) => (current + 1) % count);
    }, 3000);
    return () => window.clearInterval(timer);
  }, [count]);

  return (
    <div
      className="market-carousel-wrap"
      aria-roledescription="carousel"
      aria-label="Featured highlights"
      onPointerDown={(event) => {
        swipeStartX.current = event.clientX;
      }}
      onPointerUp={(event) => {
        if (swipeStartX.current == null || count < 2) return;
        const delta = event.clientX - swipeStartX.current;
        swipeStartX.current = null;
        if (Math.abs(delta) > 30) {
          setActive((current) => (current + (delta < 0 ? 1 : -1) + count) % count);
        }
      }}
    >
      <div className="market-carousel-track" style={{ transform: `translateX(-${active * 100}%)` }}>
        {children}
      </div>
      {count > 1 && (
        <div className="market-carousel-dots" role="tablist" aria-label="Featured slides">
          {children.map((_, index) => (
            <button
              key={index}
              type="button"
              role="tab"
              aria-selected={index === active}
              aria-label={`Slide ${index + 1}`}
              className={index === active ? "is-active" : undefined}
              onClick={() => setActive(index)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
