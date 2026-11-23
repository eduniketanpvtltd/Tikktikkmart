"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowUp } from "lucide-react";

export function StorefrontBackToTop() {
  const [visible, setVisible] = useState(false);
  const positioner = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const dock = positioner.current;
    const header = dock?.closest("[data-customer-app]")?.querySelector(".customer-store-header");
    const syncHeaderHeight = () => {
      if (header) dock?.style.setProperty("--back-to-top-offset", `${header.getBoundingClientRect().height + 8}px`);
    };
    const observer = header ? new ResizeObserver(syncHeaderHeight) : undefined;
    if (header) observer?.observe(header);
    syncHeaderHeight();
    let lastPosition = window.scrollY;
    function updateVisibility() {
      const position = window.scrollY;
      setVisible(position > 400 && position < lastPosition);
      lastPosition = position;
    }
    window.addEventListener("scroll", updateVisibility, { passive: true });
    return () => {
      window.removeEventListener("scroll", updateVisibility);
      observer?.disconnect();
    };
  }, []);

  return (
    <div ref={positioner} className="pointer-events-none fixed inset-x-0 top-[calc(var(--back-to-top-offset,143px)-var(--customer-header-occluded,0px))] z-40 flex justify-center">
      <button
        type="button"
        inert={!visible}
        aria-hidden={!visible}
        onClick={() => window.scrollTo({
          top: 0,
          behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth",
        })}
        className={`flex h-11 items-center gap-2 whitespace-nowrap rounded-full bg-[var(--navy)] px-4 text-sm font-bold text-white shadow-md motion-safe:transition-[translate,opacity] motion-safe:duration-200 motion-safe:ease-out ${visible ? "pointer-events-auto translate-y-0 opacity-100" : "-translate-y-3 opacity-0"}`}
      >
        <span className="grid size-6 place-items-center rounded-full border border-white/70"><ArrowUp aria-hidden="true" className="size-3.5" /></span>
        Back to top
      </button>
    </div>
  );
}
