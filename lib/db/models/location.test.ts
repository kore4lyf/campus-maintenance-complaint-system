import { locationSchema } from "./location";

beforeEach(() => {
  jest.clearAllMocks();
});

describe("locationSchema", () => {
  it("has all expected field definitions", () => {
    const fieldNames = Object.keys(locationSchema.fields);
    expect(fieldNames).toContain("name");
    expect(fieldNames).toContain("area");
  });

  it("has timestamps enabled", () => {
    expect(locationSchema.options?.timestamps).toBe(true);
  });
});
