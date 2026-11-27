# Tikk Tikk Mart handoff

**Last updated November 26, 2026 (IST).** Read this first when resuming work. The repository and its working tree are the source of truth. Screenshots and HTML files document past design references.

## Paste this into a new session

> Work in `/Users/akanshachoudharu/Downloads/TikTikMart`. Read `HANDOFF.md`, then run `git status --short --branch` to see the current local edits. Preserve the uncommitted customer and rider changes and continue with my next request. Keep the original logo, shared cart and wishlist state, and existing routes. Verify relevant flows in the browser and give me the preview URL. Push only when I ask.

## Workspace, branch and preview

- **Project** `/Users/akanshachoudharu/Downloads/TikTikMart`. The session may open in `Downloads/TheEduCode-1.2.1-intel`. Set the working directory to TikTikMart before editing or running Git.
- **GitHub** `https://github.com/eduniketanpvtltd/Tikktikkmart.git`. Local `main` and remote `main` both pointed to `8fac32e` when checked. The project has substantial uncommitted customer and rider work. A fresh clone of GitHub will lack those edits. Continue in the same local clone.
- **Preview** [Customer on port 3002](http://localhost:3002), [Rider on port 3002](http://localhost:3002/rider), [Store on port 3002](http://localhost:3002/store), and [Admin on port 3002](http://localhost:3002/admin). Customer and Rider returned HTTP 200 when checked. Rider uses the same Next.js server.
- **Phone preview** `http://10.160.11.2:3002` responded from the Mac at handoff. Connect the phone to the same Wi-Fi and replace the IP if it changes. Find the current address with `ipconfig getifaddr en0` on this Mac. A successful HTTP response confirms the preview is reachable from the Mac. Test sign-in, location and microphone separately on the phone, where secure-context and provider rules can differ.
- **Restart if needed** Run `npm ci` if dependencies are missing, then use the command below. Check `lsof -nP -iTCP:3002 -sTCP:LISTEN` before starting another server. The working server was launched with Node 24.12.0 on this Mac. If the default runtime hits a Next.js or native CSS dependency error, the previously working temporary runtime was `/tmp/tikk-node-runtime/node-v24.12.0-darwin-x64/bin/node`, if still present.
- **Environment** `.env.example` lists the variables. Local credentials are in `.env.local`. Keep credentials and live customer or rider records out of commits and handoffs. README has general setup and the older preview port 3001.

```sh
cd '/Users/akanshachoudharu/Downloads/TikTikMart'
npm run dev -- --hostname 0.0.0.0 --port 3002
```

## Product direction and latest decisions

Tikk Tikk Mart is a mobile-first quick-commerce app. The client's current app and Blinkit were shown as references for shopping flows and perceived polish. Build a distinct Tikk Tikk Mart experience. The current customer visual direction is warm cream, navy text and restrained orange accents. Use the original logo asset `public/logo.png`, fit it without cropping, and keep the actual account or rider photo when it is available. Use subtle interaction feedback and respect reduced motion.

- **Header** The latest home redesign has a logo and wordmark with the account avatar on row one, a separate tappable delivery strip with the current address and actual ETA on row two, and search plus mic on row three. Long addresses truncate before displacing the ETA. Search stays pinned as the upper rows scroll out. The address picker and category header remain part of the existing navigation. Keep the `.customer-logo-tile` target for the splash animation.
- **Footer** The latest revision is a full-width warm cream bar with equal-width **Home · Categories · Orders · Account · Cart** tabs. The selected tab has a small orange underline. Cart is the rightmost tab and has a compact live badge. It retains the exact count in its accessible name and shows `99+` visually for larger counts. Earlier screenshots show a raised center cart and then a navy footer with a large gold button. The user rejected those treatments. The current bar appears below 640px on the regular customer routes and leaves full-screen cart, checkout, product and order detail to their own controls. Categories opens the home aisle section at `/#categories`.
- **Home** Current order is the fresh campaign hero with the first-order offer in its lower strip, then Everyday essentials, Shop by aisle, Good deals this week, and Saved for later when applicable. The feed uses the catalog. The user removed the empty Bank offers block and the old large Shop by category shortcut section in past iterations. Keep current layout decisions when applying old references.
- **Motion** The current home has a subtle hero entrance, timed promo shine, section reveals, animated search suggestions and fly-to-cart. The footer cart is the mobile fly target. The mobile footer takes the place of the separate floating cart when the bar is visible.

## Where to make changes

| Area | Start here |
| --- | --- |
| Customer landing and styling | `src/app/(customer)/page.tsx`, `layout.tsx`, `market.css`, `browse.css`, `src/app/globals.css` |
| Header, footer and splash | `src/components/customer/CustomerHeader.tsx`, `MobileNav.tsx`, `AccountAvatar.tsx`, `FloatingCartBar.tsx`; `src/components/common/SplashScreen.tsx` and `splash.css`. Use `/?splash=1` to replay the splash. |
| Catalog and search | `src/app/(customer)/search/page.tsx`, `featured/page.tsx`, `category/[slug]/page.tsx`; `BrowseView.tsx`, `ProductCard.tsx`, `CatalogImage.tsx` in `src/components/customer/`; `src/lib/catalog/` for matching, queries, categorization and related results. |
| Product detail | `src/app/(customer)/product/[slug]/page.tsx`, `src/components/customer/ProductDetailSections.tsx`, `src/lib/catalog/productMotion.ts` and `related.ts`. Verify variant pricing, stock, quantities, related links and Back here. |
| Cart and checkout | `src/app/(customer)/cart/page.tsx`, `checkout/page.tsx`, `src/components/customer/CartRows.tsx`, `CartSuggestions.tsx`, `src/lib/cartEntry.ts`, `src/lib/pricing/`, `src/app/api/checkout/route.ts`. |
| Account, orders and tracking | `src/app/(customer)/profile/page.tsx`, `orders/page.tsx`, `orders/[id]/page.tsx`, `orders/[id]/tracking.css`; `src/lib/orders/tracking.ts` and `src/components/maps/TrackingMap.tsx`. |
| Rider | `src/app/rider/page.tsx`, `RiderDelivery.tsx`, `RiderHomeSkeleton.tsx`, `home.css`, `earnings/page.tsx`, `src/app/api/rider/`. |
| Store and admin catalog | `src/app/store/`, `src/app/admin/`, corresponding `src/app/api/` handlers, and `supabase/` for database migrations. |

### State, data and existing UI primitives

- This is a React web app using Next.js 15 App Router, React 19, TypeScript, Tailwind v4, Lucide, Zustand and TanStack Query. Firebase handles Google login, Supabase handles persisted data and realtime, Google Maps handles location/map UI, and checkout supports Razorpay and COD. See `TikTikMart_Plan.md` for the original architecture brief.
- Cart and wishlist live in `src/stores/cartStore.ts` and `wishlistStore.ts`. Cart quantities are variant-specific. Use the established stores and API paths when adding UI. Use client estimates for feedback and the API quote for final pricing. Current defaults are free delivery from ₹199, ₹25 standard delivery and ₹4 handling, with store rules and eligible `WELCOME50` applied by pricing and checkout logic. Check live configuration before changing UI copy or billing.
- `src/components/providers/AppProviders.tsx` owns auth and query setup. Search checks scoped and broader catalog sources and displays related items. Recheck the prior **banana** case using a store where it exists. A visible product in the catalog should be searchable from the same scope, with a clear path to broader results when applicable.
- Reuse `src/components/ui/` primitives for sheets, loading, BlurHash previews, commands, undo and code entry. `src/lib/ui/` contains optimistic mutation, intent prefetch, spring and hover aim utilities. `src/lib/api/` contains the request client and idempotency/replay helpers. These utilities exist in the repo. Verify use at the specific call site before claiming that a pattern works app-wide.
- Rider has an unauthenticated/demo flow and a live profile flow. The preview can show demo offers. Real offers and fulfillment depend on the authenticated rider, assignment, store and APIs. Use the authenticated profile photo when available and preserve the loading skeleton. Verify offer acceptance, pickup, delivery and receipt end to end against a test order before claiming a live rollout.

## What is local and what was pushed

| Status at handoff | Scope |
| --- | --- |
| In remote main | `f9afc89` storefront, checkout and tracking; `f4a194a` splash; `8fac32e` rider dashboard redesign and loading improvements. |
| Local, uncommitted | New market storefront and campaign assets, header and cream footer, customer cart/checkout/search/product updates, swipeable sheet and cart motion edits. `src/app/(customer)/market.css`, `public/storefront/essentials/` and `public/storefront/fresh-shop.webp` were untracked. Include intended assets when preparing a future commit. |
| Local, uncommitted | Rider accept-offer and delivery flow updates, RiderDelivery component and preview rider assets, rider skeleton and CSS updates, and API changes for profile, earnings and order step. `src/app/rider/RiderDelivery.tsx` and `public/rider/` were untracked. |
| Unclassified file | An untracked root file named `0` predates this handoff. Leave it alone until its purpose is clear. |

## Verified and still open

- **Verified in desktop Chrome with responsive viewports** The latest header passed at 320, 390, 430 and 1440px, with guest and signed-in fixtures, long address behavior, picker, sticky search and routing. The cream footer passed at 320, 375, 430 and 639px, including link dimensions, keyboard focus, category anchor, Orders active state, live count, Cart routing and hidden desktop state. TypeScript and whitespace checks passed on the latest footer edit.
- **Earlier browser checks** Home motion was checked in default and reduced-motion modes, including the fly effect to the mobile cart target. Temporary Playwright scripts and screenshots were saved in `/tmp/tikk-storefront-check/`, including `header.cjs`, `footer.cjs`, `motion.cjs` and `checkout.cjs`. They are local convenience files and may disappear after a restart. Use browser evidence or reproduce the checks when they are gone.
- **Still to confirm as needed** Client approval of the latest footer and overall design, real-phone interactions, signed-in rider offer-to-delivery, live tracking updates, and a controlled checkout test covering quote, coupon, address and payment. Browser fixture success does not certify those flows.
- **Earlier broad requests** The 20-pattern UX request and whole-app visual audit are historical scope. Presence of a utility does not establish coverage across every route. Browser-back preview, network-failure/rollback behavior and automatic OTP support are examples that need explicit per-flow testing before marking complete.
- **Catalog filling** The user wants to bulk-fill the UI with sample products and real data later. The admin catalog has product and category creation. A bulk sample import was not verified. If requested again, inspect the existing schema, variant and inventory requirements before importing or seeding anything. Keep sample data separate from the live store.
- **Next session** Start with the next user request. Update this file when a meaningful design decision, verification result, open item or push changes. Run `git diff --check`, `npx tsc --noEmit`, and focused browser checks for source edits. For a requested push, review tracked and untracked files first and verify the remote branch after pushing.

## Reference files in Downloads

These local HTML references were found under `/Users/akanshachoudharu/Downloads/` at handoff. Read the applicable file if asked to match its interaction or layout. The current design decisions above reflect newer user feedback.

| Reference file | Relevant screen |
| --- | --- |
| `Quick-commerce UI kit (neutral).html` | Early customer UI kit |
| `Category screens (All, Featured, Dairy, Produce, Snacks, Drinks).html` | Category and department screens |
| `QuickCart.html` | Search page |
| `Product page (neutral UI).html` | Product detail |
| `Order placed + live tracking.html` | Customer confirmation and tracking |
| `splash-v2.html` | Splash animation |
| `Rider app home (redesign).html` | Rider dashboard |
| `Rider app (with accept ride flow).html` | Rider offer and fulfillment interactions |

### Latest storefront refinement

The home feed now uses the campaign carousel, Aisles and a cocoa-colored Market specials collection with a single coupon action. Product cards show pack sizes on their own line, use neutral borders and omit empty ratings. Home product grids use three columns at every width. Everyday essentials and Picked for tonight each show up to nine available products in three rows. Slide photography settles into place and the quantity stepper animates on entry with reduced-motion support.

The latest customer home revision replaces the tiled offers collage with a single WELCOME50 coupon beneath Everyday essentials. The carousel now uses short department names and serif headlines. The home feed keeps the top aisles, two 3×3 product shelves, aisle tabs and saved items. The earlier duplicate category directory and synthetic frequently-bought group are removed.
