jest.mock("mongoose");

import { verificationSchema } from "./verification";

beforeEach(() => {
  jest.clearAllMocks();
});

describe("verificationSchema", () => {
  it("has all expected field definitions", () => {
    const fieldNames = Object.keys(verificationSchema.paths);
    expect(fieldNames).toContain("identifier");
    expect(fieldNames).toContain("value");
    expect(fieldNames).toContain("expiresAt");
  });

  it("has timestamps enabled", () => {
    expect(verificationSchema.options?.timestamps).toBe(true);
  });
});
