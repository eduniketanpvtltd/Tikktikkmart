"use client";

import React from "react";
import Image from "next/image";
import { Zap } from "lucide-react";

interface BrandLoaderProps {
  message?: string;
  submessage?: string;
  fullScreen?: boolean;
}

export function BrandLoader({
  message = "Loading fresh groceries...",
  submessage = "Delivering in 10 minutes ⚡",
  fullScreen = false,
}: BrandLoaderProps) {
  const content = (
    <div className="flex flex-col items-center justify-center text-center p-6 select-none animate-in fade-in duration-300">
      {/* Animated Mascot Logo with Pulse Rings */}
      <div className="relative mb-5 flex items-center justify-center">
        {/* Outer Glowing Rings */}
        <div className="absolute w-24 h-24 rounded-3xl bg-[#F66002]/15 animate-ping duration-1000" />
        <div className="absolute w-28 h-28 rounded-full border-2 border-dashed border-[#F66002]/40 animate-spin [animation-duration:8s]" />

        {/* Mascot Container */}
        <div className="relative w-20 h-20 rounded-2xl bg-white shadow-[0_8px_30px_rgba(246,96,2,0.18)] border border-orange-100 flex items-center justify-center overflow-hidden p-1.5">
          <img
            src="/logo.png"
            alt="TIKK TIKK MART"
            className="w-full h-full object-contain animate-bounce [animation-duration:1.4s]"
          />
        </div>

        {/* Speed Flash Badge */}
        <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-[#13193B] border-2 border-white flex items-center justify-center text-[#FFD269] shadow-sm">
          <Zap className="w-3.5 h-3.5 fill-[#FFD269]" />
        </div>
      </div>

      {/* Brand Title */}
      <div className="space-y-1">
        <h3 className="font-black text-lg sm:text-xl tracking-tight text-[#13193B]">
          TIKK TIKK <span className="text-[#F66002]">MART</span>
        </h3>
        <p className="text-xs font-bold text-gray-700 tracking-wide flex items-center justify-center gap-1">
          <span>{message}</span>
        </p>
        <p className="text-[11px] font-extrabold text-[#F66002] tracking-wider uppercase">
          {submessage}
        </p>
      </div>

      {/* Progress Bar Shimmer */}
      <div className="w-36 sm:w-44 h-1.5 bg-gray-100 rounded-full mt-4 overflow-hidden relative border border-gray-200">
        <div className="absolute inset-y-0 bg-gradient-to-r from-[#FFD269] via-[#F66002] to-[#13193B] rounded-full w-20 animate-slide-pulse" />
      </div>
    </div>
  );

  if (fullScreen) {
    return (
      <div className="fixed inset-0 z-50 bg-white/95 backdrop-blur-md flex items-center justify-center">
        {content}
      </div>
    );
  }

  return <div className="min-h-[40vh] flex items-center justify-center">{content}</div>;
}
