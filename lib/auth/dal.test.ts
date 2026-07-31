jest.mock("server-only", () => ({}));

jest.mock("react", () => {
  const actual = jest.requireActual("react");
  return {
    ...actual,
    cache: (fn: (...args: unknown[]) => unknown) => fn,
  };
});

jest.mock("next/navigation", () => ({
  redirect: jest.fn((url: string) => {
    throw new Error(`__redirect:${url}`);
  }),
}));

jest.mock("@/lib/auth/config", () => ({
  getSession: jest.fn(),
}));

import {
  getServerSession,
  requireSession,
  requireRole,
  authorizeRole,
} from "./dal";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/config";

const getSessionMock = getSession as jest.Mock;
const redirectMock = redirect as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
  getSessionMock.mockReset();
});

describe("getServerSession", () => {
  test("returns null when BetterAuth yields no session", async () => {
    getSessionMock.mockResolvedValueOnce(null);
    await expect(getServerSession()).resolves.toBeNull();
  });

  test("returns a normalized ServerSession when the session is well-formed", async () => {
    getSessionMock.mockResolvedValueOnce({
      user: {
        id: "60f1b9c8e7d8e2b1a4f3ed88",
        email: "alice@example.com",
        name: "Alice",
        role: "reporter",
      },
    });
    const session = await getServerSession();
    expect(session).toEqual({
      user: {
        id: "60f1b9c8e7d8e2b1a4f3ed88",
        email: "alice@example.com",
        name: "Alice",
        role: "reporter",
      },
    });
  });

  test("falls back to email when name is missing", async () => {
    getSessionMock.mockResolvedValueOnce({
      user: {
        id: "60f1b9c8e7d8e2b1a4f3ed88",
        email: "alice@example.com",
        role: "reporter",
      },
    });
    const session = await getServerSession();
    expect(session?.user.name).toBe("alice@example.com");
  });

  test("returns null when session has no id", async () => {
    getSessionMock.mockResolvedValueOnce({
      user: { email: "alice@example.com", role: "reporter" },
    });
    await expect(getServerSession()).resolves.toBeNull();
  });

  test("returns null when session has no email", async () => {
    getSessionMock.mockResolvedValueOnce({
      user: { id: "60f1b9c8e7d8e2b1a4f3ed88", role: "reporter" },
    });
    await expect(getServerSession()).resolves.toBeNull();
  });

  test("falls back to reporter when role is unknown", async () => {
    getSessionMock.mockResolvedValueOnce({
      user: {
        id: "60f1b9c8e7d8e2b1a4f3ed88",
        email: "alice@example.com",
        role: "guest",
      },
    });
    const result = await getServerSession();
    expect(result).not.toBeNull();
    expect(result?.user.role).toBe("reporter");
  });

  test("returns null when BetterAuth throws", async () => {
    getSessionMock.mockRejectedValueOnce(new Error("boom"));
    await expect(getServerSession()).resolves.toBeNull();
  });
});

describe("requireSession", () => {
  test("redirects to /sign-in when no session", async () => {
    getSessionMock.mockResolvedValueOnce(null);
    await expect(requireSession()).rejects.toThrow(/__redirect:\/sign-in/);
    expect(redirectMock).toHaveBeenCalledWith("/sign-in");
  });

  test("returns the session when one is present", async () => {
    getSessionMock.mockResolvedValueOnce({
      user: {
        id: "60f1b9c8e7d8e2b1a4f3ed88",
        email: "alice@example.com",
        name: "Alice",
        role: "reporter",
      },
    });
    const session = await requireSession();
    expect(session.user.role).toBe("reporter");
  });

  test("supports a custom redirect target", async () => {
    getSessionMock.mockResolvedValueOnce(null);
    await expect(requireSession("/custom-sign-in")).rejects.toThrow(
      /__redirect:\/custom-sign-in/,
    );
    expect(redirectMock).toHaveBeenCalledWith("/custom-sign-in");
  });
});

describe("requireRole", () => {
  test("redirects to / when the role does not match", async () => {
    getSessionMock.mockResolvedValueOnce({
      user: {
        id: "60f1b9c8e7d8e2b1a4f3ed88",
        email: "alice@example.com",
        role: "reporter",
      },
    });
    await expect(requireRole("dicht_admin")).rejects.toThrow(/__redirect:\//);
  });

  test("returns the session when role matches", async () => {
    getSessionMock.mockResolvedValueOnce({
      user: {
        id: "60f1b9c8e7d8e2b1a4f3ed88",
        email: "alice@example.com",
        role: "dicht_admin",
      },
    });
    const session = await requireRole("dicht_admin", "dicht_technician");
    expect(session.user.role).toBe("dicht_admin");
  });

  test("accepts zero allowed list (always blocks)", async () => {
    getSessionMock.mockResolvedValueOnce({
      user: {
        id: "60f1b9c8e7d8e2b1a4f3ed88",
        email: "alice@example.com",
        role: "dicht_admin",
      },
    });
    await expect(requireRole()).rejects.toThrow(/__redirect:\//);
  });
});

describe("authorizeRole", () => {
  const session = {
    user: {
      id: "60f1b9c8e7d8e2b1a4f3ed88",
      email: "alice@example.com",
      name: "Alice",
      role: "dicht_admin" as const,
    },
  };

  test("returns false when session is null", () => {
    expect(authorizeRole(null, "dicht_admin")).toBe(false);
  });

  test("returns true when role is in the allowed list", () => {
    expect(authorizeRole(session, "dicht_admin")).toBe(true);
  });

  test("returns false when role is not in the allowed list", () => {
    expect(authorizeRole(session, "reporter")).toBe(false);
  });
});
