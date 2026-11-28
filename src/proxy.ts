import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { SESSION_COOKIE_NAME, verifySessionToken } from "@/lib/auth";

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Always allow Next.js internals, static assets, and auth endpoints
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/images") ||
    pathname.startsWith("/ui") ||
    pathname === "/favicon.ico" ||
    pathname.startsWith("/api/auth")
  ) {
    return NextResponse.next();
  }

  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const session = await verifySessionToken(token);

  // Landing page is public
  if (pathname === "/landing") {
    return NextResponse.next();
  }

  // Public booking submission from landing page
  if (pathname === "/api/bookings" && request.method === "POST") {
    return NextResponse.next();
  }

  // Login page: if already logged in, redirect to POS Kasir (/)
  if (pathname === "/login") {
    if (session) {
      return NextResponse.redirect(new URL("/", request.url));
    }
    return NextResponse.next();
  }

  // Root URL: if not authenticated, redirect to landing page
  if (pathname === "/" && !session) {
    const landingUrl = new URL("/landing", request.url);
    return NextResponse.redirect(landingUrl);
  }

  // Any other protected route without active session -> redirect to landing page
  if (!session) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const landingUrl = new URL("/landing", request.url);
    return NextResponse.redirect(landingUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
