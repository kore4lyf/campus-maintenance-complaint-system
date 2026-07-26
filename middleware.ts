import { NextRequest, NextResponse } from "next/server";
import { getSessionCookie } from "better-auth/cookies";
import { getAuth } from "@/lib/auth/config";

// Tell Next.js 16 this middleware runs on the Node.js runtime so Mongoose and
// BetterAuth's auth.api.getSession can execute. Edge runtime cannot issue the
// database call that getSession makes on a cold cache.
export const runtime = "nodejs";

const PROTECTED_PREFIXES = [
  "/admin",
  "/technician",
  "/api/admin",
  "/api/technician",
  "/api/complaints",
] as const;

const ROLE_PREFIX_MAP: Record<string, "dicht_admin" | "dicht_technician" | null> = {
  "/admin": "dicht_admin",
  "/technician": "dicht_technician",
  "/api/admin": "dicht_admin",
  "/api/technician": "dicht_technician",
  "/api/complaints": null,
};

function resolveRequiredRole(pathname: string): "dicht_admin" | "dicht_technician" | null | undefined {
  let required: "dicht_admin" | "dicht_technician" | null | undefined;
  for (const prefix of PROTECTED_PREFIXES) {
    if (pathname === prefix || pathname.startsWith(`${prefix}/`)) {
      required = ROLE_PREFIX_MAP[prefix];
      break;
    }
  }
  return required;
}

function isProtectedPath(pathname: string): boolean {
  return resolveRequiredRole(pathname) !== undefined;
}

function normalizeRole(value: unknown): "reporter" | "dicht_admin" | "dicht_technician" | null {
  if (
    value === "reporter" ||
    value === "dicht_admin" ||
    value === "dicht_technician"
  ) {
    return value;
  }
  return null;
}

async function loadSessionRole(
  request: NextRequest,
): Promise<"reporter" | "dicht_admin" | "dicht_technician" | null> {
  if (!getSessionCookie(request)) {
    return null;
  }
  try {
    const auth = await getAuth();
    const session = await auth.api.getSession({
      headers: new Headers(request.headers),
    });
    const userRole = (session?.user as { role?: unknown } | undefined)?.role;
    return normalizeRole(userRole);
  } catch {
    return null;
  }
}

function redirectToSignIn(request: NextRequest): NextResponse {
  const url = new URL("/sign-in", request.url);
  url.searchParams.set("redirect", `${request.nextUrl.pathname}${request.nextUrl.search}`);
  return NextResponse.redirect(url);
}

function forbiddenResponse(pathname: string): NextResponse {
  if (pathname.startsWith("/api/")) {
    return new NextResponse(
      JSON.stringify({
        error: { code: "forbidden", message: "Forbidden" },
      }),
      { status: 403, headers: { "content-type": "application/json" } },
    );
  }
  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>403 Forbidden</title>
<meta name="viewport" content="width=device-width, initial-scale=1" />
<style>
  body { font-family: system-ui, sans-serif; max-width: 32rem; margin: 4rem auto; padding: 0 1rem; color: #1f2937; }
  h1 { font-size: 1.25rem; margin-bottom: 0.5rem; }
  p { color: #475569; font-size: 0.95rem; line-height: 1.5; }
  a { color: #16a34a; text-decoration: none; }
  a:hover { text-decoration: underline; }
</style>
</head>
<body>
  <h1>403 \u2014 Access denied</h1>
  <p>Your account does not have permission to view this page. Return to your <a href="/">home page</a> or sign in with a different account.</p>
</body>
</html>`;
  return new NextResponse(html, {
    status: 403,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

export async function middleware(request: NextRequest): Promise<NextResponse> {
  const pathname = request.nextUrl.pathname;

  if (!isProtectedPath(pathname)) {
    return NextResponse.next();
  }

  const required = resolveRequiredRole(pathname);

  if (!getSessionCookie(request)) {
    return redirectToSignIn(request);
  }

  const role = await loadSessionRole(request);
  if (!role) {
    return forbiddenResponse(pathname);
  }

  if (required && role !== required) {
    return forbiddenResponse(pathname);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!api/auth|_next/static|_next/image|favicon.ico|sign-in|sign-up).*)",
  ],
};
