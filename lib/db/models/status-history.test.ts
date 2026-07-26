jest.mock("mongoose");

import { statusHistorySchema } from "./status-history";

beforeEach(() => {
  jest.clearAllMocks();
});

describe("statusHistorySchema", () => {
  it("has all expected field definitions", () => {
    const fieldNames = Object.keys(statusHistorySchema.paths);
    expect(fieldNames).toContain("complaintId");
    expect(fieldNames).toContain("fromStatus");
    expect(fieldNames).toContain("toStatus");
    expect(fieldNames).toContain("changedById");
    expect(fieldNames).toContain("changedBySystem");
    expect(fieldNames).toContain("note");
    expect(fieldNames).toContain("photoUrl");
    expect(fieldNames).toContain("changedAt");
  });

  it("has timestamps enabled", () => {
    expect(statusHistorySchema.options?.timestamps).toBe(true);
  });
});
