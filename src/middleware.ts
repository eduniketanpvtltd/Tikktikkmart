import { NextResponse, type NextRequest } from "next/server";

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const host = (req.headers.get("host") || "").toLowerCase();
  const isStorePortalHost =
    process.env.PORTAL_MODE === "store" ||
    host.startsWith("store.") ||
    host.startsWith("stock.");

  if (isStorePortalHost && pathname === "/") {
    const url = req.nextUrl.clone();
    url.pathname = "/store/inventory";
    return NextResponse.rewrite(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/"],
};
