"use client";

import { useCallback, useEffect, useRef, type PointerEvent } from "react";
import { useRouter } from "next/navigation";

export function useIntentPrefetch(href: string, payload?: () => void, viewport = false) {
  const router = useRouter();
  const ref = useRef<HTMLAnchorElement>(null);
  const load = useRef(payload);
  const last = useRef({ href: "", at: 0 });
  useEffect(() => { load.current = payload; }, [payload]);
  const prefetch = useCallback(() => {
    const connection = (navigator as Navigator & { connection?: { saveData?: boolean; effectiveType?: string } }).connection;
    if (!navigator.onLine || connection?.saveData || connection?.effectiveType?.includes("2g")) return;
    if (last.current.href === href && Date.now() - last.current.at < 20_000) return;
    last.current = { href, at: Date.now() };
    router.prefetch(href);
    load.current?.();
  }, [href, router]);

  useEffect(() => {
    if (!viewport || !ref.current || typeof IntersectionObserver === "undefined") return;
    let cancel = () => {};
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      observer.disconnect();
      if (typeof requestIdleCallback === "function") {
        const id = requestIdleCallback(prefetch, { timeout: 1500 });
        cancel = () => cancelIdleCallback(id);
      } else {
        const id = window.setTimeout(prefetch, 250);
        cancel = () => window.clearTimeout(id);
      }
    });
    observer.observe(ref.current);
    return () => { observer.disconnect(); cancel(); };
  }, [prefetch, viewport]);

  return {
    ref,
    onPointerEnter: (event: PointerEvent<HTMLAnchorElement>) => {
      if (event.pointerType !== "touch") prefetch();
    },
    onFocus: prefetch,
  };
}
