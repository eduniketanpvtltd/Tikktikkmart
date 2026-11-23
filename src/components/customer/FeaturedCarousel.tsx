"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

export function FeaturedCarousel({ children }: { children: ReactNode[] }) {
  const track = useRef<HTMLDivElement>(null);
  const [pauseUntil, setPauseUntil] = useState(0);
  const activePosition = useRef(0);
  const [active, setActive] = useState(0);
  const [stops, setStops] = useState<number[]>([]);

  useEffect(() => {
    const element = track.current;
    if (!element) return;

    function updateStops() {
      if (!element) return;
      const max = Math.max(0, element.scrollWidth - element.clientWidth);
      const first = (element.firstElementChild as HTMLElement | null)?.offsetLeft ?? 0;
      const nextStops = Array.from(element.children, (child) =>
        Math.min(max, (child as HTMLElement).offsetLeft - first));
      setStops(nextStops.filter((stop, index) => index === 0 || stop - nextStops[index - 1] > 2));
    }

    updateStops();
    const resize = new ResizeObserver(updateStops);
    resize.observe(element);
    return () => resize.disconnect();
  }, [children.length]);

  function goTo(index: number) {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    track.current?.scrollTo({ left: stops[index], behavior: reduced ? "instant" : "smooth" });
    activePosition.current = index;
    setActive(index);
  }

  useEffect(() => {
    if (stops.length < 2) return;
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let timeout: number;

    const advance = () => {
      const element = track.current;
      if (!element || motion.matches) return;
      const hovered = window.matchMedia("(hover: hover)").matches && element.matches(":hover");
      if (!document.hidden && !element.matches(":focus-within") && !hovered) {
        const next = (activePosition.current + 1) % stops.length;
        element.scrollTo({ left: stops[next], behavior: "smooth" });
      }
      timeout = window.setTimeout(advance, 3200);
    };

    const schedule = () => {
      window.clearTimeout(timeout);
      const remaining = pauseUntil - Date.now();
      if (!motion.matches) timeout = window.setTimeout(advance, remaining > 0 ? remaining : 3200);
    };

    schedule();
    motion.addEventListener("change", schedule);
    return () => {
      window.clearTimeout(timeout);
      motion.removeEventListener("change", schedule);
    };
  }, [pauseUntil, stops]);

  function pause() {
    setPauseUntil(Date.now() + 6000);
  }

  return (
    <div>
      <div ref={track} data-storefront-stagger data-featured-track
        className="storefront-row relative"
        onPointerDown={pause}
        onPointerUp={pause}
        onWheel={pause}
        onScroll={(event) => {
          const current = event.currentTarget.scrollLeft;
          const closest = stops.reduce((best, stop, index) =>
            Math.abs(stop - current) < Math.abs(stops[best] - current) ? index : best, 0);
          activePosition.current = closest;
          setActive(closest);
        }}
      >
        {children}
      </div>
      {stops.length > 1 && (
        <div aria-label="Featured slides" className="flex justify-center gap-1">
          {stops.map((stop, index) => (
            <button key={stop} type="button" aria-label={`Go to featured position ${index + 1}`}
              aria-current={index === active ? "true" : undefined}
              onClick={() => { pause(); goTo(index); }}
              className="grid h-8 min-w-6 place-items-center px-1"
            >
              <span className={`h-1.5 w-5 rounded-full motion-safe:transition-[scale,opacity] motion-safe:duration-300 ${index === active ? "scale-x-100 bg-[var(--theme-orange-hover)] opacity-100" : "scale-x-30 bg-[var(--theme-orange-hover)] opacity-35"}`} />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
