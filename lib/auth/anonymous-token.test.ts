/**
 * @jest-environment node
 */
import { signAnonymousToken, verifyAnonymousToken } from "./anonymous-token";

const PREVIOUS_ENV = { ...process.env };

beforeEach(() => {
  process.env.BETTER_AUTH_SECRET = "x".repeat(48);
  delete process.env.ANONYMOUS_TOKEN_SECRET;
});

afterEach(() => {
  process.env = { ...PREVIOUS_ENV };
});

describe("signAnonymousToken / verifyAnonymousToken", () => {
  test("round-trips a sign / verify cycle with the same subject", async () => {
    const token = await signAnonymousToken({ userId: "60f1b9c8e7d8e2b1a4f3e2c1" });
    expect(typeof token).toBe("string");
    expect(token.split(".")).toHaveLength(3);
    const claims = await verifyAnonymousToken({ token });
    expect(claims.sub).toBe("60f1b9c8e7d8e2b1a4f3e2c1");
    expect(claims.sid).toMatch(/[0-9a-f-]{16,}/i);
    expect(claims.exp).toBeGreaterThan(claims.iat);
  });

  test("uses ANONYMOUS_TOKEN_SECRET when set", async () => {
    process.env.ANONYMOUS_TOKEN_SECRET = "y".repeat(48);
    const token = await signAnonymousToken({ userId: "60f1b9c8e7d8e2b1a4f3e2c2" });
    const claims = await verifyAnonymousToken({ token });
    expect(claims.sub).toBe("60f1b9c8e7d8e2b1a4f3e2c2");
  });

  test("throws when signature is invalid", async () => {
    const token = await signAnonymousToken({ userId: "60f1b9c8e7d8e2b1a4f3e2c3" });
    const parts = token.split(".");
    parts[2] = "AAAA" + parts[2].slice(4);
    const tampered = parts.join(".");
    await expect(verifyAnonymousToken({ token: tampered })).rejects.toThrow(/invalid/i);
  });

  test("throws when no secret is configured", async () => {
    delete process.env.BETTER_AUTH_SECRET;
    delete process.env.ANONYMOUS_TOKEN_SECRET;
    await expect(signAnonymousToken({ userId: "x" })).rejects.toThrow(/secret/i);
  });

  test("throws when token is malformed", async () => {
    await expect(verifyAnonymousToken({ token: "not-a-jwt" })).rejects.toThrow();
  });
});
