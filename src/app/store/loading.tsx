import React from "react";
import { Store, Zap } from "lucide-react";

export default function StoreLoading() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-xl max-w-sm w-full text-center space-y-4">
        <div className="w-16 h-16 rounded-2xl bg-blue-50 text-blue-600 border border-blue-200 mx-auto flex items-center justify-center">
          <Store className="w-8 h-8 animate-pulse" />
        </div>
        <div>
          <h3 className="font-black text-lg text-gray-900">Dark Store Operations</h3>
          <p className="text-xs text-gray-500 mt-1">
            Loading store inventory & live picking queue...
          </p>
        </div>
        <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden relative">
          <div className="absolute inset-y-0 bg-blue-600 w-24 rounded-full animate-slide-pulse" />
        </div>
      </div>
    </div>
  );
}
