import React from "react";
import { BrandLoader } from "@/components/common/BrandLoader";

export default function RootLoading() {
  return (
    <div className="min-h-screen bg-[#F4F6F9] flex items-center justify-center">
      <BrandLoader
        message="Delivering fresh groceries in 10 minutes..."
        submessage="TIKK TIKK MART — Last Minute Saver ⚡"
      />
    </div>
  );
}
