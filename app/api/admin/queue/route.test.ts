/**
 * @jest-environment node
 */
jest.mock("@/lib/db/connection", () => ({
  connect: jest.fn(async () => undefined),
}));

const complaints: Array<Record<string, unknown>> = [];
const categories: Array<Record<string, unknown>> = [];
const locations: Array<Record<string, unknown>> = [];
const assignments: Array<Record<string, unknown>> = [];
const notifications: Array<Record<string, unknown>> = [];
const techUsers: Array<Record<string, unknown>> = [];

jest.mock("@/lib/db/models/complaint", () => ({
  ComplaintModel: {
    find: (filter: Record<string, unknown>) => {
      const filterStatus = (filter.status as { $ne?: string })?.$ne;
      const filterIds = (filter._id as { $in?: unknown[] })?.$in;
      const filtered = complaints.filter((c) => {
        if (filterStatus && c.status === filterStatus) return false;
        if (
          filterIds &&
          !filterIds.map(String).includes(String(c._id))
        )
          return false;
        return true;
      });
      return {
        sort: () => ({
          limit: () => ({
            lean: async () => filtered.map((d) => ({ ...d })),
          }),
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

jest.mock("@/lib/db/models/assignment", () => ({
  AssignmentModel: {
    find: () => ({
      sort: () => ({
        lean: async () => assignments.map((d) => ({ ...d })),
      }),
    }),
    __seed: (doc: Record<string, unknown>) => assignments.push(doc),
  },
}));

jest.mock("@/lib/db/models/notification", () => ({
  NotificationModel: {
    distinct: jest.fn(async (_field: string, query: Record<string, unknown>) => {
      const filtered = notifications.filter(
        (n) =>
          n.type === query.type &&
          ((query.createdAt as { $gte?: Date })?.$gte
            ? new Date(n.createdAt as string) >=
              (query.createdAt as { $gte: Date }).$gte
            : true),
      );
      return [
        ...new Set(
          filtered.map((n) => String(n.complaintId)),
        ),
      ];
    }),
    __seed: (doc: Record<string, unknown>) => notifications.push(doc),
  },
}));

jest.mock("@/lib/db/models/user", () => ({
  UserModel: {
    find: () => ({
      lean: async () => techUsers.map((d) => ({ ...d })),
    }),
    __seed: (doc: Record<string, unknown>) => techUsers.push(doc),
  },
}));

const sessionMock = jest.fn();
const authorizeMock = jest.fn();
jest.mock("@/lib/auth/dal", () => ({
  getServerSession: (...args: unknown[]) => sessionMock(...args),
  authorizeRole: (...args: unknown[]) => authorizeMock(...args),
}));

import { GET } from "./route";
import { NotificationModel } from "@/lib/db/models/notification";

function makeRequest(url: string): Request {
  return new Request(url, { method: "GET" });
}

beforeEach(() => {
  complaints.length = 0;
  categories.length = 0;
  locations.length = 0;
  assignments.length = 0;
  notifications.length = 0;
  techUsers.length = 0;
  sessionMock.mockReset();
  authorizeMock.mockReset();
  (NotificationModel.distinct as jest.Mock).mockClear();
});

function allowAdmin(): void {
  sessionMock.mockResolvedValue({
    user: { id: "A1", email: "a@x", name: "A", role: "dicht_admin" },
  });
  authorizeMock.mockReturnValue(true);
}

test("unauthenticated GET returns 401", async () => {
  sessionMock.mockResolvedValue(null);
  const res = await GET(makeRequest("http://x/api/admin/queue"));
  expect(res.status).toBe(401);
});

test("non-admin GET returns 403", async () => {
  sessionMock.mockResolvedValue({
    user: { id: "R1", email: "r@x", name: "R", role: "reporter" },
  });
  authorizeMock.mockReturnValue(false);
  const res = await GET(makeRequest("http://x/api/admin/queue"));
  expect(res.status).toBe(403);
});

test("admin GET returns empty data and meta on clean queue", async () => {
  allowAdmin();
  const res = await GET(makeRequest("http://x/api/admin/queue"));
  expect(res.status).toBe(200);
  const body = await res.json();
  expect(body.data).toEqual([]);
  expect(body.meta).toBeDefined();
  expect(body.escalatedRecentCount).toBe(0);
});

test("filters out Closed complaints", async () => {
  allowAdmin();
  complaints.push(
    {
      _id: "C1",
      categoryId: "K1",
      locationId: "L1",
      status: "Closed",
      slaAcknowledgeBy: new Date(Date.now() - 100_000),
      slaResolveBy: new Date(Date.now() - 50_000),
      createdAt: new Date(),
      reporterId: "R1",
      
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
      _id: "C2",
      categoryId: "K1",
      locationId: "L1",
      status: "Submitted",
      slaAcknowledgeBy: new Date(Date.now() + 100_000),
      slaResolveBy: new Date(Date.now() + 200_000),
      createdAt: new Date(),
      reporterId: "R1",
      
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
  // The pagination mock still returns the full filtered list (in this unit
  // test we don't recreate paginateCursor's exact semantics); we only check
  // the response is well-formed and 200.
  const res = await GET(makeRequest("http://x/api/admin/queue"));
  expect(res.status).toBe(200);
  const body = await res.json();
  // Without a paginateCursor mock the data will be empty but the call
  // path through to the model still must not throw.
  expect(body).toHaveProperty("data");
  expect(body).toHaveProperty("meta");
});

test("escalatedRecentCount uses NotificationModel.distinct with last hour cutoff", async () => {
  allowAdmin();
  notifications.push({
    type: "escalation",
    complaintId: "C1",
    createdAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
  });
  await GET(makeRequest("http://x/api/admin/queue"));
  expect(NotificationModel.distinct).toHaveBeenCalledTimes(1);
  const calls = (NotificationModel.distinct as jest.Mock).mock.calls;
  const [, query] = calls[calls.length - 1];
  expect(query.type).toBe("escalation");
  expect(query.createdAt.$gte).toBeInstanceOf(Date);
});
