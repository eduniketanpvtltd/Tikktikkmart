"use client";
import React from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api/client";

export default function AdminRidersPage() {
  const qc = useQueryClient();
  const { data: riders = [], isLoading } = useQuery({
    queryKey: ["admin-riders"],
    queryFn: async () => (await apiFetch<any[]>("/api/admin/riders")).data ?? [],
  });

  const setKyc = async (userId: string, kyc_status: "approved" | "rejected" | "suspended") => {
    await apiFetch("/api/admin/riders", {
      method: "POST",
      body: JSON.stringify({ userId, kyc_status }),
    });
    qc.invalidateQueries({ queryKey: ["admin-riders"] });
  };

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-extrabold">Rider KYC & Fleet</h1>
      {isLoading ? (
        <p className="text-sm text-gray-500">Loading riders...</p>
      ) : (
        <div className="bg-white rounded-2xl border overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-gray-50 text-gray-500 uppercase border-b">
              <tr>
                <th className="px-3 py-2.5">Rider</th>
                <th className="px-3 py-2.5">Vehicle</th>
                <th className="px-3 py-2.5">Docs</th>
                <th className="px-3 py-2.5">Status</th>
                <th className="px-3 py-2.5">COD Cash</th>
                <th className="px-3 py-2.5">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {riders.map((r: any) => (
                <tr key={r.user_id}>
                  <td className="px-3 py-2.5">
                    <p className="font-bold">{r.user?.name}</p>
                    <p className="text-gray-500">{r.user?.phone || r.user?.email}</p>
                  </td>
                  <td className="px-3 py-2.5">
                    {r.vehicle_type} · {r.vehicle_no || "—"}
                  </td>
                  <td className="px-3 py-2.5">
                    DL: {r.license_no || "—"} · ID: {r.id_proof_no || "—"}
                  </td>
                  <td className="px-3 py-2.5 uppercase font-bold">{r.kyc_status}</td>
                  <td className="px-3 py-2.5 font-bold">₹{r.cod_balance ?? 0}</td>
                  <td className="px-3 py-2.5 space-x-2">
                    <button
                      type="button"
                      onClick={() => setKyc(r.user_id, "approved")}
                      className="text-green-700 font-bold hover:underline"
                    >
                      Approve
                    </button>
                    <button
                      type="button"
                      onClick={() => setKyc(r.user_id, "rejected")}
                      className="text-red-600 font-bold hover:underline"
                    >
                      Reject
                    </button>
                    <button
                      type="button"
                      onClick={() => setKyc(r.user_id, "suspended")}
                      className="text-amber-700 font-bold hover:underline"
                    >
                      Suspend
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

