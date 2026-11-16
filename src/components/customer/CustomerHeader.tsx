"use client";
import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  MapPin,
  Search,
  User,
  ChevronDown,
  X,
  Zap,
  Mic,
  Compass,
  Sparkles,
  ShoppingCart,
  ShieldAlert,
} from "lucide-react";
import { useCartStore } from "@/stores/cartStore";
import { useAuth } from "@/components/providers/AppProviders";
import { LocationPicker } from "@/components/maps/LocationPicker";

const SEARCH_PLACEHOLDERS = [
  'Search "milk, bread, butter"',
  'Search "chips & munchies"',
  'Search "chilled cold drinks"',
  'Search "atta, rice & dal"',
  'Search "maggi noodles"',
  'Search "fresh tomatoes & onions"',
  'Search "eggs & breakfast"',
];

const CATEGORY_CHIPS = [
  { label: "All Items", slug: "", icon: "⚡" },
  { label: "Dairy & Breakfast", slug: "dairy-bread-eggs", icon: "🥛" },
  { label: "Fresh Veggies & Fruits", slug: "vegetables-fruits", icon: "🥦" },
  { label: "Munchies & Snacks", slug: "munchies-snacks", icon: "🍿" },
  { label: "Cold Drinks & Juices", slug: "cold-drinks-juices", icon: "🥤" },
  { label: "Atta, Rice & Dal", slug: "atta-rice-dal", icon: "🍚" },
  { label: "Instant Food", slug: "instant-frozen", icon: "🍜" },
];

export function CustomerHeader({ showSearch = true }: { showSearch?: boolean }) {
  const router = useRouter();
  const { items, location, etaMinutes, serviceable, setServiceability } = useCartStore();
  const { user } = useAuth();
  const [openPicker, setOpenPicker] = useState(false);
  const [checking, setChecking] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [placeholderIndex, setPlaceholderIndex] = useState(0);

  const cartCount = items.reduce((sum, i) => sum + i.quantity, 0);
  const cartTotal = items.reduce((sum, i) => sum + i.price * i.quantity, 0);

  // Cycling search placeholder
  useEffect(() => {
    const interval = setInterval(() => {
      setPlaceholderIndex((prev) => (prev + 1) % SEARCH_PLACEHOLDERS.length);
    }, 2400);
    return () => clearInterval(interval);
  }, []);

  const handleSelectLocation = async (coords: {
    lat: number;
    lng: number;
    address: string;
    city?: string;
  }) => {
    setChecking(true);
    try {
      const res = await fetch(`/api/serviceability?lat=${coords.lat}&lng=${coords.lng}`);
      const json = await res.json();
      if (json?.ok && json.data?.serviceable) {
        setServiceability({
          location: { lat: coords.lat, lng: coords.lng, address: coords.address, city: coords.city },
          serviceable: true,
          storeId: json.data.storeId,
          storeName: json.data.storeName,
          etaMinutes: json.data.etaMinutes,
        });
      } else {
        setServiceability({
          location: { lat: coords.lat, lng: coords.lng, address: coords.address, city: coords.city },
          serviceable: false,
        });
      }
    } finally {
      setChecking(false);
    }
  };

  const onSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchText.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchText.trim())}`);
    }
  };

  return (
    <>
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-gray-100 shadow-[0_2px_14px_rgba(19,25,59,0.04)]">
        {/* Top Announcement Bar */}
        <div className="bg-[#13193b] text-white text-[11px] font-bold py-1.5 px-4 text-center tracking-tight flex items-center justify-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-[#ffd269]" />
          <span>Last Minute Saver · 10-Minute Delivery · Use </span>
          <span className="bg-[#f66002] text-white px-1.5 py-0.2 rounded font-black tracking-wider text-[10px]">
            WELCOME50
          </span>
          <span> for ₹50 OFF</span>
        </div>

        <div className="max-w-6xl mx-auto px-2.5 sm:px-5 py-2 sm:py-3 space-y-2">
          {/* Main Top Bar */}
          <div className="flex items-center justify-between gap-1.5 sm:gap-4 w-full min-w-0">
            {/* Brand Logo & Wordmark */}
            <Link href="/" className="shrink-0 flex items-center gap-1.5 sm:gap-2.5 select-none group min-w-0">
              <img
                src="/logo.png"
                alt="TIKK TIKK MART"
                width={38}
                height={38}
                style={{ width: "38px", height: "38px" }}
                className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl object-contain shadow-xs group-hover:scale-105 transition-transform shrink-0"
              />
              <div className="flex flex-col min-w-0">
                <span className="font-black text-xs sm:text-base lg:text-lg tracking-tighter leading-none text-[#13193b] whitespace-nowrap">
                  TIKK TIKK <span className="text-[#f66002]">MART</span>
                </span>
                <span className="hidden sm:block text-[9px] sm:text-[10px] font-black text-[#f66002] tracking-wider uppercase mt-0.5 whitespace-nowrap">
                  — Last Minute Saver —
                </span>
              </div>
            </Link>

            {/* Vertical Divider (Desktop) */}
            <div className="h-7 w-[1px] bg-gray-200 hidden lg:block shrink-0" />

            {/* Delivery Location Trigger (Flexible & Auto-Truncating) */}
            <button
              type="button"
              onClick={() => setOpenPicker(true)}
              className="flex items-center gap-1.5 sm:gap-2 text-left hover:bg-gray-50/80 px-1.5 sm:px-2.5 py-1 sm:py-1.5 rounded-2xl transition-all cursor-pointer group border border-transparent hover:border-gray-200 min-w-0 shrink flex-1 max-w-[145px] xs:max-w-[185px] sm:max-w-[220px]"
            >
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-[#fff0e6] text-[#f66002] flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                <Zap className="w-3.5 h-3.5 sm:w-4 sm:h-4 fill-[#f66002]" />
              </div>
              <div className="flex flex-col min-w-0 text-left">
                <div className="flex items-center gap-0.5 sm:gap-1 leading-tight">
                  <span className="font-black text-[11px] sm:text-xs md:text-sm text-gray-900 tracking-tight whitespace-nowrap">
                    {serviceable === true
                      ? `Delivery in ${etaMinutes || 10}m`
                      : "10 Mins ⚡"}
                  </span>
                  <ChevronDown className="w-3 h-3 text-gray-400 group-hover:text-gray-700 transition-colors shrink-0" />
                </div>
                <div className="flex items-center gap-1 mt-0.5 min-w-0">
                  <MapPin className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-[#f66002] shrink-0" />
                  <p className="text-[10px] sm:text-[11px] text-gray-600 font-medium truncate max-w-[65px] xs:max-w-[95px] sm:max-w-[130px]">
                    {location?.address ? location.address : "Set location"}
                  </p>
                  {serviceable === false && (
                    <span className="text-[8px] sm:text-[9px] font-black text-red-600 bg-red-50 border border-red-200 px-1 rounded shrink-0">
                      Unserviceable
                    </span>
                  )}
                </div>
              </div>
            </button>

            {/* Search Bar: Inline on Large Desktop */}
            {showSearch && (
              <div className="hidden lg:flex flex-1 max-w-sm xl:max-w-md mx-2">
                <form onSubmit={onSearchSubmit} className="relative w-full">
                  <div className="relative flex items-center">
                    <Search className="w-4 h-4 text-gray-400 absolute left-3.5 pointer-events-none" />
                    <input
                      type="text"
                      value={searchText}
                      onChange={(e) => setSearchText(e.target.value)}
                      placeholder={SEARCH_PLACEHOLDERS[placeholderIndex]}
                      className="w-full pl-10 pr-9 py-2 text-xs sm:text-sm font-medium rounded-2xl bg-gray-50/90 border border-gray-200 focus:bg-white focus:border-[#f66002] focus:ring-2 focus:ring-[#f66002]/15 focus:outline-none transition-all placeholder:text-gray-400 shadow-2xs"
                    />
                    {searchText ? (
                      <button
                        type="button"
                        onClick={() => setSearchText("")}
                        className="absolute right-3 text-gray-400 hover:text-gray-600 p-0.5"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    ) : (
                      <div className="absolute right-3 text-gray-400 pointer-events-none flex items-center gap-1">
                        <Mic className="w-3.5 h-3.5" />
                      </div>
                    )}
                  </div>
                </form>
              </div>
            )}

            {/* Right Actions: Roles, Profile, and Cart (Always Visible & Anchored) */}
            <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0 ml-auto">
              {/* Partner Badges */}
              {user && (user.role === "admin" || user.role === "super_admin") && (
                <Link
                  href="/admin"
                  className="text-[10px] font-black px-2 py-1 rounded-xl bg-purple-50 text-purple-700 border border-purple-200 hover:bg-purple-100 hidden xl:inline-flex items-center"
                >
                  Admin
                </Link>
              )}

              {user && (user.role === "store_manager" || user.role === "admin" || user.role === "super_admin") && (
                <Link
                  href="/store"
                  className="text-[10px] font-black px-2 py-1 rounded-xl bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 hidden xl:inline-flex items-center"
                >
                  Store
                </Link>
              )}

              {user && (
                <Link
                  href="/rider"
                  className="text-[10px] font-black px-2 py-1 rounded-xl bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100 hidden xl:inline-flex items-center"
                >
                  Rider
                </Link>
              )}

              {/* User Account / Profile Button */}
              {user ? (
                <Link
                  href="/profile"
                  className="flex items-center gap-1.5 p-1 sm:px-2.5 sm:py-1.5 rounded-2xl bg-gray-50 hover:bg-[#fff0e6] border border-gray-200/80 hover:border-[#f66002]/40 transition-all text-xs font-bold text-gray-800 shadow-2xs group cursor-pointer shrink-0"
                  title="My Account"
                >
                  <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-[#13193b] text-[#ffd269] flex items-center justify-center font-black text-xs shadow-xs overflow-hidden ring-2 ring-[#f66002]/30 group-hover:ring-[#f66002] transition-all shrink-0">
                    {user.photo_url ? (
                      <img src={user.photo_url} alt={user.name || "User"} className="w-full h-full object-cover" />
                    ) : (
                      (user.name ? user.name[0] : "U").toUpperCase()
                    )}
                  </div>
                  <div className="hidden sm:flex flex-col text-left leading-tight">
                    <span className="font-black text-gray-900 text-xs truncate max-w-[75px]">
                      {user.name?.split(" ")[0] || "Account"}
                    </span>
                    <span className="text-[9px] text-gray-400 font-medium group-hover:text-[#f66002] transition-colors">
                      Profile ▾
                    </span>
                  </div>
                </Link>
              ) : (
                <Link
                  href="/login"
                  className="flex items-center gap-1 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-2xl bg-white hover:bg-orange-50/60 border border-gray-200 hover:border-[#f66002]/40 text-xs font-black text-gray-800 hover:text-[#f66002] transition-all shadow-2xs cursor-pointer active:scale-95 shrink-0"
                >
                  <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-gray-100 text-gray-600 flex items-center justify-center">
                    <User className="w-3 h-3 sm:w-3.5 sm:h-3.5 stroke-[2.5]" />
                  </div>
                  <span className="text-xs font-black">Login</span>
                </Link>
              )}

              {/* Mobile Cart Button (Compact Icon + Badge) */}
              <Link
                href="/cart"
                className="flex sm:hidden w-8 h-8 rounded-2xl bg-[#f66002] hover:bg-[#dd5500] text-white items-center justify-center relative shadow-xs shrink-0 active:scale-95"
                title="View Cart"
              >
                <ShoppingCart className="w-4 h-4" />
                {cartCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-[#13193b] text-[#ffd269] text-[9px] font-black w-4 h-4 rounded-full flex items-center justify-center border-2 border-white shadow-xs">
                    {cartCount}
                  </span>
                )}
              </Link>

              {/* Desktop / Tablet Cart CTA Button */}
              <Link
                href="/cart"
                className={`hidden sm:flex items-center gap-2 px-3 sm:px-3.5 py-1.5 sm:py-2 rounded-2xl font-black text-xs uppercase tracking-wider transition-all shadow-sm active:scale-95 shrink-0 ${
                  cartCount > 0
                    ? "bg-[#f66002] hover:bg-[#dd5500] text-white shadow-orange-500/20"
                    : "bg-gray-100 hover:bg-gray-200 text-gray-700"
                }`}
              >
                <div className="relative">
                  <ShoppingCart className="w-4 h-4" />
                  {cartCount > 0 && (
                    <span className="absolute -top-2 -right-2.5 bg-[#13193b] text-[#ffd269] text-[9px] font-black w-4 h-4 rounded-full flex items-center justify-center border-2 border-white">
                      {cartCount}
                    </span>
                  )}
                </div>
                <span>{cartCount > 0 ? `₹${cartTotal}` : "Cart"}</span>
              </Link>
            </div>
          </div>

          {/* Search Bar for Mobile & Tablet (Below Header Row) */}
          {showSearch && (
            <div className="block lg:hidden pt-0.5">
              <form onSubmit={onSearchSubmit} className="relative w-full">
                <div className="relative flex items-center">
                  <Search className="w-4 h-4 text-gray-400 absolute left-3.5 pointer-events-none" />
                  <input
                    type="text"
                    value={searchText}
                    onChange={(e) => setSearchText(e.target.value)}
                    placeholder={SEARCH_PLACEHOLDERS[placeholderIndex]}
                    className="w-full pl-10 pr-9 py-2.5 text-xs font-medium rounded-2xl bg-gray-50 border border-gray-200 focus:bg-white focus:border-[#f66002] focus:ring-2 focus:ring-[#f66002]/15 focus:outline-none transition-all placeholder:text-gray-400 shadow-2xs"
                  />
                  {searchText ? (
                    <button
                      type="button"
                      onClick={() => setSearchText("")}
                      className="absolute right-3 text-gray-400 hover:text-gray-600 p-0.5"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  ) : (
                    <div className="absolute right-3 text-gray-400 pointer-events-none flex items-center gap-1">
                      <Mic className="w-3.5 h-3.5" />
                    </div>
                  )}
                </div>
              </form>
            </div>
          )}

          {/* Quick Category Chips Strip */}
          <div className="flex gap-2 overflow-x-auto no-scrollbar pt-1 pb-1 -mx-3 px-3 sm:mx-0 sm:px-0">
            {CATEGORY_CHIPS.map((chip) => {
              const href = chip.slug ? `/category/${chip.slug}` : "/";
              return (
                <Link
                  key={chip.label}
                  href={href}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white border border-gray-200 text-xs font-bold text-gray-700 whitespace-nowrap hover:border-[#f66002] hover:text-[#f66002] hover:bg-[#fff5ed] transition-all shrink-0 shadow-2xs"
                >
                  <span>{chip.icon}</span>
                  <span>{chip.label}</span>
                </Link>
              );
            })}
          </div>
        </div>
      </header>

      {/* Location Picker Modal / Drawer */}
      {openPicker && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-t-3xl sm:rounded-3xl max-w-lg w-full p-5 space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-2">
                <Compass className="w-5 h-5 text-[#f66002]" />
                <h2 className="font-black text-base sm:text-lg text-gray-900">
                  Select Delivery Location
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setOpenPicker(false)}
                className="p-1.5 rounded-full hover:bg-gray-100 text-gray-500"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <LocationPicker
              initialLat={location?.lat ?? 22.5726}
              initialLng={location?.lng ?? 88.3639}
              onSelect={handleSelectLocation}
            />

            <div className="pt-2 border-t flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="text-xs text-gray-600 font-medium text-center sm:text-left">
                {checking ? (
                  <span className="text-[#f66002] font-bold">Checking dark stores nearby...</span>
                ) : serviceable === true ? (
                  <span className="text-[#0c831f] font-bold">
                    ✓ Dark store found! Delivery in {etaMinutes || 10} mins
                  </span>
                ) : serviceable === false ? (
                  <span className="text-red-500 font-bold">
                    ⚠️ Not serviceable yet. Try selecting Park Street, Kolkata.
                  </span>
                ) : (
                  "Move pin or search to set location"
                )}
              </div>
              <button
                type="button"
                onClick={() => setOpenPicker(false)}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-[#f66002] hover:bg-[#dc5400] text-white text-xs font-black uppercase tracking-wider transition-colors shadow-xs"
              >
                Confirm Location
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
