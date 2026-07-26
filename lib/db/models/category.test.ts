jest.mock("mongoose");

import { categorySchema } from "./category";

beforeEach(() => {
  jest.clearAllMocks();
});

describe("categorySchema", () => {
  it("has all expected field definitions", () => {
    const fieldNames = Object.keys(categorySchema.paths);
    expect(fieldNames).toContain("systemType");
    expect(fieldNames).toContain("defaultSeverity");
    expect(fieldNames).toContain("slaAcknowledgeHrs");
    expect(fieldNames).toContain("slaResolveHrs");
  });

  it("has timestamps enabled", () => {
    expect(categorySchema.options?.timestamps).toBe(true);
  });
});
