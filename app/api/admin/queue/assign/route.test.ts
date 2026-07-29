/**
 * @jest-environment node
 */
jest.mock("next/cache", () => ({
  revalidatePath: jest.fn(),
}));

jest.mock("@/lib/db/connection", () => ({
  connect: jest.fn(async () => undefined),
}));

const complaints: Array<Record<string, unknown>> = [];
const assignments: Array<Record<string, unknown>> = [];
const statusHistories: Array<Record<string, unknown>> = [];
const notifications: Array<Record<string, unknown>> = [];
const users: Array<Record<string, unknown>> = [];

function ensureComplaint(id: string, version: number): void {
  complaints.push({
    _id: id,
    __v: version,
    status: "Submitted",
    categoryId: "K1",
    locationId: "L1",
    reporterId: null,
    anonymousId: null,
    isAnonymous: false,
    priority: "High",
    proofPhotoUrl: null,
    description: "x",
    parentComplaintId: null,
    aiSuggestion: null,
    escalated: false,
  });
}

jest.mock("@/lib/db/models/complaint", () => ({
  ComplaintModel: {
    findOneAndUpdate: jest.fn(
      (filter: { _id: string; __v: number }, update: { $inc: { __v: number } }) => {
        const found = complaints.find(
          (c) => String(c._id) === String(filter._id) && c.__v === filter.__v,
        );
        if (!found) return null;
        complaints.splice(complaints.indexOf(found), 1);
        const updated = { ...found, __v: (found.__v as number) + 1 };
        complaints.push(updated);
        return updated;
      },
    ),
    findOne: (filter: { _id: string }) => {
      return {
        lean: async () => {
          const found = complaints.find((c) => String(c._id) === String(filter._id));
          return found ? { ...found } : null;
        },
      };
    },
    __seed: (doc: Record<string, unknown>) => complaints.push(doc),
  },
}));

jest.mock("@/lib/db/models/assignment", () => ({
  AssignmentModel: {
    create: jest.fn(async (doc: Record<string, unknown>) => {
      assignments.push({ ...doc, _id: `A-${assignments.length + 1}` });
      return assignments[assignments.length - 1];
    }),
    __seed: (doc: Record<string, unknown>) => assignments.push(doc),
  },
}));

jest.mock("@/lib/db/models/status-history", () => ({
  StatusHistoryModel: {
    create: jest.fn(async (doc: Record<string, unknown>) => {
      statusHistories.push({ ...doc, _id: `S-${statusHistories.length + 1}` });
      return statusHistories[statusHistories.length - 1];
    }),
    __seed: (doc: Record<string, unknown>) => statusHistories.push(doc),
  },
}));

jest.mock("@/lib/db/models/notification", () => ({
  NotificationModel: {
    create: jest.fn(async (doc: Record<string, unknown>) => {
      notifications.push({ ...doc, _id: `N-${notifications.length + 1}` });
      return notifications[notifications.length - 1];
    }),
    __seed: (doc: Record<string, unknown>) => notifications.push(doc),
  },
}));

jest.mock("@/lib/db/models/user", () => ({
  UserModel: {
    findOne: (filter: { _id: string }) => {
      return {
        lean: async () => {
          const found = users.find((u) => String(u._id) === String(filter._id));
          return found ? { ...found } : null;
        },
      };
    },
    __seed: (doc: Record<string, unknown>) => users.push(doc),
  },
}));

jest.mock("@/lib/auth/dal", () => ({
  getServerSession: jest.fn(),
  authorizeRole: jest.fn(),
}));

jest.mock("@/lib/realtime/ably", () => ({
  publishAssignmentNotification: jest.fn(async () => true),
}));

import { POST } from "./route";
import { getServerSession, authorizeRole } from "@/lib/auth/dal";
import { publishAssignmentNotification } from "@/lib/realtime/ably";

const getSessionMock = getServerSession as jest.Mock;
const authorizeMock = authorizeRole as jest.Mock;
const publishMock = publishAssignmentNotification as jest.Mock;

beforeEach(() => {
  complaints.length = 0;
  assignments.length = 0;
  statusHistories.length = 0;
  notifications.length = 0;
  users.length = 0;
  getSessionMock.mockReset();
  authorizeMock.mockReset();
  publishMock.mockClear();
});

function allowAdmin(id = "admin-1"): void {
  getSessionMock.mockResolvedValue({
    user: { id, email: "a@x", name: "Admin User", role: "dicht_admin" },
  });
  authorizeMock.mockReturnValue(true);
}

const VALID_24 = "0123456789abcdef01234567";

function makeValidBody(opts: Partial<{ note: string; version: number }> = {}): string {
  return JSON.stringify({
    complaintId: VALID_24,
    assignedToTechId: VALID_24,
    expectedVersion: opts.version ?? 0,
    ...(opts.note !== undefined ? { note: opts.note } : {}),
  });
}

test("unauthenticated POST returns 401", async () => {
  getSessionMock.mockResolvedValue(null);
  const res = await POST(
    new Request("http://x/api/admin/queue/assign", {
      method: "POST",
      body: makeValidBody(),
    }),
  );
  expect(res.status).toBe(401);
});

test("non-admin returns 403", async () => {
  getSessionMock.mockResolvedValue({
    user: { id: "R1", email: "r@x", name: "R", role: "reporter" },
  });
  authorizeMock.mockReturnValue(false);
  const res = await POST(
    new Request("http://x/api/admin/queue/assign", {
      method: "POST",
      body: makeValidBody(),
    }),
  );
  expect(res.status).toBe(403);
});

test("malformed JSON body returns 422 invalid_body", async () => {
  allowAdmin();
  const res = await POST(
    new Request("http://x/api/admin/queue/assign", {
      method: "POST",
      body: "not-json",
    }),
  );
  expect(res.status).toBe(422);
  expect((await res.json()).error.code).toBe("invalid_body");
});

test("zod schema rejects missing complaintId", async () => {
  allowAdmin();
  const res = await POST(
    new Request("http://x/api/admin/queue/assign", {
      method: "POST",
      body: JSON.stringify({ assignedToTechId: VALID_24, expectedVersion: 0 }),
    }),
  );
  expect(res.status).toBe(422);
  expect((await res.json()).error.code).toBe("invalid_input");
});

test("rejects non-ObjectId complaintId", async () => {
  allowAdmin();
  const res = await POST(
    new Request("http://x/api/admin/queue/assign", {
      method: "POST",
      body: JSON.stringify({
        complaintId: "not-an-id",
        assignedToTechId: VALID_24,
        expectedVersion: 0,
      }),
    }),
  );
  expect(res.status).toBe(422);
});

test("rejects when technician not found", async () => {
  allowAdmin();
  ensureComplaint(VALID_24, 0);
  users.length = 0;
  const res = await POST(
    new Request("http://x/api/admin/queue/assign", {
      method: "POST",
      body: makeValidBody(),
    }),
  );
  expect(res.status).toBe(404);
  expect((await res.json()).error.code).toBe("invalid_technician");
});

test("rejects non-technician user", async () => {
  allowAdmin();
  ensureComplaint(VALID_24, 0);
  users.push({ _id: VALID_24, name: "Reporter", email: "r@x", role: "reporter" });
  const res = await POST(
    new Request("http://x/api/admin/queue/assign", {
      method: "POST",
      body: makeValidBody(),
    }),
  );
  expect(res.status).toBe(422);
  expect((await res.json()).error.code).toBe("invalid_technician");
});

test("returns 409 stale_write on version mismatch", async () => {
  allowAdmin();
  ensureComplaint(VALID_24, 5);
  users.push({ _id: VALID_24, name: "Tech", email: "t@x", role: "dicht_technician" });
  const res = await POST(
    new Request("http://x/api/admin/queue/assign", {
      method: "POST",
      body: makeValidBody({ version: 0 }),
    }),
  );
  expect(res.status).toBe(409);
  expect((await res.json()).error.code).toBe("stale_write");
});

test("404 when complaint missing", async () => {
  allowAdmin();
  users.push({ _id: VALID_24, name: "Tech", email: "t@x", role: "dicht_technician" });
  const res = await POST(
    new Request("http://x/api/admin/queue/assign", {
      method: "POST",
      body: makeValidBody({ version: 0 }),
    }),
  );
  expect(res.status).toBe(404);
  expect((await res.json()).error.code).toBe("not_found");
});

test("successful assign persists assignment, status_history, notification, and publishes Ably", async () => {
  allowAdmin("admin-9");
  ensureComplaint(VALID_24, 0);
  users.push({ _id: VALID_24, name: "Tech", email: "t@x", role: "dicht_technician" });

  const res = await POST(
    new Request("http://x/api/admin/queue/assign", {
      method: "POST",
      body: makeValidBody({ note: "Priority issue" }),
    }),
  );

  expect(res.status).toBe(200);
  const body = await res.json();
  expect(body.data.assignmentId).toBeTruthy();
  expect(body.data.statusHistoryId).toBeTruthy();
  expect(body.data.notificationId).toBeTruthy();

  expect(assignments).toHaveLength(1);
  expect(assignments[0]).toMatchObject({
    complaintId: VALID_24,
    assignedToTechId: VALID_24,
    assignedById: "admin-9",
  });

  expect(notifications[0]).toMatchObject({
    complaintId: VALID_24,
    recipientId: VALID_24,
    type: "assignment",
    read: false,
  });
  expect(notifications[0].message).toMatch(/Admin User assigned/i);

  expect(statusHistories[0]).toMatchObject({
    complaintId: VALID_24,
    note: "Priority issue",
    changedBySystem: false,
  });

  expect(publishMock).toHaveBeenCalledWith(
    expect.objectContaining({
      technicianId: VALID_24,
      complaintId: VALID_24,
      adminName: "Admin User",
    }),
  );
});
