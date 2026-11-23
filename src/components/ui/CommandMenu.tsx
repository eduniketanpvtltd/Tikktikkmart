"use client";

import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { useRouter } from "next/navigation";
import { Command, Search } from "lucide-react";
import { SwipeableSheet } from "./SwipeableSheet";
import { rememberCartOrigin } from "@/lib/cartEntry";
import { pointsTowardPanel } from "@/lib/ui/hoverAim";

const commands = [
  { label: "Browse groceries", href: "/", group: "Shop", words: "home all categories" },
  { label: "Featured products", href: "/featured", group: "Shop", words: "offers deals" },
  { label: "Search groceries", href: "/search", group: "Shop", words: "find product" },
  { label: "Dairy", href: "/category/dairy-bread-eggs", group: "Shop", words: "milk butter eggs" },
  { label: "Produce", href: "/category/vegetables-fruits", group: "Shop", words: "vegetables fruits" },
  { label: "Snacks", href: "/category/munchies-snacks", group: "Shop", words: "chips" },
  { label: "Drinks", href: "/category/cold-drinks-juices", group: "Shop", words: "cola beverages" },
  { label: "View cart", href: "/cart", group: "Account", words: "basket bag" },
  { label: "Checkout", href: "/checkout", group: "Account", words: "pay delivery address" },
  { label: "My orders", href: "/orders", group: "Account", words: "track history" },
  { label: "Account", href: "/profile", group: "Account", words: "profile sign in" },
  { label: "Wishlist", href: "/#wishlist-title", group: "Account", words: "favorites saved" },
  { label: "Rider board", href: "/rider", group: "Rider", words: "dispatch deliveries" },
  { label: "Rider earnings", href: "/rider/earnings", group: "Rider", words: "income" },
  { label: "Store orders", href: "/store", group: "Store", words: "packing queue" },
  { label: "Store inventory", href: "/store/inventory", group: "Store", words: "products stock" },
  ...[
    ["Dashboard", ""], ["Orders", "orders"], ["Catalog", "catalog"], ["Stores", "stores"], ["Riders", "riders"],
    ["Marketing", "marketing"], ["Payouts", "payouts"], ["Settings", "settings"],
  ].map(([label, path]) => ({ label: `Admin ${label}`, href: path ? `/admin/${path}` : "/admin", group: "Admin", words: "" })),
];

const openCommandMenu = "tiktikmart:open-command-menu";

export function AccountCommandShortcut() {
  return <button type="button" className="command-account-shortcut"
    onClick={() => window.dispatchEvent(new Event(openCommandMenu))}>
    <Command size={17} aria-hidden="true" /> Command menu
  </button>;
}

function fuzzy(text: string, search: string) {
  const direct = text.indexOf(search);
  if (direct >= 0) return direct;
  let cursor = 0, gap = 20;
  for (const letter of search.replaceAll(" ", "")) {
    const position = text.indexOf(letter, cursor);
    if (position < 0) return Infinity;
    gap += position - cursor;
    cursor = position + 1;
  }
  return gap;
}

export function CommandMenu({ role }: { role?: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const [mac, setMac] = useState(false);
  const [recent, setRecent] = useState<string[]>([]);
  const list = useId();
  const admin = role === "admin" || role === "super_admin";
  const available = commands.filter(({ group }) =>
    group === "Admin" ? admin : group === "Store" ? admin || role === "store_manager" :
      group === "Rider" ? Boolean(role) : true);
  const matching = query.trim()
    ? available.map((command) => ({ command, score: fuzzy(`${command.label} ${command.words}`.toLowerCase(), query.trim().toLowerCase()) }))
      .filter(({ score }) => Number.isFinite(score)).sort((a, b) => a.score - b.score).map(({ command }) => command)
    : [...available].sort((a, b) => Number(recent.includes(b.href)) - Number(recent.includes(a.href)) ||
        (recent.includes(a.href) ? recent.indexOf(a.href) - recent.indexOf(b.href) : 0));

  function show() {
    setActive(0);
    setQuery("");
    try {
      const value: unknown = JSON.parse(localStorage.getItem("ttm-command-recents") ?? "[]");
      if (Array.isArray(value)) setRecent(value.filter((entry): entry is string => typeof entry === "string"));
    } catch {}
    setOpen(true);
  }

  useEffect(() => {
    setMac(/Mac|iPhone|iPad/.test(navigator.platform));
    const keydown = (event: globalThis.KeyboardEvent) => {
      const command = (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k";
      const slash = event.key === "/" && !event.metaKey && !event.ctrlKey &&
        !(event.target instanceof Element && event.target.closest("input, textarea, select, [contenteditable]"));
      if (event.repeat || (!command && !slash) || (document.querySelector("dialog[open]") && !open)) return;
      event.preventDefault();
      if (open) setOpen(false);
      else show();
    };
    window.addEventListener("keydown", keydown);
    window.addEventListener(openCommandMenu, show);
    return () => {
      window.removeEventListener("keydown", keydown);
      window.removeEventListener(openCommandMenu, show);
    };
  }, [open]);

  function go(command: typeof commands[number] | undefined) {
    if (!command) return;
    try { localStorage.setItem("ttm-command-recents", JSON.stringify([command.href, ...recent.filter((url) => url !== command.href)].slice(0, 5))); } catch {}
    if (command.href === "/cart") rememberCartOrigin();
    setOpen(false);
    router.push(command.href);
  }

  function keys(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter") {
      event.preventDefault();
      go(matching[active]);
    } else if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      if (matching.length) setActive((index) => (index + (event.key === "ArrowDown" ? 1 : -1) + matching.length) % matching.length);
    }
  }

  useEffect(() => {
    if (open) document.getElementById(`${list}-${active}`)?.scrollIntoView({ block: "nearest" });
  }, [active, list, open]);

  return (
    <>
      <button type="button" aria-label="Open command menu" aria-keyshortcuts="Meta+K Control+K /"
        title={`Open command menu (${mac ? "⌘K" : "Ctrl+K"})`} className="command-trigger" onClick={show}>
        <Command size={17} aria-hidden="true" /><kbd>{mac ? "⌘K" : "Ctrl+K"}</kbd>
      </button>
      {open && <SwipeableSheet onClose={() => setOpen(false)} labelledBy={`${list}-heading`}>
        <div className="command-panel">
          <h2 id={`${list}-heading`}>Command menu</h2>
          <label className="command-search">
            <Search size={18} aria-hidden="true" />
            <input type="text" data-dialog-initial-focus role="combobox" aria-label="Find a command" aria-controls={list}
              aria-expanded="true" aria-autocomplete="list"
              aria-activedescendant={matching.length ? `${list}-${active}` : undefined}
              placeholder="Find a command…" value={query} onChange={(event) => { setQuery(event.target.value); setActive(0); }}
              onKeyDown={keys} />
          </label>
          <ul id={list} role="listbox" aria-label="Commands">
            {matching.map((command, index) => (
              <li id={`${list}-${index}`} role="option" aria-selected={active === index} key={command.href}
                onMouseDown={(event) => event.preventDefault()} onClick={() => go(command)}>
                <span>{command.label}</span>
                <small>{!query && recent.includes(command.href) ? "Recent" : command.group}</small>
              </li>
            ))}
          </ul>
          {!matching.length && <p role="status">No commands found.</p>}
          <ShortcutHints mac={mac} />
        </div>
      </SwipeableSheet>}
    </>
  );
}

function ShortcutHints({ mac }: { mac: boolean }) {
  const [open, setOpen] = useState(false);
  const panel = useRef<HTMLDivElement>(null);
  const cleanup = useRef<() => void>(() => {});
  useEffect(() => () => cleanup.current(), []);

  return (
    <div className="command-hints"
      onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false); }}>
      <button type="button" aria-expanded={open} onClick={() => setOpen(!open)}
        onPointerEnter={(event) => { if (event.pointerType === "mouse") setOpen(true); }}
        onPointerLeave={(event) => {
          if (event.pointerType !== "mouse") return;
          const origin = { x: event.clientX, y: event.clientY };
          const move = (next: PointerEvent) => {
            if (!panel.current || panel.current.contains(next.target as Node)) { cleanup.current(); return; }
            if (!pointsTowardPanel(origin, { x: next.clientX, y: next.clientY }, panel.current.getBoundingClientRect())) {
              cleanup.current();
              setOpen(false);
            }
          };
          const timeout = window.setTimeout(() => { cleanup.current(); setOpen(false); }, 350);
          document.addEventListener("pointermove", move);
          cleanup.current = () => { document.removeEventListener("pointermove", move); window.clearTimeout(timeout); };
        }}>Shortcuts</button>
      {open && <div ref={panel} className="command-hints-panel" onPointerEnter={() => cleanup.current()}
        onPointerLeave={(event) => { if (!event.currentTarget.parentElement?.contains(event.relatedTarget as Node | null)) setOpen(false); }}>
        <span>Open <kbd>{mac ? "⌘K" : "Ctrl+K"}</kbd> <kbd>/</kbd></span>
        <span>Choose <kbd>↑</kbd><kbd>↓</kbd></span>
        <span>Run <kbd>↵</kbd></span><span>Close <kbd>Esc</kbd></span>
      </div>}
    </div>
  );
}
