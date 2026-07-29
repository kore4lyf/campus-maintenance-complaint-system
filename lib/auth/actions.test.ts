jest.mock("@/lib/auth/config", () => ({
  getAuth: jest.fn(),
}));

jest.mock("@/lib/db/connection", () => ({
  connect: jest.fn(async () => undefined),
}));

jest.mock("@/lib/db/models/user", () => ({}));
jest.mock("@/lib/db/connection", () => ({
  connect: jest.fn(async () => undefined),
}));

const mockHeaders = new Map<string, string>();
const mockCookieStore = new Map<string, string>();
jest.mock("next/headers", () => ({
  headers: jest.fn(async () => ({
    get: (key: string) => mockHeaders.get(key.toLowerCase()) ?? null,
  })),
  cookies: jest.fn(async () => ({
    has: (name: string) => mockCookieStore.has(name),
    delete: (name: string) => { mockCookieStore.delete(name); },
  })),
}));

jest.mock("next/navigation", () => ({
  redirect: jest.fn((url: string) => {
    throw new Error(`__redirect:${url}`);
  }),
}));

import { signInAction, signUpAction, signOutAction } from "./actions";
import { getAuth } from "@/lib/auth/config";

const getAuthMock = getAuth as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
  mockCookieStore.clear();
});

describe("signInAction", () => {
  test("returns role-based default landing when no redirect param", async () => {
    getAuthMock.mockResolvedValue({
      api: {
        signInEmail: jest.fn(async () => ({
          user: { id: "u1", email: "r@example.com", name: "R", role: "reporter" },
        })),
      },
    });
    const result = await signInAction({ email: "r@example.com", password: "longpass" });
    expect(result).toMatchObject({ ok: true, redirectTo: "/complaints/mine" });
  });

  test("uses admin landing for dicht_admin role", async () => {
    getAuthMock.mockResolvedValue({
      api: {
        signInEmail: jest.fn(async () => ({
          user: { id: "u2", email: "a@example.com", name: "A", role: "dicht_admin" },
        })),
      },
    });
    const result = await signInAction({ email: "a@example.com", password: "longpass" });
    expect(result).toMatchObject({ ok: true, redirectTo: "/admin/queue" });
  });

  test("uses technician landing for dicht_technician role", async () => {
    getAuthMock.mockResolvedValue({
      api: {
        signInEmail: jest.fn(async () => ({
          user: { id: "u3", email: "t@example.com", name: "T", role: "dicht_technician" },
        })),
      },
    });
    const result = await signInAction({ email: "t@example.com", password: "longpass" });
    expect(result).toMatchObject({ ok: true, redirectTo: "/technician/assignments" });
  });

  test("respects redirect param when starts with /", async () => {
    getAuthMock.mockResolvedValue({
      api: {
        signInEmail: jest.fn(async () => ({
          user: { id: "u1", email: "r@example.com", name: "R", role: "reporter" },
        })),
      },
    });
    const result = await signInAction({
      email: "r@example.com",
      password: "longpass",
      redirect: "/complaints/mine?tab=open",
    });
    expect(result).toMatchObject({ ok: true, redirectTo: "/complaints/mine?tab=open" });
  });

  test("ignores external redirect targets", async () => {
    getAuthMock.mockResolvedValue({
      api: {
        signInEmail: jest.fn(async () => ({
          user: { id: "u1", email: "r@example.com", name: "R", role: "reporter" },
        })),
      },
    });
    const result = await signInAction({
      email: "r@example.com",
      password: "longpass",
      redirect: "https://evil.example.com",
    });
    expect(result).toMatchObject({ ok: true, redirectTo: "/complaints/mine" });
  });

  test("returns friendly error on BetterAuth invalid password", async () => {
    getAuthMock.mockResolvedValue({
      api: {
        signInEmail: jest.fn(async () => {
          const err = new Error("Invalid password") as Error & { code?: string };
          err.code = "INVALID_PASSWORD";
          throw err;
        }),
      },
    });
    const result = await signInAction({ email: "r@example.com", password: "wrong" });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toMatch(/at least 8 characters/i);
    }
  });
});

describe("signUpAction", () => {
  test("returns ok with the default reporter landing when BetterAuth creates the user", async () => {
    getAuthMock.mockResolvedValue({
      api: {
        signUpEmail: jest.fn(async () => ({
          user: { id: "u1", email: "new@example.com", name: "New User", role: "reporter" },
        })),
      },
    });
    const result = await signUpAction({
      email: "new@example.com",
      password: "longpass",
      name: "New User",
    });
    expect(result).toMatchObject({ ok: true, redirectTo: "/complaints/mine" });
  });

  test("returns user_already_exists error mapped to friendly copy", async () => {
    getAuthMock.mockResolvedValue({
      api: {
        signUpEmail: jest.fn(async () => {
          const err = new Error("USER_ALREADY_EXISTS") as Error & { code?: string };
          err.code = "USER_ALREADY_EXISTS";
          throw err;
        }),
      },
    });
    const result = await signUpAction({
      email: "dup@example.com",
      password: "longpass",
      name: "Dup",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toMatch(/already exists/i);
    }
  });
});

describe("signOutAction", () => {
  test("redirects to / after BetterAuth signOut", async () => {
    getAuthMock.mockResolvedValue({
      api: { signOut: jest.fn(async () => undefined) },
    });
    await expect(signOutAction()).rejects.toThrow(/__redirect:\//);
  });

  test("still redirects to / even on signOut failure", async () => {
    getAuthMock.mockResolvedValue({
      api: { signOut: jest.fn(async () => { throw new Error("boom"); }) },
    });
    await expect(signOutAction()).rejects.toThrow(/__redirect:\//);
  });
});
