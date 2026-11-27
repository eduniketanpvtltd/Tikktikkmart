"use client";
import React, { useState } from "react";
import Link from "next/link";
import { rememberCartOrigin } from "@/lib/cartEntry";
import {
  ArrowLeft,
  BadgePercent,
  Bell,
  Bike,
  ChevronRight,
  Gift,
  LogOut,
  MapPin,
  Package,
  Phone,
  ShieldAlert,
  Sparkles,
  Store,
  Ticket,
  Wallet,
} from "lucide-react";
import { useAuth } from "@/components/providers/AppProviders";
import { AccountCommandShortcut } from "@/components/ui/CommandMenu";
import { AccountAvatar } from "@/components/customer/AccountAvatar";
import { showCustomerToast } from "@/components/customer/CustomerFeedback";
import { apiFetch } from "@/lib/api/client";
import { useOptimisticMutation } from "@/lib/ui/useOptimisticMutation";

export default function ProfilePage() {
  const { user, signOut, refreshUser } = useAuth();
  const [draft, setPhone] = useState<string>();
  const phone = draft ?? user?.phone ?? "";
  const [editingPhone, setEditingPhone] = useState(false);
  const [saved, setSaved] = useState(false);
  const [orderAlerts, setOrderAlerts] = useState(true);
  const [offerAlerts, setOfferAlerts] = useState(false);
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
    setSaved(false);
    const ok = await mutation.run("profile-phone", () => () => {}, () =>
      apiFetch("/api/auth/me", {
        method: "PATCH",
        body: JSON.stringify({ phone }),
      })
    );
    if (!ok) return;
    await refreshUser();
    setSaved(true);
    setEditingPhone(false);
    showCustomerToast("Contact number updated");
    setTimeout(() => setSaved(false), 2500);
  };

  const handleInvite = async () => {
    try {
      await navigator.clipboard?.writeText(window.location.origin);
    } catch {}
    showCustomerToast("Invite link copied");
  };

  return (
    <div className="max-w-md mx-auto space-y-3.5 pb-10 text-[#3A2418]">
      {/* Top Bar */}
      <header className="flex items-center gap-3 pt-1">
        <Link
          href="/"
          aria-label="Back to Home"
          className="grid size-10 shrink-0 place-items-center rounded-full border border-[#F0E4D2] bg-white text-[#3A2418] transition-colors hover:bg-[#FBE3CF]"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <h1 className="text-[20px] font-extrabold tracking-tight text-[#3A2418]">Account</h1>
      </header>

      {/* Profile Summary Header */}
      <section className="rounded-2xl border border-[#F0E4D2] bg-white p-4 space-y-3">
        <div className="flex items-center gap-3.5">
          <div className="w-14 h-14 rounded-full bg-[#FBE3CF] text-[#A8421A] font-black text-lg flex items-center justify-center overflow-hidden shrink-0 border-2 border-[#F0E4D2]">
            <AccountAvatar
              src={user.photo_url}
              className="size-full"
              fallback={(user.name?.trim()[0] || "U").toUpperCase()}
            />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-[17px] font-extrabold text-[#3A2418] truncate">
              {user.name || "TIKK TIKK MART Customer"}
            </h2>
            <p className="text-xs text-[#8A7060] truncate">
              {phone ? `${phone} · ` : ""}{user.email}
            </p>
            <span className="inline-block mt-1 text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-[#FBE3CF] text-[#A8421A]">
              {user.role}
            </span>
          </div>
          <button
            type="button"
            onClick={() => setEditingPhone((v) => !v)}
            className="shrink-0 rounded-full border-[1.5px] border-[#A8421A] bg-white px-3.5 py-1 text-xs font-bold text-[#A8421A] transition-colors hover:bg-[#FBE3CF]/50"
          >
            {editingPhone ? "Close" : "Edit"}
          </button>
        </div>

        {(editingPhone || !phone) && (
          <form onSubmit={handleSave} className="space-y-2 pt-3 border-t border-[#F0E4D2]">
            <label className="block text-[11px] font-bold uppercase tracking-wider text-[#8A7060]">
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
                className="px-4 py-2 rounded-xl bg-[#A8421A] hover:bg-[#8E3513] text-white text-xs font-bold uppercase tracking-wider transition-colors"
              >
                {saving ? "Saving…" : saved ? "Saved!" : "Save"}
              </button>
            </div>
          </form>
        )}
      </section>

      {/* Member Perks Card */}
      <section className="relative overflow-hidden rounded-[20px] bg-gradient-to-br from-[#A8421A] to-[#D0662E] p-4 text-white">
        <Wallet
          aria-hidden="true"
          size={92}
          strokeWidth={1.3}
          className="pointer-events-none absolute -right-2 -bottom-4 text-white/15"
        />
        <p className="text-[11px] font-bold uppercase tracking-wider text-[#FFE0CC]">
          Tikk Tikk Pass
        </p>
        <p className="mt-0.5 text-[20px] font-extrabold leading-snug">
          Free delivery above ₹199
        </p>
        <p className="mt-0.5 text-xs text-[#FFE8D8]">
          14-min priority dispatch &amp; member-only deals
        </p>
        <Link
          href="/featured"
          className="mt-3 inline-block rounded-full bg-white px-4 py-1.5 text-xs font-bold text-[#A8421A] transition-opacity hover:opacity-90"
        >
          Shop featured deals
        </Link>
      </section>

      {/* Quick Navigation Rows */}
      <div className="bg-white rounded-2xl border border-[#F0E4D2] divide-y divide-[#F0E4D2] px-3.5 overflow-hidden">
        <Link
          href="/orders"
          className="flex items-center gap-3 py-3 hover:opacity-80 transition-opacity"
        >
          <span className="w-9 h-9 rounded-[10px] bg-[#FBE3CF] text-[#A8421A] flex items-center justify-center shrink-0">
            <Package className="w-4 h-4" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-[#3A2418]">My Orders</p>
            <p className="text-[11px] text-[#8A7060]">Track and review past orders</p>
          </div>
          <ChevronRight className="w-4 h-4 text-[#8A7060]" />
        </Link>

        <Link
          href="/checkout#delivery-address"
          className="flex items-center gap-3 py-3 hover:opacity-80 transition-opacity"
        >
          <span className="w-9 h-9 rounded-[10px] bg-[#FBE3CF] text-[#A8421A] flex items-center justify-center shrink-0">
            <MapPin className="w-4 h-4" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-[#3A2418]">Saved addresses</p>
            <p className="text-[11px] text-[#8A7060]">Manage delivery locations</p>
          </div>
          <ChevronRight className="w-4 h-4 text-[#8A7060]" />
        </Link>

        <Link
          href="/cart"
          onNavigate={rememberCartOrigin}
          className="flex items-center gap-3 py-3 hover:opacity-80 transition-opacity"
        >
          <span className="w-9 h-9 rounded-[10px] bg-[#FBE3CF] text-[#A8421A] flex items-center justify-center shrink-0">
            <Sparkles className="w-4 h-4" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-[#3A2418]">Current Cart</p>
            <p className="text-[11px] text-[#8A7060]">Review selected groceries</p>
          </div>
          <ChevronRight className="w-4 h-4 text-[#8A7060]" />
        </Link>

        <Link
          href="/cart"
          onNavigate={rememberCartOrigin}
          className="flex items-center gap-3 py-3 hover:opacity-80 transition-opacity"
        >
          <span className="w-9 h-9 rounded-[10px] bg-[#FBE3CF] text-[#A8421A] flex items-center justify-center shrink-0">
            <Ticket className="w-4 h-4" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-[#3A2418]">Coupons</p>
            <p className="text-[11px] text-[#8A7060]">Use WELCOME50 on eligible orders</p>
          </div>
          <ChevronRight className="w-4 h-4 text-[#8A7060]" />
        </Link>
      </div>

      {/* Preferences Card */}
      <div className="bg-white rounded-2xl border border-[#F0E4D2] divide-y divide-[#F0E4D2] px-3.5 overflow-hidden">
        <div className="flex items-center gap-3 py-3">
          <span className="w-9 h-9 rounded-[10px] bg-[#FBE3CF] text-[#A8421A] flex items-center justify-center shrink-0">
            <Bell className="w-4 h-4" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-[#3A2418]">Order updates</p>
            <p className="text-[11px] text-[#8A7060]">Live status and rider alerts</p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={orderAlerts}
            aria-label="Order updates"
            onClick={() => setOrderAlerts((v) => !v)}
            className={`relative h-[22px] w-[38px] shrink-0 rounded-full transition-colors ${
              orderAlerts ? "bg-[#A8421A]" : "bg-[#E5D6C2]"
            }`}
          >
            <span
              className={`absolute top-[2px] left-[2px] size-[18px] rounded-full bg-white transition-transform ${
                orderAlerts ? "translate-x-4" : ""
              }`}
            />
          </button>
        </div>

        <div className="flex items-center gap-3 py-3">
          <span className="w-9 h-9 rounded-[10px] bg-[#FBE3CF] text-[#A8421A] flex items-center justify-center shrink-0">
            <BadgePercent className="w-4 h-4" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-[#3A2418]">Offers and deals</p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={offerAlerts}
            aria-label="Offers and deals"
            onClick={() => setOfferAlerts((v) => !v)}
            className={`relative h-[22px] w-[38px] shrink-0 rounded-full transition-colors ${
              offerAlerts ? "bg-[#A8421A]" : "bg-[#E5D6C2]"
            }`}
          >
            <span
              className={`absolute top-[2px] left-[2px] size-[18px] rounded-full bg-white transition-transform ${
                offerAlerts ? "translate-x-4" : ""
              }`}
            />
          </button>
        </div>
      </div>

      {/* Invite Friends Promo Card */}
      <div className="flex items-center gap-3 rounded-2xl border border-[#F5DDB8] bg-[#FFF0DA] p-3.5">
        <Gift aria-hidden="true" className="h-8 w-8 shrink-0 text-[#A8421A]" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-[#3A2418]">Invite friends, get ₹100</p>
          <p className="text-[11px] text-[#8A7060]">They get ₹50 off the first order</p>
        </div>
        <button
          type="button"
          onClick={handleInvite}
          className="shrink-0 rounded-full bg-[#A8421A] px-4 py-1.5 text-xs font-bold text-white transition-colors hover:bg-[#8E3513]"
        >
          Invite
        </button>
      </div>

      <AccountCommandShortcut />

      {/* Workspaces / Operations Navigation */}
      <div className="bg-white rounded-2xl border border-[#F0E4D2] p-4 space-y-2.5">
        <p className="text-[10px] font-bold uppercase tracking-wider text-[#8A7060]">
          Workspaces &amp; Surfaces
        </p>
        <div className="space-y-2">
          <Link
            href="/rider"
            className="flex items-center justify-between p-3 rounded-xl border border-[#F0E4D2] hover:border-[#A8421A]/40 hover:bg-[#FBF6EE] transition-all"
          >
            <div className="flex items-center gap-2.5">
              <Bike className="w-4 h-4 text-[#A8421A]" />
              <span className="text-xs font-bold text-[#3A2418]">Rider Partner App</span>
            </div>
            <ChevronRight className="w-4 h-4 text-[#8A7060]" />
          </Link>

          {(user.role === "store_manager" || user.role === "admin" || user.role === "super_admin") && (
            <Link
              href="/store"
              className="flex items-center justify-between p-3 rounded-xl border border-[#F0E4D2] hover:border-[#A8421A]/40 hover:bg-[#FBF6EE] transition-all"
            >
              <div className="flex items-center gap-2.5">
                <Store className="w-4 h-4 text-[#3A2418]" />
                <span className="text-xs font-bold text-[#3A2418]">Dark Store Operations</span>
              </div>
              <ChevronRight className="w-4 h-4 text-[#8A7060]" />
            </Link>
          )}

          {(user.role === "admin" || user.role === "super_admin") && (
            <Link
              href="/admin"
              className="flex items-center justify-between p-3 rounded-xl border border-[#F0E4D2] hover:border-[#A8421A]/40 hover:bg-[#FBF6EE] transition-all"
            >
              <div className="flex items-center gap-2.5">
                <ShieldAlert className="w-4 h-4 text-[#A8421A]" />
                <span className="text-xs font-bold text-[#3A2418]">Admin Control Panel</span>
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
        className="w-full py-3 rounded-2xl text-[#A8421A] hover:bg-[#FBE3CF]/50 text-xs font-bold uppercase tracking-wider transition-colors flex items-center justify-center gap-2"
      >
        <LogOut className="w-4 h-4" /> Log out
      </button>
    </div>
  );
}
