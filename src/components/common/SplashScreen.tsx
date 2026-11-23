"use client";

import React, { useEffect, useState } from "react";
import { Zap, Sparkles } from "lucide-react";

export function SplashScreen() {
  const [visible, setVisible] = useState(false);
  const [fading, setFading] = useState(false);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    // Only show on first app launch in session, or when query ?splash=1 is passed
    const hasShown = sessionStorage.getItem("ttm_splash_v1");
    if (!hasShown) {
      setVisible(true);
      sessionStorage.setItem("ttm_splash_v1", "true");

      const fadeTimer = setTimeout(() => {
        setFading(true);
      }, 1400);

      const hideTimer = setTimeout(() => {
        setVisible(false);
      }, 1900);

      return () => {
        clearTimeout(fadeTimer);
        clearTimeout(hideTimer);
      };
    }
  }, []);

  if (!visible) return null;

  return (
    <div
      onClick={() => {
        setFading(true);
        setTimeout(() => setVisible(false), 300);
      }}
      className={`fixed inset-0 z-[100] flex flex-col items-center justify-between p-6 bg-gradient-to-b from-[#13193B] via-[#1E2652] to-[#F66002] text-white transition-opacity duration-500 cursor-pointer select-none ${
        fading ? "opacity-0 pointer-events-none" : "opacity-100"
      }`}
    >
      {/* Top Tagline */}
      <div className="pt-8 flex items-center gap-1.5 bg-white/10 px-3.5 py-1.5 rounded-full border border-white/20 backdrop-blur-xs animate-in fade-in slide-in-from-top-4 duration-700">
        <Sparkles className="w-3.5 h-3.5 text-[#FFD269]" />
        <span className="text-xs font-bold text-gray-200">
          India&apos;s Fastest Last-Minute Saver
        </span>
      </div>

      {/* Center Mascot & Logo Banner */}
      <div className="flex flex-col items-center text-center space-y-4 my-auto">
        <div className="relative">
          {/* Animated Speed Rings */}
          <div className="absolute inset-0 -m-4 rounded-3xl bg-[#F66002]/30 blur-xl animate-pulse" />
          <div className="absolute -inset-3 rounded-full border-2 border-dashed border-[#FFD269]/40 animate-spin [animation-duration:12s]" />

          {/* Mascot Logo Card */}
          <div className="relative w-28 h-28 sm:w-32 sm:h-32 rounded-3xl bg-white p-2 shadow-[0_20px_50px_rgba(246,96,2,0.4)] border-2 border-white/80 overflow-hidden transform hover:scale-105 transition-transform">
            <img
              src="/logo.png"
              alt="TIKK TIKK MART"
              className="w-full h-full object-contain"
            />
          </div>

          {/* Express Badge */}
          <div className="absolute -bottom-2 -right-2 bg-[#F66002] border-2 border-white text-white p-1.5 rounded-xl shadow-md flex items-center justify-center">
            <Zap className="w-4 h-4 fill-[#FFD269] text-[#FFD269]" />
          </div>
        </div>

        {/* Wordmark */}
        <div className="space-y-1">
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-white drop-shadow-sm">
            TIKK TIKK <span className="text-[#FFD269]">MART</span>
          </h1>
          <p className="text-xs sm:text-sm font-black text-[#FFD269] tracking-widest uppercase">
            — Last Minute Saver —
          </p>
        </div>

        {/* 10-Minute Promise */}
        <div className="inline-flex items-center gap-2 bg-black/30 border border-white/15 px-4 py-1.5 rounded-2xl backdrop-blur-md">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
          <span className="text-xs font-extrabold text-white">
            ⚡ 10-Minute Instant Grocery Delivery
          </span>
        </div>
      </div>

      {/* Bottom Loading Indicator */}
      <div className="pb-8 w-full max-w-xs flex flex-col items-center space-y-2">
        <div className="w-48 h-1.5 bg-white/20 rounded-full overflow-hidden relative">
          <div className="absolute inset-y-0 bg-gradient-to-r from-[#FFD269] to-[#F66002] w-24 rounded-full animate-slide-pulse" />
        </div>
        <span className="text-[11px] font-semibold text-gray-300">
          Loading catalog & nearby dark stores...
        </span>
      </div>
    </div>
  );
}
