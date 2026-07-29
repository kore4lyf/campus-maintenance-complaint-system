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

function ensureComplaint(
  id: string,
  status: string,
  version: number,
  extra: Record<string, unknown> = {},
): void {
  complaints.push({
    _id: id,
    __v: version,
    status,
    categoryId: "K1",
    locationId: "L1",
    reporterId: REPORTER_1,
    anonymousId: null,
    isAnonymous: false,
    priority: "High",
    proofPhotoUrl: null,
    description: "x",
    parentComplaintId: null,
    aiSuggestion: null,
    escalated: false,
    ...extra,
  });
}

jest.mock("@/lib/db/models/complaint", () => ({
  ComplaintModel: {
    findOne: (filter: { _id: string }) => {
      return {
        lean: async () => {
          const found = complaints.find((c) => String(c._id) === String(filter._id));
          return found ? { ...found } : null;
        },
      };
    },
    findOneAndUpdate: jest.fn(
      (
        filter: { _id: string; __v: number },
        update: { $set: Record<string, unknown>; $inc: { __v: number } },
      ) => {
        const idx = complaints.findIndex(
          (c) => String(c._id) === String(filter._id) && c.__v === filter.__v,
        );
        if (idx < 0) return null;
        complaints[idx] = { ...complaints[idx], ...update.$set, __v: (complaints[idx].__v as number) + 1 };
        return { ...complaints[idx] };
      },
    ),
    __seed: (doc: Record<string, unknown>) => complaints.push(doc),
  },
}));

jest.mock("@/lib/db/models/assignment", () => ({
  AssignmentModel: {
    findOne: (filter: Record<string, unknown>) => {
      const found = assignments.find(
        (a) =>
          String(a.complaintId) === String(filter.complaintId) &&
          (filter.assignedToTechId
            ? String(a.assignedToTechId) === String(filter.assignedToTechId)
            : true),
      );
      return {
        sort: () => ({
          lean: async () => (found ? { ...found } : null),
        }),
        lean: async () => (found ? { ...found } : null),
      };
    },
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

jest.mock("@/lib/auth/dal", () => ({
  getServerSession: jest.fn(),
  authorizeRole: jest.fn(),
}));

jest.mock("@/lib/storage/cloudinary", () => ({
  compressAndUpload: jest.fn(),
}));

jest.mock("@/lib/realtime/ably", () => ({
  publishToChannel: jest.fn(async () => true),
}));

import { POST } from "./route";
import { getServerSession, authorizeRole } from "@/lib/auth/dal";
import { compressAndUpload } from "@/lib/storage/cloudinary";

const sessionMock = getServerSession as jest.Mock;
const authorizeMock = authorizeRole as jest.Mock;
const compressMock = compressAndUpload as jest.Mock;

const VALID_24 = "0123456789abcdef01234567";
const TECH_1 = "aaaaaaaaaaaaaaaaaaaaaaaa";
const TECH_9 = "bbbbbbbbbbbbbbbbbbbbbbbb";
const ADMIN_1 = "cccccccccccccccccccccccc";
const REPORTER_1 = "dddddddddddddddddddddddd";

beforeEach(() => {
  complaints.length = 0;
  assignments.length = 0;
  statusHistories.length = 0;
  notifications.length = 0;
  sessionMock.mockReset();
  authorizeMock.mockReset();
  compressMock.mockReset();
});

function allowTech(id = TECH_1): void {
  sessionMock.mockResolvedValue({
    user: { id, email: "t@x", name: "Tech User", role: "dicht_technician" },
  });
  authorizeMock.mockReturnValue(true);
}

function makeJsonRequest(body: unknown): Request {
  return new Request("http://x/api/technician/queue/x/transition", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

test("unauthenticated POST returns 401", async () => {
  sessionMock.mockResolvedValue(null);
  const res = await POST(makeJsonRequest({}), { params: Promise.resolve({ id: VALID_24 }) });
  expect(res.status).toBe(401);
});

test("non-technician returns 403", async () => {
  sessionMock.mockResolvedValue({
    user: { id: "R1", email: "r@x", name: "R", role: "reporter" },
  });
  authorizeMock.mockReturnValue(false);
  const res = await POST(makeJsonRequest({}), { params: Promise.resolve({ id: VALID_24 }) });
  expect(res.status).toBe(403);
});

test("invalid complaint id format returns 422", async () => {
  allowTech();
  const res = await POST(makeJsonRequest({}), { params: Promise.resolve({ id: "not-an-id" }) });
  expect(res.status).toBe(422);
  expect((await res.json()).error.code).toBe("invalid_input");
});

test("assignment not found returns 404", async () => {
  allowTech(TECH_9);
  ensureComplaint(VALID_24, "Submitted", 0);
  // No assignment row seeded.
  const res = await POST(
    makeJsonRequest({ expectedVersion: 0, toStatus: "Acknowledged" }),
    { params: Promise.resolve({ id: VALID_24 }) },
  );
  expect(res.status).toBe(404);
  expect((await res.json()).error.code).toBe("not_found");
});

test("invalid status transition returns 422 invalid_transition", async () => {
  allowTech();
  ensureComplaint(VALID_24, "Submitted", 0);
  assignments.push({
    _id: "A1",
    complaintId: VALID_24,
    assignedToTechId: TECH_1,
    assignedById: ADMIN_1,
    assignedAt: new Date().toISOString(),
  });
  const res = await POST(
    makeJsonRequest({ expectedVersion: 0, toStatus: "Resolved" }),
    { params: Promise.resolve({ id: VALID_24 }) },
  );
  expect(res.status).toBe(422);
  expect((await res.json()).error.code).toBe("invalid_transition");
});

test("Resolved without photo returns invalid_photo", async () => {
  allowTech();
  ensureComplaint(VALID_24, "In Progress", 0);
  assignments.push({
    _id: "A1",
    complaintId: VALID_24,
    assignedToTechId: TECH_1,
    assignedById: ADMIN_1,
    assignedAt: new Date().toISOString(),
  });
  const res = await POST(
    makeJsonRequest({ expectedVersion: 0, toStatus: "Resolved" }),
    { params: Promise.resolve({ id: VALID_24 }) },
  );
  expect(res.status).toBe(422);
  expect((await res.json()).error.code).toBe("invalid_photo");
});

test("stale version returns 409 stale_write", async () => {
  allowTech();
  ensureComplaint(VALID_24, "Submitted", 5);
  assignments.push({
    _id: "A1",
    complaintId: VALID_24,
    assignedToTechId: TECH_1,
    assignedById: ADMIN_1,
    assignedAt: new Date().toISOString(),
  });
  const res = await POST(
    makeJsonRequest({ expectedVersion: 0, toStatus: "Acknowledged" }),
    { params: Promise.resolve({ id: VALID_24 }) },
  );
  expect(res.status).toBe(409);
  expect((await res.json()).error.code).toBe("stale_write");
});

test("acknowledgement writes status_history and notifies admin", async () => {
  allowTech();
  ensureComplaint(VALID_24, "Submitted", 0);
  assignments.push(
    {
      _id: "A1",
      complaintId: VALID_24,
      assignedToTechId: TECH_1,
      assignedById: ADMIN_1,
      assignedAt: new Date().toISOString(),
    },
    {
      _id: "A2",
      complaintId: VALID_24,
      assignedToTechId: TECH_1,
      assignedById: ADMIN_1,
      assignedAt: new Date().toISOString(),
    },
  );

  const res = await POST(
    makeJsonRequest({ expectedVersion: 0, toStatus: "Acknowledged", note: "On it" }),
    { params: Promise.resolve({ id: VALID_24 }) },
  );
  expect(res.status).toBe(200);
  const body = await res.json();
  expect(body.data.newStatus).toBeUndefined();
  expect(body.data.newVersion).toBe(1);
  expect(body.data.statusHistoryId).toBeTruthy();

  expect(statusHistories[0]).toMatchObject({
    complaintId: VALID_24,
    fromStatus: "Submitted",
    toStatus: "Acknowledged",
    note: "On it",
    changedBySystem: false,
  });

  // Notification to admin: assignee as most recent assignment.
  expect(notifications).toHaveLength(2); // admin + reporter
  expect(notifications.find((n) => n.recipientId === ADMIN_1)).toMatchObject({
    type: "status",
    read: false,
  });
  expect(notifications.find((n) => n.recipientId === REPORTER_1)).toMatchObject({
    type: "status",
    message: /technician acknowledgement/i,
    read: false,
  });
});

test("Resolved requires compress+upload of the photo", async () => {
  allowTech();
  ensureComplaint(VALID_24, "In Progress", 0);
  assignments.push({
    _id: "A1",
    complaintId: VALID_24,
    assignedToTechId: TECH_1,
    assignedById: ADMIN_1,
    assignedAt: new Date().toISOString(),
  });
  compressMock.mockResolvedValue({ url: "https://cdn.example.com/proof.jpg" });

  // Build a multipart/form-data with one photo + JSON body.
  const form = new FormData();
  form.append("body", JSON.stringify({ expectedVersion: 0, toStatus: "Resolved" }));
  form.append("photo", new File([new Uint8Array([0xff, 0xd8, 0xff])], "proof.jpg", { type: "image/jpeg" }));

  const req = new Request("http://x/api/technician/queue/x/transition", {
    method: "POST",
    body: form,
  });

  const res = await POST(req, { params: Promise.resolve({ id: VALID_24 }) });
  expect(res.status).toBe(200);
  expect(compressMock).toHaveBeenCalledTimes(1);
  const updated = complaints[0] as { status: string; proofPhotoUrl: string; resolvedAt?: Date };
  expect(updated.status).toBe("Resolved");
  expect(updated.proofPhotoUrl).toBe("https://cdn.example.com/proof.jpg");
  expect(updated.resolvedAt).toBeTruthy();
});
