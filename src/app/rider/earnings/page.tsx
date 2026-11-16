"use client";
import React from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { apiFetch } from "@/lib/api/client";
import { useAuth } from "@/components/providers/AppProviders";

export default function RiderEarningsPage() {
  const { user } = useAuth();
  const { data, isLoading } = useQuery({
    queryKey: ["rider-earnings", user?.id],
    enabled: Boolean(user),
    queryFn: async () => {
      const res = await apiFetch<any>("/api/rider/earnings");
      return res.data;
    },
  });

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-lg mx-auto space-y-4">
        <Link href="/rider" className="inline-flex items-center gap-1.5 text-sm font-bold text-gray-700">
          <ArrowLeft className="w-4 h-4" /> Back to Rider Dashboard
        </Link>

        <h1 className="text-xl font-extrabold">Earnings & COD Balance</h1>

        {isLoading ? (
          <p className="text-sm text-gray-500">Loading...</p>
        ) : (
          <>
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-2xs">
                <p className="text-xs text-gray-500 font-medium">Total Earned</p>
                <p className="text-lg font-black text-[#f66002]">₹{data?.totalEarned ?? 0}</p>
              </div>
              <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-2xs">
                <p className="text-xs text-gray-500 font-medium">Deliveries</p>
                <p className="text-lg font-black text-gray-900">{data?.completedCount ?? 0}</p>
              </div>
              <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-2xs">
                <p className="text-xs text-gray-500 font-medium">COD Cash</p>
                <p className="text-lg font-black text-[#13193b]">₹{data?.codBalance ?? 0}</p>
              </div>
            </div>

            <div className="bg-white rounded-2xl border p-4 space-y-2">
              <h2 className="font-bold text-sm">Recent Deliveries</h2>
              {(data?.history ?? []).length === 0 ? (
                <p className="text-xs text-gray-500">No deliveries yet.</p>
              ) : (
                <div className="divide-y">
                  {data.history.map((h: any) => (
                    <div key={h.id} className="py-2 flex items-center justify-between text-xs">
                      <div>
                        <p className="font-bold">Order #{h.order_no}</p>
                        <p className="text-gray-500 uppercase">{h.status.replaceAll("_", " ")}</p>
                      </div>
                      <span className="font-bold">₹{h.grand_total} ({h.payment_method})</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

