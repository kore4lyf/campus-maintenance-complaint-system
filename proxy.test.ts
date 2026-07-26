const sessionCookieMock = jest.fn();

jest.mock("better-auth/cookies", () => ({
  getSessionCookie: (...args: unknown[]) => sessionCookieMock(...args),
}));

import { NextRequest, NextResponse } from "next/server";
import { proxy } from "./proxy";

function requestFor(pathname: string): NextRequest {
  return new NextRequest(`http://localhost${pathname}`);
}

beforeEach(() => {
  sessionCookieMock.mockReset();
  sessionCookieMock.mockReturnValue(null);
});

describe("proxy", () => {
  test("passes through public paths", () => {
    const res = proxy(requestFor("/complaints/new"));
    expect(res).toBeInstanceOf(NextResponse);
    expect(res.headers.get("location")).toBeNull();
  });

  test("passes through authenticated /admin requests", () => {
    sessionCookieMock.mockReturnValue({ name: "session", value: "abc" });
    const res = proxy(requestFor("/admin/queue"));
    expect(res.headers.get("location")).toBeNull();
  });

  test("redirects unauthenticated /admin to /sign-in", () => {
    const res = proxy(requestFor("/admin/queue"));
    expect(res.status).toBe(307);
    const location = res.headers.get("location") ?? "";
    expect(location).toContain("/sign-in");
    expect(location).toContain("redirect=%2Fadmin%2Fqueue");
  });

  test("redirects unauthenticated /technician to /sign-in", () => {
    const res = proxy(requestFor("/technician/queue/123"));
    expect(res.status).toBe(307);
    const location = res.headers.get("location") ?? "";
    expect(location).toContain("/sign-in");
    expect(location).toContain("redirect=%2Ftechnician%2Fqueue%2F123");
  });

  test("redirects unauthenticated /admin root", () => {
    const res = proxy(requestFor("/admin"));
    expect(res.status).toBe(307);
    expect(res.headers.get("location") ?? "").toContain("/sign-in");
  });

  test("does not redirect API paths that need their own auth", () => {
    const res = proxy(requestFor("/api/complaints/60f1b9c8e7d8e2b1a4f3ed11"));
    expect(res.headers.get("location")).toBeNull();
  });

  test("does not call the DB even when no cookie is present", () => {
    proxy(requestFor("/admin"));
    expect(sessionCookieMock).toHaveBeenCalledTimes(1);
  });
});
