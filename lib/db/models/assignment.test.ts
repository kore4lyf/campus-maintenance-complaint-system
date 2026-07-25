import { assignmentSchema } from "./assignment";

beforeEach(() => {
  jest.clearAllMocks();
});

describe("assignmentSchema", () => {
  it("has all expected field definitions", () => {
    const fieldNames = Object.keys(assignmentSchema.fields);
    expect(fieldNames).toContain("complaintId");
    expect(fieldNames).toContain("assignedToTechId");
    expect(fieldNames).toContain("assignedById");
    expect(fieldNames).toContain("assignedAt");
  });

  it("has timestamps enabled", () => {
    expect(assignmentSchema.options?.timestamps).toBe(true);
  });

  it("has no inline indexes", () => {
    expect(assignmentSchema._indexes).toHaveLength(0);
  });
});
