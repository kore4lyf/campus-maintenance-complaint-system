import { complaintSchema } from "./complaint";

beforeEach(() => {
  jest.clearAllMocks();
});

describe("complaintSchema", () => {
  it("has all expected field definitions", () => {
    const fieldNames = Object.keys(complaintSchema.fields);
    expect(fieldNames).toContain("reporterId");
    expect(fieldNames).toContain("isAnonymous");
    expect(fieldNames).toContain("categoryId");
    expect(fieldNames).toContain("locationId");
    expect(fieldNames).toContain("description");
    expect(fieldNames).toContain("photoUrls");
    expect(fieldNames).toContain("priority");
    expect(fieldNames).toContain("slaAcknowledgeBy");
    expect(fieldNames).toContain("slaResolveBy");
    expect(fieldNames).toContain("status");
    expect(fieldNames).toContain("escalated");
    expect(fieldNames).toContain("aiSuggestion");
    expect(fieldNames).toContain("parentComplaintId");
  });

  it("has timestamps enabled", () => {
    expect(complaintSchema.options?.timestamps).toBe(true);
  });

  it("has no inline indexes", () => {
    expect(complaintSchema._indexes).toHaveLength(0);
  });
});
