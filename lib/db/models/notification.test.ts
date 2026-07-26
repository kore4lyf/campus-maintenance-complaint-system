jest.mock("mongoose");

import { notificationSchema } from "./notification";

beforeEach(() => {
  jest.clearAllMocks();
});

describe("notificationSchema", () => {
  it("has all expected field definitions", () => {
    const fieldNames = Object.keys(notificationSchema.paths);
    expect(fieldNames).toContain("complaintId");
    expect(fieldNames).toContain("recipientId");
    expect(fieldNames).toContain("type");
    expect(fieldNames).toContain("message");
    expect(fieldNames).toContain("read");
  });

  it("has timestamps enabled", () => {
    expect(notificationSchema.options?.timestamps).toBe(true);
  });

  it("has no inline indexes", () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- _indexes is an internal Schema property for testing
    expect((notificationSchema as any)._indexes).toHaveLength(0);
  });
});
