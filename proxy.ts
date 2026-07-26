import { NextResponse, type NextRequest } from "next/server";
import { getSessionCookie } from "better-auth/cookies";

// Proxy defaults to the Node.js runtime in Next.js 16, so no runtime export is
// required. The proxy is intentionally cheap: it only inspects the session
// cookie to decide between redirect to /sign-in and pass through. Authoritative
// session verification and role gating live in the pages and Route Handlers, in
// lib/auth/dal.ts. See context/architecture.md Route groups and
// docs/specs/0005-complaint-submission.md for the data-near-authorization
// rationale (per Next.js 16 authentication guide "Optimistic checks with
// Proxy (Optional)"). API routes such as /api/complaints are deliberately
// outside the matcher so anonymous paths reach their handler untouched.

const PROTECTED_UI_PREFIXES = ["/admin", "/technician"] as const;

function redirectToSignIn(request: NextRequest): NextResponse {
  const url = new URL("/sign-in", request.url);
  url.searchParams.set(
    "redirect",
    `${request.nextUrl.pathname}${request.nextUrl.search}`,
  );
  return NextResponse.redirect(url);
}

export function proxy(request: NextRequest): NextResponse {
  const { pathname } = request.nextUrl;

  const isProtected = PROTECTED_UI_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );
  if (!isProtected) {
    return NextResponse.next();
  }

  if (!getSessionCookie(request)) {
    return redirectToSignIn(request);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin", "/admin/:path*", "/technician", "/technician/:path*"],
};
