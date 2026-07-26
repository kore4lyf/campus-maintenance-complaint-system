jest.mock("mongoose");

import { reportSchema } from "./report";

beforeEach(() => {
  jest.clearAllMocks();
});

describe("reportSchema", () => {
  it("has all expected field definitions", () => {
    const fieldNames = Object.keys(reportSchema.paths);
    expect(fieldNames).toContain("period");
    expect(fieldNames).toContain("byCategory");
    expect(fieldNames).toContain("byLocation");
    expect(fieldNames).toContain("avgResolutionHrs");
    expect(fieldNames).toContain("slaBreachCount");
  });

  it("has timestamps enabled", () => {
    expect(reportSchema.options?.timestamps).toBe(true);
  });
});
