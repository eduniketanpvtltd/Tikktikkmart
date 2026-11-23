"use client";

import React, { useEffect, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

export function TopProgressBar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Flash the progress bar briefly on route change
    setLoading(true);
    const timer = setTimeout(() => {
      setLoading(false);
    }, 400);
    return () => clearTimeout(timer);
  }, [pathname, searchParams]);

  if (!loading) return null;

  return (
    <div className="fixed top-[env(safe-area-inset-top,0px)] left-0 right-0 z-[999] h-1 bg-transparent overflow-hidden pointer-events-none">
      <div className="h-full bg-gradient-to-r from-[#FFD269] via-[#F66002] to-[#13193B] motion-safe:animate-slide-pulse w-full shadow-[0_0_10px_#F66002]" />
    </div>
  );
}
