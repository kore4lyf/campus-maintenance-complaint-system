import { complaintSchema, VALID_TRANSITIONS } from "../models/complaint";
import { userSchema } from "../models/user";
import { notificationSchema } from "../models/notification";
import { statusHistorySchema } from "../models/status-history";
import { categorySchema } from "../models/category";

beforeEach(() => {
  jest.clearAllMocks();
});

describe("AC-2: Unique constraints", () => {
  it("users.email has unique constraint", () => {
    const emailField = userSchema.paths["email"] as unknown as Record<string, unknown>;
    expect(emailField).toBeDefined();
    expect(emailField.unique).toBe(true);
  });

  it("categories.systemType has unique constraint", () => {
    const systemTypeField = categorySchema.paths["systemType"] as unknown as Record<string, unknown>;
    expect(systemTypeField).toBeDefined();
    expect(systemTypeField.unique).toBe(true);
  });
});

describe("AC-3: Status transition validation", () => {
  it("defines valid forward transitions", () => {
    expect(VALID_TRANSITIONS["Submitted"]).toEqual(["Acknowledged"]);
    expect(VALID_TRANSITIONS["Acknowledged"]).toEqual(["In Progress"]);
    expect(VALID_TRANSITIONS["In Progress"]).toEqual(["Resolved", "Acknowledged"]);
    expect(VALID_TRANSITIONS["Resolved"]).toEqual(["Closed"]);
    expect(VALID_TRANSITIONS["Closed"]).toEqual([]);
  });

  it("has status field with valid enum values", () => {
    const statusField = complaintSchema.paths["status"] as unknown as Record<string, unknown>;
    expect(statusField).toBeDefined();
    expect(statusField.enum).toEqual([
      "Submitted",
      "Acknowledged",
      "In Progress",
      "Resolved",
      "Closed",
    ]);
    expect(statusField.default).toBe("Submitted");
  });
});

describe("AC-4: Anonymous complaint invariant", () => {
  it("isAnonymous field defaults to false", () => {
    const isAnonymousField = complaintSchema.paths["isAnonymous"] as unknown as Record<string, unknown>;
    expect(isAnonymousField).toBeDefined();
    expect(isAnonymousField.default).toBe(false);
  });

  it("reporterId defaults to null for anonymous complaints", () => {
    const reporterIdField = complaintSchema.paths["reporterId"] as unknown as Record<string, unknown>;
    expect(reporterIdField).toBeDefined();
    expect(reporterIdField.default).toBeNull();
  });
});

describe("AC-5: SLA deadline ordering", () => {
  it("slaAcknowledgeBy is required", () => {
    const slaAckField = complaintSchema.paths["slaAcknowledgeBy"] as unknown as Record<string, unknown>;
    expect(slaAckField).toBeDefined();
    expect(slaAckField.required).toBe(true);
  });

  it("slaResolveBy is required", () => {
    const slaResField = complaintSchema.paths["slaResolveBy"] as unknown as Record<string, unknown>;
    expect(slaResField).toBeDefined();
    expect(slaResField.required).toBe(true);
  });
});

describe("AC-7: Notification required fields", () => {
  it("notifications.complaintId is required", () => {
    const complaintIdField = notificationSchema.paths["complaintId"] as unknown as Record<string, unknown>;
    expect(complaintIdField).toBeDefined();
    expect(complaintIdField.required).toBe(true);
  });

  it("notifications.recipientId is required", () => {
    const recipientIdField = notificationSchema.paths["recipientId"] as unknown as Record<string, unknown>;
    expect(recipientIdField).toBeDefined();
    expect(recipientIdField.required).toBe(true);
  });
});

describe("Schema field completeness", () => {
  it("complaint has all required fields", () => {
    const requiredFields = [
      "reporterId",
      "isAnonymous",
      "categoryId",
      "locationId",
      "description",
      "photoUrls",
      "priority",
      "slaAcknowledgeBy",
      "slaResolveBy",
      "status",
      "escalated",
      "resolvedAt",
      "aiSuggestion",
      "parentComplaintId",
    ];
    for (const field of requiredFields) {
      expect(complaintSchema.paths[field]).toBeDefined();
    }
  });

  it("complaint does NOT have proofPhotoUrl as a stored field", () => {
    expect(complaintSchema.paths["proofPhotoUrl"]).toBeUndefined();
  });

  it("complaint has resolvedAt field", () => {
    const resolvedAtField = complaintSchema.paths["resolvedAt"] as unknown as Record<string, unknown>;
    expect(resolvedAtField).toBeDefined();
  });

  it("statusHistory has photoUrl field", () => {
    const photoUrlField = statusHistorySchema.paths["photoUrl"] as unknown as Record<string, unknown>;
    expect(photoUrlField).toBeDefined();
  });

  it("statusHistory has changedBySystem field", () => {
    const changedBySystemField = statusHistorySchema.paths["changedBySystem"] as unknown as Record<string, unknown>;
    expect(changedBySystemField).toBeDefined();
    expect(changedBySystemField.default).toBe(false);
  });

  it("category has name field", () => {
    const nameField = categorySchema.paths["name"] as unknown as Record<string, unknown>;
    expect(nameField).toBeDefined();
    expect(nameField.required).toBe(true);
  });

  it("user role enum does not include system", () => {
    const roleField = userSchema.paths["role"] as unknown as Record<string, unknown>;
    expect(roleField).toBeDefined();
    expect(roleField.enum).toEqual(["reporter", "dicht_admin", "dicht_technician"]);
  });
});
