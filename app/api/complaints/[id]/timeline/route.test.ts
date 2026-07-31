/**
 * @jest-environment node
 */
jest.mock("@/lib/db/connection", () => ({
  connect: jest.fn(async () => undefined),
}));

const complaintsById: Map<string, Record<string, unknown>> = new Map();
const statusHistory: Array<Record<string, unknown>> = [];
const assignmentByComplaint: Map<string, { assignedToTechId: string }> = new Map();
const usersById: Map<string, { name: string; role: string }> = new Map();

jest.mock("@/lib/db/models/complaint", () => ({
  ComplaintModel: {
    findOne: (filter: { _id: string }) => {
      const doc = complaintsById.get(String(filter._id));
      return {
        lean: async () => (doc ? { ...doc } : null),
      };
    },
    __seed: (doc: Record<string, unknown>) =>
      complaintsById.set(String(doc._id), doc),
  },
}));

jest.mock("@/lib/db/models/status-history", () => ({
  StatusHistoryModel: {
    find: (filter: { complaintId: string }) => {
      const filtered = statusHistory
        .filter((h) => String(h.complaintId) === String(filter.complaintId));
      return {
        sort: () => ({
          lean: async () => filtered.map((d) => ({ ...d })),
        }),
        lean: async () => filtered.map((d) => ({ ...d })),
      };
    },
    __seed: (doc: Record<string, unknown>) => statusHistory.push(doc),
  },
}));

jest.mock("@/lib/db/models/assignment", () => ({
  AssignmentModel: {
    findOne: (filter: { complaintId: string; assignedToTechId?: string }) => {
      const a = assignmentByComplaint.get(String(filter.complaintId));
      if (!a) return { lean: async () => null };
      if (
        filter.assignedToTechId &&
        a.assignedToTechId !== filter.assignedToTechId
      )
        return { lean: async () => null };
      return { lean: async () => ({ ...a }) };
    },
  },
}));

jest.mock("@/lib/db/models/user", () => ({
  UserModel: {
    find: (filter: { _id: { $in: string[] } }) => {
      const ids = filter._id.$in.map(String);
      const docs = [...usersById.entries()]
        .filter(([id]) => ids.includes(id))
        .map(([id, v]) => ({ _id: id, ...v }));
      return {
        lean: async () => docs,
      };
    },
  },
}));

jest.mock("@/lib/auth/dal", () => ({
  getServerSession: jest.fn(),
}));

import { GET } from "./route";
import { getServerSession } from "@/lib/auth/dal";

const VALID_24 = "0123456789abcdef01234567";
const REPORTER_ID = "aabbccdd0000000000000001";
const TECH_ID = "aabbccdd0000000000000002";
const ADMIN_ID = "aabbccdd0000000000000003";
const OTHER_ID = "aabbccdd0000000000000004";
const sessionMock = getServerSession as jest.Mock;

beforeEach(() => {
  complaintsById.clear();
  statusHistory.length = 0;
  assignmentByComplaint.clear();
  usersById.clear();
  sessionMock.mockReset();
});

function params(): { params: Promise<{ id: string }> } {
  return { params: Promise.resolve({ id: VALID_24 }) };
}

test("unauthenticated GET returns 401", async () => {
  sessionMock.mockResolvedValue(null);
  const res = await GET(new Request("http://x"), params());
  expect(res.status).toBe(401);
});

test("invalid complaint id returns 404", async () => {
  sessionMock.mockResolvedValue({
    user: { id: REPORTER_ID, email: "r@x", name: "R", role: "reporter" },
  });
  const res = await GET(new Request("http://x"), {
    params: Promise.resolve({ id: "not-an-id" }),
  });
  expect(res.status).toBe(404);
});

test("complaint not found returns 404", async () => {
  sessionMock.mockResolvedValue({
    user: { id: REPORTER_ID, email: "r@x", name: "R", role: "reporter" },
  });
  const res = await GET(new Request("http://x"), params());
  expect(res.status).toBe(404);
});

test("reporter who does not own the complaint gets 403", async () => {
  sessionMock.mockResolvedValue({
    user: { id: REPORTER_ID, email: "r@x", name: "R", role: "reporter" },
  });
  complaintsById.set(VALID_24, {
    _id: VALID_24,
    reporterId: OTHER_ID,
    categoryId: "K1",
    locationId: "L1",
    status: "Submitted",
    slaAcknowledgeBy: new Date(),
    slaResolveBy: new Date(),
    priority: "High",
    proofPhotoUrl: null,
    description: "x",
    parentComplaintId: null,
    
    isAnonymous: false,
    aiSuggestion: null,
    escalated: false,
  });
  const res = await GET(new Request("http://x"), params());
  expect(res.status).toBe(403);
});

test("reporter who owns the complaint gets the timeline in reverse chronological order", async () => {
  sessionMock.mockResolvedValue({
    user: { id: REPORTER_ID, email: "r@x", name: "R", role: "reporter" },
  });
  complaintsById.set(VALID_24, {
    _id: VALID_24,
    reporterId: REPORTER_ID,
    categoryId: "K1",
    locationId: "L1",
    status: "Acknowledged",
    slaAcknowledgeBy: new Date(),
    slaResolveBy: new Date(),
    priority: "High",
    proofPhotoUrl: null,
    description: "x",
    parentComplaintId: null,
    
    isAnonymous: false,
    aiSuggestion: null,
    escalated: false,
  });
  statusHistory.push(
    {
      complaintId: VALID_24,
      fromStatus: "Submitted",
      toStatus: "Acknowledged",
      changedById: TECH_ID,
      changedBySystem: false,
      note: "On it",
      photoUrl: null,
      changedAt: new Date("2026-07-28T10:00:00Z"),
    },
    {
      complaintId: VALID_24,
      fromStatus: null,
      toStatus: "Submitted",
      changedById: REPORTER_ID,
      changedBySystem: false,
      note: null,
      photoUrl: null,
      changedAt: new Date("2026-07-28T09:00:00Z"),
    },
  );
  usersById.set(TECH_ID, { name: "Tech", role: "dicht_technician" });
  usersById.set(REPORTER_ID, { name: "R", role: "reporter" });

  const res = await GET(new Request("http://x"), params());
  expect(res.status).toBe(200);
  const body = await res.json();
  expect(body.data).toHaveLength(2);
  // Most recent first.
  expect(body.data[0].toStatus).toBe("Acknowledged");
  expect(body.data[0].changedByName).toBe("Tech");
  expect(body.data[0].changedByRole).toBe("dicht_technician");
  expect(body.data[0].note).toBe("On it");
  expect(body.data[1].toStatus).toBe("Submitted");
  expect(body.data[1].changedByName).toBe("R");
});

test("technician without assignment gets 403", async () => {
  sessionMock.mockResolvedValue({
    user: { id: TECH_ID, email: "t@x", name: "T", role: "dicht_technician" },
  });
  complaintsById.set(VALID_24, {
    _id: VALID_24,
    reporterId: "R1",
    categoryId: "K1",
    locationId: "L1",
    status: "Submitted",
    slaAcknowledgeBy: new Date(),
    slaResolveBy: new Date(),
    priority: "High",
    proofPhotoUrl: null,
    description: "x",
    parentComplaintId: null,
    
    isAnonymous: false,
    aiSuggestion: null,
    escalated: false,
  });
  const res = await GET(new Request("http://x"), params());
  expect(res.status).toBe(403);
});

test("admin can see the timeline regardless of ownership", async () => {
  sessionMock.mockResolvedValue({
    user: { id: ADMIN_ID, email: "a@x", name: "A", role: "dicht_admin" },
  });
  complaintsById.set(VALID_24, {
    _id: VALID_24,
    reporterId: REPORTER_ID,
    categoryId: "K1",
    locationId: "L1",
    status: "Submitted",
    slaAcknowledgeBy: new Date(),
    slaResolveBy: new Date(),
    priority: "High",
    proofPhotoUrl: null,
    description: "x",
    parentComplaintId: null,
    
    isAnonymous: false,
    aiSuggestion: null,
    escalated: false,
  });
  statusHistory.push({
    complaintId: VALID_24,
    fromStatus: null,
    toStatus: "Submitted",
    changedById: REPORTER_ID,
    changedBySystem: false,
    note: null,
    photoUrl: null,
    changedAt: new Date(),
  });
  usersById.set(REPORTER_ID, { name: "R", role: "reporter" });
  const res = await GET(new Request("http://x"), params());
  expect(res.status).toBe(200);
});
