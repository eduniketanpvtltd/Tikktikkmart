"use client";
import React from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api/client";

export default function AdminPayoutsPage() {
  const qc = useQueryClient();
  const { data: payouts = [] } = useQuery({
    queryKey: ["admin-payouts"],
    queryFn: async () => (await apiFetch<any[]>("/api/admin/payouts")).data ?? [],
  });

  const generate = async () => {
    await apiFetch("/api/admin/payouts", { method: "POST", body: JSON.stringify({ action: "generate" }) });
    qc.invalidateQueries({ queryKey: ["admin-payouts"] });
  };

  const markPaid = async (payoutId: string) => {
    await apiFetch("/api/admin/payouts", {
      method: "POST",
      body: JSON.stringify({ action: "mark_paid", payoutId }),
    });
    qc.invalidateQueries({ queryKey: ["admin-payouts"] });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-extrabold">Rider Payouts</h1>
        <button
          type="button"
          onClick={generate}
          className="px-4 py-2 rounded-xl bg-green-600 text-white text-xs font-bold"
        >
          Generate Weekly Payouts
        </button>
      </div>

      <div className="layout-table bg-white rounded-2xl border">
        <table className="w-full text-xs text-left">
          <thead className="bg-gray-50 text-gray-500 uppercase border-b">
            <tr>
              <th className="px-3 py-2.5">Rider</th>
              <th className="px-3 py-2.5">Period</th>
              <th className="px-3 py-2.5">Deliveries</th>
              <th className="px-3 py-2.5">Base</th>
              <th className="px-3 py-2.5">COD Ded.</th>
              <th className="px-3 py-2.5">Net</th>
              <th className="px-3 py-2.5">Status</th>
              <th className="px-3 py-2.5">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {payouts.map((p: any) => (
              <tr key={p.id}>
                <td className="px-3 py-2.5 font-bold">{p.rider?.name || p.rider?.email}</td>
                <td className="px-3 py-2.5">
                  {p.period_start} → {p.period_end}
                </td>
                <td className="px-3 py-2.5">{p.deliveries}</td>
                <td className="px-3 py-2.5">₹{p.base}</td>
                <td className="px-3 py-2.5">₹{p.cod_deduction}</td>
                <td className="px-3 py-2.5 font-bold">₹{p.net}</td>
                <td className="px-3 py-2.5 uppercase font-bold">{p.status}</td>
                <td className="px-3 py-2.5">
                  {p.status !== "paid" && (
                    <button
                      type="button"
                      onClick={() => markPaid(p.id)}
                      className="text-green-700 font-bold hover:underline"
                    >
                      Mark Paid
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

