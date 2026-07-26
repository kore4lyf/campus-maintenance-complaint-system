jest.mock("mongoose");

import { accountSchema } from "./account";

beforeEach(() => {
  jest.clearAllMocks();
});

describe("accountSchema", () => {
  it("has all expected field definitions", () => {
    const fieldNames = Object.keys(accountSchema.paths);
    expect(fieldNames).toContain("userId");
    expect(fieldNames).toContain("accountId");
    expect(fieldNames).toContain("providerId");
    expect(fieldNames).toContain("password");
    expect(fieldNames).toContain("accessToken");
    expect(fieldNames).toContain("refreshToken");
    expect(fieldNames).toContain("idToken");
    expect(fieldNames).toContain("accessTokenExpiresAt");
    expect(fieldNames).toContain("refreshTokenExpiresAt");
    expect(fieldNames).toContain("scope");
  });

  it("has timestamps enabled", () => {
    expect(accountSchema.options?.timestamps).toBe(true);
  });
});
