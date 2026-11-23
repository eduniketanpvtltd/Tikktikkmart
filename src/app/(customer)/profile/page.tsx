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
      <div className="max-w-md mx-auto my-12 bg-[var(--white)] rounded-3xl border border-[color:var(--theme-line)] p-8 text-center space-y-4 shadow-sm">
        <div className="w-16 h-16 rounded-full bg-[var(--peach-light)] text-[color:var(--theme-orange-text)] flex items-center justify-center mx-auto text-2xl font-black">
          👤
        </div>
        <h1 className="font-black text-lg text-[color:var(--theme-ink)]">Sign in to your account</h1>
        <p className="text-xs text-[color:var(--theme-muted)]">
          Manage saved delivery addresses, past orders and contact info.
        </p>
        <Link
          href="/login"
          className="inline-block w-full py-3.5 rounded-2xl bg-[var(--theme-orange-fill)] hover:bg-[var(--theme-orange-hover)] text-white font-black text-xs uppercase tracking-wider transition-colors shadow-sm"
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
    <div className="max-w-md mx-auto space-y-4">
      {/* Account Info Card */}
      <div className="bg-[var(--white)] rounded-3xl border border-[color:var(--theme-line)] p-5 space-y-4 shadow-sm">
        <div className="flex items-center gap-3.5">
          <div className="w-14 h-14 rounded-full bg-[var(--navy)] text-[color:var(--theme-on-navy)] font-black text-lg flex items-center justify-center shadow-xs overflow-hidden shrink-0 border-2 border-[color:var(--border-orange)]">
            <AccountAvatar
              src={user.photo_url}
              className="size-full"
              fallback={(user.name?.trim()[0] || "U").toUpperCase()}
            />
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="text-base font-black text-[color:var(--theme-ink)] truncate">
              {user.name || "TIKK TIKK MART Customer"}
            </h1>
            <p className="text-xs text-[color:var(--theme-muted)] truncate">{user.email}</p>
            <span className="inline-block mt-1 text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-[var(--peach-light)] text-[color:var(--theme-orange-text)]">
              Role: {user.role}
            </span>
          </div>
        </div>

        {/* Edit Phone Number */}
        <form onSubmit={handleSave} className="space-y-2 pt-3 border-t border-[color:var(--theme-line)]">
          <label className="block text-[11px] font-black uppercase tracking-wider text-[color:var(--theme-muted)]">
            Delivery Contact Number
          </label>
          <div className="flex gap-2">
            <div className="relative min-w-0 flex-1">
              <Phone className="w-4 h-4 text-[color:var(--theme-muted)] absolute left-3 top-2.5" />
              <input
                type="tel"
                disabled={saving}
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+91 98765 43210"
                className="w-full pl-9 pr-3 py-2 text-xs font-bold rounded-xl border border-[color:var(--theme-line)] focus:outline-none focus:border-[color:var(--border-orange)]"
              />
            </div>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 rounded-xl bg-[var(--theme-orange-fill)] hover:bg-[var(--theme-orange-hover)] text-white text-xs font-black uppercase tracking-wider transition-colors shadow-sm"
            >
              {saving ? "Saving…" : saved ? "Saved!" : "Save"}
            </button>
          </div>
        </form>
      </div>

      <AccountCommandShortcut />

      {/* Quick Navigation Cards */}
      <div className="bg-[var(--white)] rounded-3xl border border-[color:var(--theme-line)] divide-y divide-gray-100 shadow-sm overflow-hidden">
        <Link
          href="/orders"
          className="flex items-center justify-between p-4 hover:bg-[var(--peach-light)] transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[var(--peach-light)] text-[color:var(--theme-orange-text)] flex items-center justify-center">
              <Package className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs sm:text-sm font-black text-[color:var(--theme-ink)]">My Orders</p>
              <p className="text-[11px] text-[color:var(--theme-muted)]">Track and review past orders</p>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-[color:var(--theme-muted)]" />
        </Link>

        <Link
          href="/cart" onNavigate={rememberCartOrigin}
          className="flex items-center justify-between p-4 hover:bg-[var(--peach-light)] transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[var(--peach-light)] text-[color:var(--theme-orange-text)] flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs sm:text-sm font-black text-[color:var(--theme-ink)]">Current Cart</p>
              <p className="text-[11px] text-[color:var(--theme-muted)]">Review selected groceries</p>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-[color:var(--theme-muted)]" />
        </Link>
      </div>

      {/* Workspaces / Operations Navigation */}
      <div className="bg-[var(--white)] rounded-3xl border border-[color:var(--theme-line)] p-5 space-y-3 shadow-sm">
        <p className="text-[10px] font-black uppercase tracking-wider text-[color:var(--theme-muted)]">
          Workspaces & Surfaces
        </p>
        <div className="space-y-2">
          <Link
            href="/rider"
            className="flex items-center justify-between p-3 rounded-2xl border border-[color:var(--theme-line)] hover:border-[color:var(--theme-warning)] hover:bg-[var(--theme-warning-bg)] transition-all"
          >
            <div className="flex items-center gap-2.5">
              <Bike className="w-4 h-4 text-[color:var(--theme-warning)]" />
              <span className="text-xs font-black text-[color:var(--theme-ink)]">Rider Partner App</span>
            </div>
            <ChevronRight className="w-4 h-4 text-[color:var(--theme-muted)]" />
          </Link>

          {(user.role === "store_manager" || user.role === "admin" || user.role === "super_admin") && (
            <Link
              href="/store"
              className="flex items-center justify-between p-3 rounded-2xl border border-[color:var(--theme-line)] hover:border-[color:var(--border-orange)] hover:bg-[var(--peach-light)] transition-all"
            >
              <div className="flex items-center gap-2.5">
                <Store className="w-4 h-4 text-[color:var(--theme-ink)]" />
                <span className="text-xs font-black text-[color:var(--theme-ink)]">Dark Store Operations</span>
              </div>
              <ChevronRight className="w-4 h-4 text-[color:var(--theme-muted)]" />
            </Link>
          )}

          {(user.role === "admin" || user.role === "super_admin") && (
            <Link
              href="/admin"
              className="flex items-center justify-between p-3 rounded-2xl border border-[color:var(--theme-line)] hover:border-purple-400 hover:bg-purple-50/40 transition-all"
            >
              <div className="flex items-center gap-2.5">
                <ShieldAlert className="w-4 h-4 text-purple-600" />
                <span className="text-xs font-black text-[color:var(--theme-ink)]">Admin Control Panel</span>
              </div>
              <ChevronRight className="w-4 h-4 text-[color:var(--theme-muted)]" />
            </Link>
          )}
        </div>
      </div>

      {/* Logout button */}
      <button
        type="button"
        onClick={signOut}
        className="w-full py-3.5 rounded-2xl bg-[var(--white)] border border-[color:var(--theme-danger)] text-[color:var(--theme-danger)] hover:bg-[var(--theme-danger-bg)] text-xs font-black uppercase tracking-wider transition-colors shadow-2xs flex items-center justify-center gap-2"
      >
        <LogOut className="w-4 h-4" /> Sign Out
      </button>
    </div>
  );
}
