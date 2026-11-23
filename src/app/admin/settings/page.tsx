"use client";
import React from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api/client";
import { useAuth } from "@/components/providers/AppProviders";

export default function AdminSettingsPage() {
  const { user: currentUser } = useAuth();
  const qc = useQueryClient();

  const { data } = useQuery({
    queryKey: ["admin-users-logs"],
    queryFn: async () => (await apiFetch<any>("/api/admin/users")).data,
  });

  const updateRole = async (userId: string, role: string) => {
    await apiFetch("/api/admin/users", {
      method: "PATCH",
      body: JSON.stringify({ userId, role }),
    });
    qc.invalidateQueries({ queryKey: ["admin-users-logs"] });
  };

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-extrabold">Users, Roles & Audit Logs</h1>

      <div className="layout-table-section rounded-2xl border bg-white">
        <h2 className="px-4 py-3 font-bold text-sm">Users ({data?.users?.length ?? 0})</h2>
        <div className="layout-table">
          <table className="w-full text-xs text-left">
            <thead className="bg-gray-50 text-gray-500 uppercase border-b">
              <tr>
                <th className="px-3 py-2">Email</th>
                <th className="px-3 py-2">Name</th>
                <th className="px-3 py-2">Role</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {(data?.users ?? []).map((u: any) => (
                <tr key={u.id}>
                  <td className="px-3 py-2 font-medium">{u.email}</td>
                  <td className="px-3 py-2">{u.name || "—"}</td>
                  <td className="px-3 py-2">
                    {currentUser?.role === "super_admin" ? (
                      <select
                        value={u.role}
                        onChange={(e) => updateRole(u.id, e.target.value)}
                        className="border rounded px-2 py-1 bg-white"
                      >
                        <option value="customer">customer</option>
                        <option value="rider">rider</option>
                        <option value="store_manager">store_manager</option>
                        <option value="admin">admin</option>
                        <option value="super_admin">super_admin</option>
                      </select>
                    ) : (
                      <span className="uppercase font-bold">{u.role}</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-white rounded-2xl border p-4 space-y-2">
        <h2 className="font-bold text-sm">Recent Audit Logs</h2>
        <div className="divide-y text-xs">
          {(data?.auditLogs ?? []).map((log: any) => (
            <div key={log.id} className="flex flex-wrap items-baseline justify-between gap-x-2 gap-y-1 py-2">
              <span className="layout-wrap">
                <strong className="uppercase">{log.action}</strong> on <code>{log.entity}</code> ({log.entity_id})
              </span>
              <span className="text-gray-400">{new Date(log.created_at).toLocaleString()}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

