jest.mock("mongoose");

import { assignmentSchema } from "./assignment";

beforeEach(() => {
  jest.clearAllMocks();
});

describe("assignmentSchema", () => {
  it("has all expected field definitions", () => {
    const fieldNames = Object.keys(assignmentSchema.paths);
    expect(fieldNames).toContain("complaintId");
    expect(fieldNames).toContain("assignedToTechId");
    expect(fieldNames).toContain("assignedById");
    expect(fieldNames).toContain("assignedAt");
  });

  it("has timestamps enabled", () => {
    expect(assignmentSchema.options?.timestamps).toBe(true);
  });

  it("has no inline indexes", () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- _indexes is an internal Schema property for testing
    expect((assignmentSchema as any)._indexes).toHaveLength(0);
  });
});
