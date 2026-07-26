jest.mock("mongoose");

import { sessionSchema } from "./session";

beforeEach(() => {
  jest.clearAllMocks();
});

describe("sessionSchema", () => {
  it("has all expected field definitions", () => {
    const fieldNames = Object.keys(sessionSchema.paths);
    expect(fieldNames).toContain("expiresAt");
    expect(fieldNames).toContain("token");
    expect(fieldNames).toContain("ipAddress");
    expect(fieldNames).toContain("userAgent");
    expect(fieldNames).toContain("userId");
  });

  it("has timestamps enabled", () => {
    expect(sessionSchema.options?.timestamps).toBe(true);
  });
});
