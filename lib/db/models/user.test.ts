jest.mock("mongoose");

import { userSchema } from "./user";

beforeEach(() => {
  jest.clearAllMocks();
});

describe("userSchema", () => {
  it("has all expected field definitions", () => {
    const fieldNames = Object.keys(userSchema.paths);
    expect(fieldNames).toContain("email");
    expect(fieldNames).toContain("passwordHash");
    expect(fieldNames).toContain("name");
    expect(fieldNames).toContain("role");
  });

  it("has timestamps enabled", () => {
    expect(userSchema.options?.timestamps).toBe(true);
  });

  it("has no inline indexes", () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- _indexes is an internal Schema property for testing
    expect((userSchema as any)._indexes).toHaveLength(0);
  });
});
