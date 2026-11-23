"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  MapPin, Search, User, ChevronDown, X, Compass, ShoppingCart, CookingPot, CupSoda,
  Grid2X2, Milk, Popcorn, Sandwich, Carrot, Sparkles, Mic, MicOff,
} from "lucide-react";
import { rememberCartOrigin } from "@/lib/cartEntry";
import { apiFetch } from "@/lib/api/client";
import { useCartStore, type SelectedLocation } from "@/stores/cartStore";
import { useAuth } from "@/components/providers/AppProviders";
import { LocationPicker } from "@/components/maps/LocationPicker";
import { showCustomerToast } from "@/components/customer/CustomerFeedback";
import { BrowseTabLink } from "@/components/customer/BrowseTabLink";
import { SwipeableSheet } from "@/components/ui/SwipeableSheet";
import { AccountAvatar } from "@/components/customer/AccountAvatar";
import { browseDepartments, featuredHref } from "@/lib/catalog/browse";
import type { Address } from "@/types/db";

const suggestions = ["atta, dal, coke and more", "milk, bread and eggs", "chips and snacks", "fruits and vegetables"];
const shortcuts = ["Home", "Office", "Other"] as const;
type Shortcut = typeof shortcuts[number];

const categories = [
  { label: "All", href: "/", icon: Grid2X2 },
  { label: "Featured", href: featuredHref, icon: Sparkles, featured: true },
  ...browseDepartments.map(({ label, slug }, index) => ({
    label, href: `/category/${slug}`, icon: [Milk, Carrot, Popcorn, CupSoda][index],
  })),
  { label: "Staples", href: "/category/atta-rice-dal", icon: CookingPot },
  { label: "Instant Food", href: "/category/instant-frozen", icon: Sandwich },
] satisfies { label: string; href: string; icon: typeof Milk; featured?: boolean }[];

interface VoiceRecognition {
  lang: string;
  onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  abort: () => void;
}

function addressShortcut(label: string | null): Shortcut {
  const value = (label ?? "").trim().toLowerCase();
  if (value === "home") return "Home";
  if (value === "office" || value === "work") return "Office";
  return "Other";
}

function HeaderSearchSuggestion({ pathname, scopeLabel, paused }: { pathname: string; scopeLabel?: string; paused: boolean }) {
  const [suggestion, setSuggestion] = useState(suggestions[0]);
  useEffect(() => {
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let timer: number;
    let index = 0;
    let length = suggestions[0].length;
    let deleting = true;

    const tick = () => {
      const current = suggestions[index];
      length += deleting ? -1 : 1;
      setSuggestion(current.slice(0, length));
      let delay = deleting ? 32 : 63;
      if (deleting && length === 0) {
        index = (index + 1) % suggestions.length;
        deleting = false;
        delay = 240;
      } else if (!deleting && length === current.length) {
        deleting = true;
        delay = 1700;
      }
      timer = window.setTimeout(tick, delay);
    };

    const reset = () => {
      window.clearTimeout(timer);
      index = 0;
      length = suggestions[0].length;
      deleting = true;
      setSuggestion(suggestions[0]);
      if (!paused && !scopeLabel && !motion.matches) timer = window.setTimeout(tick, 1700);
    };

    reset();
    motion.addEventListener("change", reset);
    return () => {
      window.clearTimeout(timer);
      motion.removeEventListener("change", reset);
    };
  }, [pathname, paused, scopeLabel]);

  return <span>{scopeLabel ? `Search in ${scopeLabel}` : `Search for ${paused ? suggestions[0] : suggestion}`}</span>;
}

export function CustomerHeader({ showSearch = true }: { showSearch?: boolean }) {
  const router = useRouter();
  const pathname = usePathname();
  const department = browseDepartments.find(({ slug }) => pathname === `/category/${slug}`);
  const searchScope = pathname === featuredHref ? { id: "featured", label: "Featured" } :
    department ? { id: department.slug, label: department.label } : undefined;
  const { items, location, etaMinutes, serviceable, setServiceability } = useCartStore();
  const { user } = useAuth();
  const [stripOpen, setStripOpen] = useState(false);
  const [picker, setPicker] = useState<Shortcut>();
  const [checking, setChecking] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [compact, setCompact] = useState(false);
  const [featuredSelected, setFeaturedSelected] = useState(false);
  const [listening, setListening] = useState(false);
  const locationButton = useRef<HTMLButtonElement>(null);
  const speech = useRef<VoiceRecognition>(null);
  const tabScroller = useRef<HTMLElement>(null);
  const tabTrack = useRef<HTMLDivElement>(null);
  const tabIndicator = useRef<HTMLSpanElement>(null);
  const locationRequest = useRef<AbortController>(null);

  const { data: addresses, isFetching: loadingAddresses } = useQuery({
    queryKey: ["addresses", user?.id],
    enabled: Boolean(user && stripOpen && pathname !== "/cart"),
    queryFn: async () => {
      const result = await apiFetch<Address[]>("/api/addresses");
      if (!result.ok) throw new Error("Saved addresses unavailable");
      return result.data ?? [];
    },
  });

  useEffect(() => {
    if (pathname === "/cart" || pathname === "/search" || pathname.startsWith("/product/") || pathname.startsWith("/orders/")) return;
    let shadow = window.scrollY > 6;
    let collapsed = window.scrollY > 70;
    setScrolled(shadow);
    setCompact(collapsed);
    const update = () => {
      const y = window.scrollY;
      const nextShadow = y > 6;
      // Separate thresholds prevent repeatedly toggling while a swipe settles.
      const nextCollapsed = collapsed ? y >= 54 : y > 70;
      if (nextShadow !== shadow) setScrolled(shadow = nextShadow);
      if (nextCollapsed !== collapsed) setCompact(collapsed = nextCollapsed);
    };
    window.addEventListener("scroll", update, { passive: true });
    return () => window.removeEventListener("scroll", update);
  }, [pathname]);

  useEffect(() => {
    const update = () => setFeaturedSelected(pathname === "/" && window.location.hash === "#featured");
    update();
    window.addEventListener("hashchange", update);
    window.addEventListener("popstate", update);
    return () => {
      window.removeEventListener("hashchange", update);
      window.removeEventListener("popstate", update);
    };
  }, [pathname]);

  useLayoutEffect(() => {
    const rail = tabTrack.current;
    const indicator = tabIndicator.current;
    if (!rail || !indicator) return;

    const measure = () => {
      const selected = rail.querySelector<HTMLElement>('[aria-current="page"]');
      indicator.style.opacity = selected ? "1" : "0";
      if (selected) indicator.style.setProperty("--tab-left", `${selected.offsetLeft + (selected.offsetWidth - 28) / 2}px`);
    };
    measure();
    let width = 0;
    const observer = new ResizeObserver(([entry]) => {
      if (entry.contentRect.width === width) return;
      width = entry.contentRect.width;
      measure();
    });
    observer.observe(rail);
    return () => observer.disconnect();
  }, [pathname, featuredSelected]);


  useEffect(() => () => {
    const recognition = speech.current;
    if (!recognition) return;
    recognition.onend = null;
    recognition.onerror = null;
    recognition.onresult = null;
    recognition.abort();
    speech.current = null;
  }, []);

  useEffect(() => () => locationRequest.current?.abort(), []);

  const cartCount = items.reduce((sum, item) => sum + item.quantity, 0);
  const selectedAddress = addresses?.find((address) => location &&
    (address.line1 === location.address || (address.lat === location.lat && address.lng === location.lng)));
  const selection = location?.label ?? (selectedAddress ? addressShortcut(selectedAddress.label) : undefined);
  const stripVisible = stripOpen && !compact;

  async function chooseLocation(selected: SelectedLocation) {
    locationRequest.current?.abort();
    const controller = new AbortController();
    locationRequest.current = controller;
    setChecking(true);
    try {
      const result = await fetch(`/api/serviceability?lat=${selected.lat}&lng=${selected.lng}`, { signal: controller.signal });
      const json = await result.json();
      if (!result.ok || !json.ok) throw new Error("Location unavailable");
      const data = json.data;
      if (controller.signal.aborted) return;
      setServiceability(data?.serviceable
        ? { location: selected, serviceable: true, storeId: data.storeId, storeName: data.storeName, etaMinutes: data.etaMinutes }
        : { location: selected, serviceable: false });
    } catch {
      if (!controller.signal.aborted) showCustomerToast("Couldn’t check delivery at this location.");
    } finally {
      if (locationRequest.current === controller && !controller.signal.aborted) {
        locationRequest.current = null;
        setChecking(false);
      }
    }
  }

  function selectShortcut(label: Shortcut) {
    const saved = addresses?.find((address) => addressShortcut(address.label) === label
      && typeof address.lat === "number" && typeof address.lng === "number");
    if (!saved || saved.lat == null || saved.lng == null) {
      setPicker(label);
      return;
    }

    void chooseLocation({
      lat: saved.lat, lng: saved.lng, address: saved.line1, city: saved.city ?? undefined, label,
    });
  }

  function searchHref(value = "") {
    const params = new URLSearchParams();
    const query = value.trim();
    if (query) params.set("q", query);
    if (searchScope) params.set("scope", searchScope.id);
    return params.size ? `/search?${params}` : "/search";
  }

  function voiceSearch() {
    if (speech.current) {
      speech.current.abort();
      return;
    }
    const browser = window as Window & {
      SpeechRecognition?: new () => VoiceRecognition;
      webkitSpeechRecognition?: new () => VoiceRecognition;
    };
    const Recognition = browser.SpeechRecognition ?? browser.webkitSpeechRecognition;
    if (!Recognition) {
      router.push(searchHref());
      showCustomerToast("Voice search is unavailable in this browser.");
      return;
    }
    const recognition = new Recognition();
    recognition.lang = navigator.language || "en-IN";
    recognition.onend = () => {
      speech.current = null;
      setListening(false);
    };
    recognition.onerror = (event) => {
      if (event.error !== "aborted") showCustomerToast("Voice search couldn’t hear you. Try typing instead.");
    };
    recognition.onresult = (event) => {
      const transcript = event.results[0]?.[0]?.transcript;
      if (!transcript) return;
      router.push(searchHref(transcript));
    };
    try {
      speech.current = recognition;
      recognition.start();
      setListening(true);
    } catch {
      speech.current = null;
      setListening(false);
      router.push(searchHref());
      showCustomerToast("Voice search couldn’t start.");
    }
  }

  function centerTab(tab: HTMLElement) {
    const scroller = tabScroller.current;
    if (!scroller) return;
    const left = scroller.scrollLeft + tab.getBoundingClientRect().left - scroller.getBoundingClientRect().left
      + (tab.offsetWidth - scroller.clientWidth) / 2;
    scroller.scrollTo({ left, behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth" });
  }

  if (pathname === "/cart" || pathname === "/search" || pathname.startsWith("/product/") || pathname.startsWith("/orders/")) return null;

  return (
    <>
      <header className="customer-header-theme customer-store-header sticky z-40"
        data-shadow={scrolled ? "" : undefined} data-compact={compact ? "" : undefined}
        onKeyDown={(event) => {
          if (event.key === "Escape" && stripVisible) {
            setStripOpen(false);
            locationButton.current?.focus();
          }
        }}
      >
        <div className="customer-header-content mx-auto max-w-5xl">
          <div className="customer-delivery-wrap" inert={compact}>
            <div className="customer-delivery-row">
              <Link href="/" aria-label="Tikk Tikk Mart home" className="customer-logo-link">
                <span className="customer-logo-tile media-frame">
                  <img src="/logo.png" alt="" width={38} height={38} className="media-content media-content--contain" />
                </span>
              </Link>

              <button ref={locationButton} type="button" onClick={() => setStripOpen(!stripOpen)}
                aria-expanded={stripVisible} aria-controls="customer-address-strip" className="customer-delivery-location"
              >
                <span className="customer-delivery-top">
                  <span className="customer-delivery-prefix">{serviceable ? "Delivery in" : "Delivery location"}</span>
                  {serviceable && (
                    <span className="customer-eta">
                      <span aria-hidden="true" className="customer-eta-dot" />
                      <span key={etaMinutes ?? 10} className="customer-eta-update">{etaMinutes ?? 10} min</span>
                    </span>
                  )}
                </span>
                <span className="customer-delivery-address">
                  <MapPin aria-hidden="true" size={14} />
                  <span>{location?.address || "Choose your address"}</span>
                  <ChevronDown aria-hidden="true" size={14} className="customer-address-chevron" data-open={stripVisible ? "" : undefined} />
                </span>
              </button>

              {user && (
                <nav aria-label="Partner tools" className="customer-role-links">
                  {["admin", "super_admin"].includes(user.role) && <Link href="/admin">Admin</Link>}
                  {["store_manager", "admin", "super_admin"].includes(user.role) && <Link href="/store">Store</Link>}
                  <Link href="/rider">Rider</Link>
                </nav>
              )}

              <Link href={user ? "/profile" : "/login"} aria-label={user ? "My account" : "Log in"} className="customer-header-action customer-account">
                <AccountAvatar
                  src={user?.photo_url}
                  className="customer-header-avatar rounded-full"
                  fallback={<User aria-hidden="true" size={22} />}
                />
              </Link>

              <Link href="/cart" onNavigate={rememberCartOrigin} className="customer-header-action customer-header-cart"
                aria-label={cartCount ? `View cart, ${cartCount} ${cartCount === 1 ? "item" : "items"}` : "View cart"}
              >
                <span className="customer-header-cart-tile">
                  <ShoppingCart aria-hidden="true" size={20} />
                </span>
                {cartCount > 0 && <span aria-hidden="true" key={cartCount} className="customer-cart-count">{cartCount}</span>}
              </Link>
            </div>
          </div>

          {showSearch && (
            <div className="customer-search-row">
              <div className="customer-header-search">
                <Link href={searchHref()} className="customer-search-launcher"
                  aria-label={searchScope ? `Search in ${searchScope.label}` : "Search groceries"}>
                  <Search aria-hidden="true" size={20} className="customer-search-icon" />
                  <HeaderSearchSuggestion pathname={pathname} scopeLabel={searchScope?.label} paused={compact} />
                </Link>
                <button type="button" className="customer-header-mic" aria-pressed={listening}
                  aria-label={listening ? "Stop voice search" : "Voice search"} onClick={voiceSearch}
                >
                  <span>{listening ? <MicOff aria-hidden="true" size={18} /> : <Mic aria-hidden="true" size={18} />}</span>
                </button>
              </div>
            </div>
          )}

          <div id="customer-address-strip" className="customer-address-strip" inert={!stripVisible}
            data-open={stripVisible ? "" : undefined} aria-hidden={!stripVisible}
          >
            <div role="group" aria-label="Delivery address shortcuts" className="customer-address-options">
              {shortcuts.map((label) => (
                <button key={label} type="button" aria-pressed={selection === label}
                  disabled={checking || (Boolean(user) && loadingAddresses && !addresses)} onClick={() => selectShortcut(label)}
                >{label}</button>
              ))}
            </div>
          </div>

          <nav ref={tabScroller} aria-label="Browse grocery departments" className="customer-tab-scroller">
            <div ref={tabTrack} className="customer-tab-track">
              {categories.map(({ label, href, icon: Icon, featured }) => {
                const active = (pathname === href && !(href === "/" && featuredSelected))
                  || (featured && pathname === "/" && featuredSelected);
                return (
                  <BrowseTabLink key={href} href={href}
                    onClick={(event) => {
                      if (event.metaKey || event.ctrlKey || event.altKey || event.shiftKey) return;
                      setFeaturedSelected(false);
                      centerTab(event.currentTarget);
                    }}
                    aria-current={active ? "page" : undefined} className="customer-tab"
                  >
                    <span className="customer-tab-slot">
                      <span className="customer-tab-tile">
                        <Icon aria-hidden="true" size={22} />
                        {featured && <span aria-hidden="true" className="customer-tab-new">New</span>}
                      </span>
                    </span>
                    <span className="customer-tab-label">{label}</span>
                  </BrowseTabLink>
                );
              })}
              <span ref={tabIndicator} aria-hidden="true" className="customer-tab-indicator" />
            </div>
          </nav>
        </div>
      </header>

      {picker && (
        <SwipeableSheet onClose={() => setPicker(undefined)} labelledBy="customer-picker-title">
          <div className="customer-header-theme space-y-4 p-5">
            <div className="flex items-center justify-between gap-2 pb-1">
              <h2 id="customer-picker-title" className="flex items-center gap-2 text-base font-bold">
                <Compass aria-hidden="true" size={19} /> Select delivery location
              </h2>
              <button type="button" aria-label="Close location picker" onClick={() => setPicker(undefined)} className="customer-header-action customer-account">
                <X aria-hidden="true" size={20} />
              </button>
            </div>

            <div className="customer-picker-map">
              <LocationPicker
                initialLat={location?.lat ?? 22.5726}
                initialLng={location?.lng ?? 88.3639}
                onSelect={(coords) => { void chooseLocation({ ...coords, label: picker }); }}
              />
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
              <p role="status" className="customer-picker-status text-xs font-semibold">
                {checking ? "Checking delivery availability…" : serviceable === true ? `Delivery in ${etaMinutes ?? 10} min` : serviceable === false ? "Delivery is unavailable here." : "Move the pin or search to set a location."}
              </p>
              <button type="button" onClick={() => setPicker(undefined)} className="customer-picker-confirm min-h-11 rounded-xl px-4 text-sm font-bold">
                Confirm location
              </button>
            </div>
          </div>
        </SwipeableSheet>
      )}
    </>
  );
}
