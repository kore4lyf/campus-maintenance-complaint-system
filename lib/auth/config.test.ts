jest.mock("better-auth", () => ({
  betterAuth: jest.fn(() => ({
    api: {
      signInEmail: jest.fn(),
      signUpEmail: jest.fn(),
      signOut: jest.fn(),
      getSession: jest.fn(),
    },
  })),
}));

jest.mock("better-auth/adapters/mongodb", () => ({
  mongodbAdapter: jest.fn(() => ({})),
}));

jest.mock("mongoose", () => ({
  __esModule: true,
  default: {
    Schema: class {},
    model: jest.fn(),
    models: {} as Record<string, unknown>,
    connect: jest.fn(),
    connection: { db: null },
  },
}));

jest.mock("better-auth/next-js", () => ({
  nextCookies: jest.fn(() => ({})),
}));

jest.mock("@/lib/db/connection", () => ({
  connect: jest.fn(async () => undefined),
}));

describe("lib/auth/config", () => {
  const ORIGINAL_ENV = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...ORIGINAL_ENV };
    process.env.BETTER_AUTH_SECRET = "x".repeat(40);
    process.env.BETTER_AUTH_URL = "http://localhost:3000";
  });

  afterAll(() => {
    process.env = ORIGINAL_ENV;
  });

  test("rejects when BETTER_AUTH_SECRET is missing", async () => {
    delete process.env.BETTER_AUTH_SECRET;
    const { getAuth } = await import("./config");
    await expect(getAuth()).rejects.toThrow(/BETTER_AUTH_SECRET/);
  });

  test("rejects when BETTER_AUTH_SECRET is too short", async () => {
    process.env.BETTER_AUTH_SECRET = "short";
    const { getAuth } = await import("./config");
    await expect(getAuth()).rejects.toThrow(/BETTER_AUTH_SECRET/);
  });

  test("exports getAuth, getSession, signInEmail, signUpEmail, signOutFromSession", async () => {
    const mod = await import("./config");
    expect(typeof mod.getAuth).toBe("function");
    expect(typeof mod.getSession).toBe("function");
    expect(typeof mod.signInEmail).toBe("function");
    expect(typeof mod.signUpEmail).toBe("function");
    expect(typeof mod.signOutFromSession).toBe("function");
  });
});
