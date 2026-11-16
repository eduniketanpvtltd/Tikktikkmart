"use client";
import React, { useState } from "react";
import Link from "next/link";
import {
  User,
  Phone,
  Package,
  MapPin,
  Store,
  Bike,
  ShieldAlert,
  LogOut,
  ChevronRight,
  Sparkles,
} from "lucide-react";
import { useAuth } from "@/components/providers/AppProviders";
import { apiFetch } from "@/lib/api/client";

export default function ProfilePage() {
  const { user, signOut, refreshUser } = useAuth();
  const [phone, setPhone] = useState(user?.phone ?? "");
  const [saved, setSaved] = useState(false);

  if (!user) {
    return (
      <div className="max-w-md mx-auto my-12 bg-white rounded-3xl border border-gray-100 p-8 text-center space-y-4 shadow-sm">
        <div className="w-16 h-16 rounded-full bg-[#fff0e6] text-[#f66002] flex items-center justify-center mx-auto text-2xl font-black">
          👤
        </div>
        <h1 className="font-black text-lg text-gray-900">Sign in to your account</h1>
        <p className="text-xs text-gray-500">
          Manage saved delivery addresses, past orders and contact info.
        </p>
        <Link
          href="/login"
          className="inline-block w-full py-3.5 rounded-2xl bg-[#f66002] hover:bg-[#dd5500] text-white font-black text-xs uppercase tracking-wider transition-colors shadow-sm"
        >
          Continue with Google
        </Link>
      </div>
    );
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await apiFetch("/api/auth/profile", {
      method: "PATCH",
      body: JSON.stringify({ phone }),
    });
    if (res.ok) {
      setSaved(true);
      await refreshUser();
      setTimeout(() => setSaved(false), 2000);
    }
  };

  return (
    <div className="max-w-md mx-auto space-y-4">
      {/* Account Info Card */}
      <div className="bg-white rounded-3xl border border-gray-100 p-5 space-y-4 shadow-sm">
        <div className="flex items-center gap-3.5">
          <div className="w-14 h-14 rounded-full bg-[#13193b] text-[#ffd269] font-black text-lg flex items-center justify-center shadow-xs overflow-hidden shrink-0 border-2 border-[#f66002]">
            {user.photo_url ? (
              <img src={user.photo_url} alt="User" className="w-full h-full object-cover" />
            ) : (
              (user.name ? user.name[0] : "U").toUpperCase()
            )}
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="text-base font-black text-gray-900 truncate">
              {user.name || "TIKK TIKK MART Customer"}
            </h1>
            <p className="text-xs text-gray-500 truncate">{user.email}</p>
            <span className="inline-block mt-1 text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-[#fff0e6] text-[#f66002]">
              Role: {user.role}
            </span>
          </div>
        </div>

        {/* Edit Phone Number */}
        <form onSubmit={handleSave} className="space-y-2 pt-3 border-t border-gray-100">
          <label className="block text-[11px] font-black uppercase tracking-wider text-gray-500">
            Delivery Contact Number
          </label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Phone className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+91 98765 43210"
                className="w-full pl-9 pr-3 py-2 text-xs font-bold rounded-xl border border-gray-200 focus:outline-none focus:border-[#f66002]"
              />
            </div>
            <button
              type="submit"
              className="px-4 py-2 rounded-xl bg-[#f66002] hover:bg-[#dd5500] text-white text-xs font-black uppercase tracking-wider transition-colors shadow-sm"
            >
              {saved ? "Saved!" : "Save"}
            </button>
          </div>
        </form>
      </div>

      {/* Quick Navigation Cards */}
      <div className="bg-white rounded-3xl border border-gray-100 divide-y divide-gray-100 shadow-sm overflow-hidden">
        <Link
          href="/orders"
          className="flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#fff0e6] text-[#f66002] flex items-center justify-center">
              <Package className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs sm:text-sm font-black text-gray-900">My Orders</p>
              <p className="text-[11px] text-gray-500">Track and review past orders</p>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-gray-400" />
        </Link>

        <Link
          href="/cart"
          className="flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#fff4eb] text-[#f66002] flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs sm:text-sm font-black text-gray-900">Current Cart</p>
              <p className="text-[11px] text-gray-500">Review selected groceries</p>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-gray-400" />
        </Link>
      </div>

      {/* Workspaces / Operations Navigation */}
      <div className="bg-white rounded-3xl border border-gray-100 p-5 space-y-3 shadow-sm">
        <p className="text-[10px] font-black uppercase tracking-wider text-gray-400">
          Workspaces & Surfaces
        </p>
        <div className="space-y-2">
          <Link
            href="/rider"
            className="flex items-center justify-between p-3 rounded-2xl border border-gray-100 hover:border-amber-400 hover:bg-amber-50/40 transition-all"
          >
            <div className="flex items-center gap-2.5">
              <Bike className="w-4 h-4 text-amber-600" />
              <span className="text-xs font-black text-gray-800">Rider Partner App</span>
            </div>
            <ChevronRight className="w-4 h-4 text-gray-400" />
          </Link>

          {(user.role === "store_manager" || user.role === "admin" || user.role === "super_admin") && (
            <Link
              href="/store"
              className="flex items-center justify-between p-3 rounded-2xl border border-gray-100 hover:border-blue-400 hover:bg-blue-50/40 transition-all"
            >
              <div className="flex items-center gap-2.5">
                <Store className="w-4 h-4 text-blue-600" />
                <span className="text-xs font-black text-gray-800">Dark Store Operations</span>
              </div>
              <ChevronRight className="w-4 h-4 text-gray-400" />
            </Link>
          )}

          {(user.role === "admin" || user.role === "super_admin") && (
            <Link
              href="/admin"
              className="flex items-center justify-between p-3 rounded-2xl border border-gray-100 hover:border-purple-400 hover:bg-purple-50/40 transition-all"
            >
              <div className="flex items-center gap-2.5">
                <ShieldAlert className="w-4 h-4 text-purple-600" />
                <span className="text-xs font-black text-gray-800">Admin Control Panel</span>
              </div>
              <ChevronRight className="w-4 h-4 text-gray-400" />
            </Link>
          )}
        </div>
      </div>

      {/* Logout button */}
      <button
        type="button"
        onClick={signOut}
        className="w-full py-3.5 rounded-2xl bg-white border border-red-200 text-red-600 hover:bg-red-50 text-xs font-black uppercase tracking-wider transition-colors shadow-2xs flex items-center justify-center gap-2"
      >
        <LogOut className="w-4 h-4" /> Sign Out
      </button>
    </div>
  );
}
