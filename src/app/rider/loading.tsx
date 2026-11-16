import React from "react";
import { BrandLoader } from "@/components/common/BrandLoader";

export default function RiderLoading() {
  return (
    <div className="min-h-screen bg-[#13193B] text-white flex items-center justify-center p-4">
      <div className="text-center space-y-4">
        <div className="w-20 h-20 rounded-3xl bg-[#F66002]/20 border-2 border-[#F66002] mx-auto flex items-center justify-center p-2 relative shadow-[0_0_30px_rgba(246,96,2,0.3)]">
          <img
            src="/logo.png"
            alt="TikTikMart Rider"
            className="w-full h-full object-contain animate-bounce"
          />
          <span className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-400 rounded-full animate-ping" />
        </div>
        <div>
          <h2 className="font-black text-xl text-white">Delivery Partner Terminal</h2>
          <p className="text-xs text-gray-300 mt-1">Connecting to live dispatch radar...</p>
        </div>
        <div className="w-40 h-1.5 bg-white/10 rounded-full mx-auto overflow-hidden relative">
          <div className="absolute inset-y-0 bg-[#F66002] w-20 rounded-full animate-slide-pulse" />
        </div>
      </div>
    </div>
  );
}
