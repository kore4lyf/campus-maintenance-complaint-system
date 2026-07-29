/**
 * @jest-environment node
 */
jest.mock("@/lib/db/connection", () => ({
  connect: jest.fn(async () => undefined),
}));

const assignments: Array<Record<string, unknown>> = [];
const categories: Array<Record<string, unknown>> = [];
const locations: Array<Record<string, unknown>> = [];
const complaints: Array<Record<string, unknown>> = [];

jest.mock("@/lib/db/models/assignment", () => ({
  AssignmentModel: {
    find: (filter: Record<string, unknown>) => {
      const filtered = assignments.filter(
        (a) => String(a.assignedToTechId) === String(filter.assignedToTechId),
      );
      return {
        sort: () => ({
          lean: async () => filtered.map((d) => ({ ...d })),
        }),
      };
    },
    __seed: (doc: Record<string, unknown>) => assignments.push(doc),
  },
}));

jest.mock("@/lib/db/models/complaint", () => ({
  ComplaintModel: {
    find: (filter: Record<string, unknown>) => {
      const filterIds = (filter._id as { $in?: unknown[] })?.$in;
      const filtered = complaints.filter((c) => {
        if (
          filterIds &&
          !filterIds.map(String).includes(String(c._id))
        )
          return false;
        return true;
      });
      // Preserve the route's expectation: sort then sort again then lean.
      const pipeline: Record<string, unknown>[] = [];
      pipeline.push(
        ...pipeline,
        { type: "sort" },
        { type: "limit" },
      );
      void pipeline;
      return {
        sort: () => ({
          limit: () => ({
            lean: async () => filtered.map((d) => ({ ...d })),
          }),
          lean: async () => filtered.map((d) => ({ ...d })),
        }),
      };
    },
    __seed: (doc: Record<string, unknown>) => complaints.push(doc),
  },
}));

jest.mock("@/lib/db/models/category", () => ({
  CategoryModel: {
    find: () => ({
      lean: async () => categories.map((d) => ({ ...d })),
    }),
    __seed: (doc: Record<string, unknown>) => categories.push(doc),
  },
}));

jest.mock("@/lib/db/models/location", () => ({
  LocationModel: {
    find: () => ({
      lean: async () => locations.map((d) => ({ ...d })),
    }),
    __seed: (doc: Record<string, unknown>) => locations.push(doc),
  },
}));

const sessionMock = jest.fn();
const authorizeMock = jest.fn();
jest.mock("@/lib/auth/dal", () => ({
  getServerSession: (...args: unknown[]) => sessionMock(...args),
  authorizeRole: (...args: unknown[]) => authorizeMock(...args),
}));

import { GET } from "./route";

function makeRequest(url = "http://x/api/technician/queue"): Request {
  return new Request(url, { method: "GET" });
}

beforeEach(() => {
  assignments.length = 0;
  categories.length = 0;
  locations.length = 0;
  complaints.length = 0;
  sessionMock.mockReset();
  authorizeMock.mockReset();
});

test("unauthenticated GET returns 401", async () => {
  sessionMock.mockResolvedValue(null);
  const res = await GET(makeRequest());
  expect(res.status).toBe(401);
});

test("non-technician returns 403", async () => {
  sessionMock.mockResolvedValue({
    user: { id: "R1", email: "r@x", name: "R", role: "reporter" },
  });
  authorizeMock.mockReturnValue(false);
  const res = await GET(makeRequest());
  expect(res.status).toBe(403);
});

test("empty assign list returns empty data", async () => {
  sessionMock.mockResolvedValue({
    user: { id: "T1", email: "t@x", name: "T", role: "dicht_technician" },
  });
  authorizeMock.mockReturnValue(true);
  const res = await GET(makeRequest());
  expect(res.status).toBe(200);
  const body = await res.json();
  expect(body.data).toEqual([]);
  expect(body.meta).toMatchObject({ hasMore: false });
});

test("technician sees only their own assignments", async () => {
  sessionMock.mockResolvedValue({
    user: { id: "T-OWNER", email: "t@x", name: "T", role: "dicht_technician" },
  });
  authorizeMock.mockReturnValue(true);
  assignments.push(
    { _id: "A1", complaintId: "C1", assignedToTechId: "T-OWNER", assignedAt: new Date().toISOString() },
    { _id: "A2", complaintId: "C2", assignedToTechId: "T-OTHER", assignedAt: new Date().toISOString() },
    { _id: "A3", complaintId: "C3", assignedToTechId: "T-OWNER", assignedAt: new Date().toISOString() },
  );
  complaints.push(
    {
      _id: "C1",
      categoryId: "K1",
      locationId: "L1",
      status: "Submitted",
      slaAcknowledgeBy: new Date(Date.now() + 60_000),
      slaResolveBy: new Date(Date.now() + 120_000),
      createdAt: new Date(),
      reporterId: "R1",
      anonymousId: null,
      isAnonymous: false,
      priority: "High",
      proofPhotoUrl: null,
      description: "x",
      parentComplaintId: null,
      aiSuggestion: null,
      escalated: false,
      __v: 0,
    },
    {
      _id: "C3",
      categoryId: "K2",
      locationId: "L2",
      status: "Submitted",
      slaAcknowledgeBy: new Date(Date.now() + 60_000),
      slaResolveBy: new Date(Date.now() + 120_000),
      createdAt: new Date(),
      reporterId: "R1",
      anonymousId: null,
      isAnonymous: false,
      priority: "Medium",
      proofPhotoUrl: null,
      description: "y",
      parentComplaintId: null,
      aiSuggestion: null,
      escalated: false,
      __v: 0,
    },
  );
  categories.push(
    { _id: "K1", systemType: "Electrical", defaultSeverity: "High" },
    { _id: "K2", systemType: "Plumbing", defaultSeverity: "Medium" },
  );
  locations.push(
    { _id: "L1", name: "Library", area: "academic" },
    { _id: "L2", name: "Engineering Block", area: "academic" },
  );

  const res = await GET(makeRequest());
  expect(res.status).toBe(200);
  const body = await res.json();
  expect(body.data).toHaveLength(2);
  // Complaints from T-OTHER (C2) must NOT be in the result.
  expect(body.data.find((d: { _id: string }) => d._id === "C2")).toBeUndefined();
  expect(body.data.find((d: { _id: string }) => d._id === "C1")).toBeDefined();
  expect(body.data.find((d: { _id: string }) => d._id === "C3")).toBeDefined();
});
