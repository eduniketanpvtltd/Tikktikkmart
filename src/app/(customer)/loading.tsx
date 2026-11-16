import React from "react";
import { Zap } from "lucide-react";

export default function CustomerLoading() {
  return (
    <div className="space-y-5 animate-pulse pb-16">
      {/* 10-Minute Dispatch Shimmer Banner */}
      <div className="bg-gradient-to-r from-orange-100 via-amber-50 to-orange-100 rounded-3xl p-4 flex items-center justify-between border border-orange-200/60 shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-[#F66002] flex items-center justify-center text-white shrink-0">
            <Zap className="w-5 h-5 fill-[#FFD269] text-[#FFD269] animate-bounce" />
          </div>
          <div className="space-y-1.5">
            <div className="h-4 w-44 bg-orange-200/80 rounded-md" />
            <div className="h-3 w-28 bg-orange-200/50 rounded-md" />
          </div>
        </div>
        <div className="h-8 w-20 bg-orange-200/80 rounded-full hidden sm:block" />
      </div>

      {/* Hero Banner Skeleton */}
      <div className="w-full h-36 sm:h-48 bg-gray-200 rounded-3xl" />

      {/* Category Pills Shimmer */}
      <div>
        <div className="h-4 w-32 bg-gray-200 rounded-md mb-3" />
        <div className="grid grid-cols-4 sm:grid-cols-8 gap-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="flex flex-col items-center gap-2">
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gray-200" />
              <div className="h-3 w-12 bg-gray-200 rounded-md" />
            </div>
          ))}
        </div>
      </div>

      {/* Product Shelf Grid Skeleton */}
      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <div className="h-5 w-40 bg-gray-200 rounded-md" />
          <div className="h-4 w-16 bg-gray-200 rounded-md" />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-3">
          {Array.from({ length: 10 }).map((_, i) => (
            <div
              key={i}
              className="bg-white rounded-2xl p-3 border border-gray-100 space-y-2.5 shadow-2xs"
            >
              <div className="w-full h-28 bg-gray-100 rounded-xl" />
              <div className="h-3.5 w-full bg-gray-200 rounded-md" />
              <div className="h-3 w-2/3 bg-gray-100 rounded-md" />
              <div className="flex justify-between items-center pt-2">
                <div className="h-4 w-12 bg-gray-200 rounded-md" />
                <div className="h-7 w-16 bg-orange-100 rounded-lg" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
