"use client";
import React, { useState } from "react";
import Link from "next/link";
import { rememberCartOrigin } from "@/lib/cartEntry";
import {
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
import { AccountCommandShortcut } from "@/components/ui/CommandMenu";
import { AccountAvatar } from "@/components/customer/AccountAvatar";
import { apiFetch } from "@/lib/api/client";
import { useOptimisticMutation } from "@/lib/ui/useOptimisticMutation";

export default function ProfilePage() {
  const { user, signOut, refreshUser } = useAuth();
  const [draft, setPhone] = useState<string>();
  const phone = draft ?? user?.phone ?? "";
  const [saved, setSaved] = useState(false);
  const mutation = useOptimisticMutation();
  const saving = mutation.pending.has("profile-phone");

  if (!user) {
    return (
      <div className="max-w-md mx-auto my-12 bg-white rounded-2xl border border-[#F0E4D2] p-8 text-center space-y-4">
        <div className="w-16 h-16 rounded-full bg-[#FBE3CF] text-[#A8421A] flex items-center justify-center mx-auto text-2xl font-black">
          👤
        </div>
        <h1 className="font-black text-lg text-[#3A2418]">Sign in to your account</h1>
        <p className="text-xs text-[#8A7060]">
          Manage saved delivery addresses, past orders and contact info.
        </p>
        <Link
          href="/login"
          className="inline-block w-full py-3.5 rounded-full bg-[#A8421A] hover:bg-[#8E3513] text-white font-black text-xs uppercase tracking-wider transition-colors"
        >
          Continue with Google
        </Link>
      </div>
    );
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const committed = await mutation.run("profile-phone", () => {
      setSaved(true);
      return () => { setPhone(user.phone ?? ""); setSaved(false); };
    }, () => apiFetch("/api/auth/profile", {
      method: "PATCH",
      body: JSON.stringify({ phone }),
    }));
    if (committed) {
      await refreshUser();
      setTimeout(() => setSaved(false), 2000);
    }
  };

  return (
    <div className="max-w-md mx-auto space-y-4 pb-6 text-[#3A2418]">
      <h1 className="px-1 text-xl font-extrabold tracking-tight text-[#3A2418]">Account</h1>

      {/* Account Info Card */}
      <div className="bg-white rounded-2xl border border-[#F0E4D2] p-5 space-y-4">
        <div className="flex items-center gap-3.5">
          <div className="w-14 h-14 rounded-full bg-[#FBE3CF] text-[#A8421A] font-black text-lg flex items-center justify-center overflow-hidden shrink-0 border-2 border-[#F0E4D2]">
            <AccountAvatar
              src={user.photo_url}
              className="size-full"
              fallback={(user.name?.trim()[0] || "U").toUpperCase()}
            />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-base font-black text-[#3A2418] truncate">
              {user.name || "TIKK TIKK MART Customer"}
            </h2>
            <p className="text-xs text-[#8A7060] truncate">{user.email}</p>
            <span className="inline-block mt-1 text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-[#FBE3CF] text-[#A8421A]">
              Role: {user.role}
            </span>
          </div>
        </div>

        {/* Edit Phone Number */}
        <form onSubmit={handleSave} className="space-y-2 pt-3 border-t border-[#F0E4D2]">
          <label className="block text-[11px] font-black uppercase tracking-wider text-[#8A7060]">
            Delivery Contact Number
          </label>
          <div className="flex gap-2">
            <div className="relative min-w-0 flex-1">
              <Phone className="w-4 h-4 text-[#8A7060] absolute left-3 top-2.5" />
              <input
                type="tel"
                disabled={saving}
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+91 98765 43210"
                className="w-full pl-9 pr-3 py-2 text-xs font-bold rounded-xl border border-[#EADBC6] bg-[#FBF6EE] text-[#3A2418] focus:outline-none focus:border-[#A8421A]"
              />
            </div>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 rounded-xl bg-[#A8421A] hover:bg-[#8E3513] text-white text-xs font-black uppercase tracking-wider transition-colors"
            >
              {saving ? "Saving…" : saved ? "Saved!" : "Save"}
            </button>
          </div>
        </form>
      </div>

      <AccountCommandShortcut />

      {/* Quick Navigation Cards */}
      <div className="bg-white rounded-2xl border border-[#F0E4D2] divide-y divide-[#F0E4D2] overflow-hidden">
        <Link
          href="/orders"
          className="flex items-center justify-between p-4 hover:bg-[#FBF6EE] transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#FBE3CF] text-[#A8421A] flex items-center justify-center">
              <Package className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs sm:text-sm font-black text-[#3A2418]">My Orders</p>
              <p className="text-[11px] text-[#8A7060]">Track and review past orders</p>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-[#8A7060]" />
        </Link>

        <Link
          href="/cart" onNavigate={rememberCartOrigin}
          className="flex items-center justify-between p-4 hover:bg-[#FBF6EE] transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#FBE3CF] text-[#A8421A] flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs sm:text-sm font-black text-[#3A2418]">Current Cart</p>
              <p className="text-[11px] text-[#8A7060]">Review selected groceries</p>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-[#8A7060]" />
        </Link>
      </div>

      {/* Workspaces / Operations Navigation */}
      <div className="bg-white rounded-2xl border border-[#F0E4D2] p-5 space-y-3">
        <p className="text-[10px] font-black uppercase tracking-wider text-[#8A7060]">
          Workspaces & Surfaces
        </p>
        <div className="space-y-2">
          <Link
            href="/rider"
            className="flex items-center justify-between p-3 rounded-2xl border border-[#F0E4D2] hover:border-[#A8421A]/40 hover:bg-[#FBF6EE] transition-all"
          >
            <div className="flex items-center gap-2.5">
              <Bike className="w-4 h-4 text-[#A8421A]" />
              <span className="text-xs font-black text-[#3A2418]">Rider Partner App</span>
            </div>
            <ChevronRight className="w-4 h-4 text-[#8A7060]" />
          </Link>

          {(user.role === "store_manager" || user.role === "admin" || user.role === "super_admin") && (
            <Link
              href="/store"
              className="flex items-center justify-between p-3 rounded-2xl border border-[#F0E4D2] hover:border-[#A8421A]/40 hover:bg-[#FBF6EE] transition-all"
            >
              <div className="flex items-center gap-2.5">
                <Store className="w-4 h-4 text-[#3A2418]" />
                <span className="text-xs font-black text-[#3A2418]">Dark Store Operations</span>
              </div>
              <ChevronRight className="w-4 h-4 text-[#8A7060]" />
            </Link>
          )}

          {(user.role === "admin" || user.role === "super_admin") && (
            <Link
              href="/admin"
              className="flex items-center justify-between p-3 rounded-2xl border border-[#F0E4D2] hover:border-[#A8421A]/40 hover:bg-[#FBF6EE] transition-all"
            >
              <div className="flex items-center gap-2.5">
                <ShieldAlert className="w-4 h-4 text-[#A8421A]" />
                <span className="text-xs font-black text-[#3A2418]">Admin Control Panel</span>
              </div>
              <ChevronRight className="w-4 h-4 text-[#8A7060]" />
            </Link>
          )}
        </div>
      </div>

      {/* Logout button */}
      <button
        type="button"
        onClick={signOut}
        className="w-full py-3.5 rounded-2xl bg-white border border-[#A8421A]/35 text-[#A8421A] hover:bg-[#FBE3CF]/50 text-xs font-black uppercase tracking-wider transition-colors flex items-center justify-center gap-2"
      >
        <LogOut className="w-4 h-4" /> Sign Out
      </button>
    </div>
  );
}
