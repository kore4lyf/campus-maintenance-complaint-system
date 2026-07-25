import { userSchema } from "./user";

beforeEach(() => {
  jest.clearAllMocks();
});

describe("userSchema", () => {
  it("has all expected field definitions", () => {
    const fieldNames = Object.keys(userSchema.fields);
    expect(fieldNames).toContain("email");
    expect(fieldNames).toContain("passwordHash");
    expect(fieldNames).toContain("name");
    expect(fieldNames).toContain("role");
    expect(fieldNames).toContain("anonymousId");
  });

  it("has timestamps enabled", () => {
    expect(userSchema.options?.timestamps).toBe(true);
  });

  it("has no inline indexes", () => {
    expect(userSchema._indexes).toHaveLength(0);
  });
});
