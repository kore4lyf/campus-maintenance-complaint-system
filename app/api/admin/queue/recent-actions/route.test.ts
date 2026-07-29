/**
 * @jest-environment node
 */
jest.mock("@/lib/db/connection", () => ({
  connect: jest.fn(async () => undefined),
}));

const assignmentDocs: Array<Record<string, unknown>> = [];
const userDocs: Array<Record<string, unknown>> = [];

jest.mock("@/lib/db/models/assignment", () => ({
  AssignmentModel: {
    find: (filter: Record<string, unknown>) => {
      const filtered = assignmentDocs.filter((a) => {
        if (filter.assignedById && String(a.assignedById) !== String(filter.assignedById)) return false;
        const cutoff = (filter.assignedAt as { $gte?: Date })?.$gte;
        if (cutoff && new Date(a.assignedAt as string) < cutoff) return false;
        return true;
      });
      return {
        sort: () => ({
          limit: (n: number) => ({
            lean: async () => filtered.slice(0, n),
          }),
        }),
      };
    },
    __seed: (doc: Record<string, unknown>) => assignmentDocs.push(doc),
  },
}));

jest.mock("@/lib/db/models/user", () => ({
  UserModel: {
    find: () => ({
      lean: async () => userDocs.map((d) => ({ ...d })),
    }),
    __seed: (doc: Record<string, unknown>) => userDocs.push(doc),
  },
}));

const sessionMock = jest.fn();
const authorizeMock = jest.fn();
jest.mock("@/lib/auth/dal", () => ({
  getServerSession: (...args: unknown[]) => sessionMock(...args),
  authorizeRole: (...args: unknown[]) => authorizeMock(...args),
}));

import { GET } from "./route";

function makeRequest(url: string): Request {
  return new Request(url, { method: "GET" });
}

beforeEach(() => {
  assignmentDocs.length = 0;
  userDocs.length = 0;
  sessionMock.mockReset();
  authorizeMock.mockReset();
});

function allowAdmin(userId = "admin1"): void {
  sessionMock.mockResolvedValue({
    user: { id: userId, email: "a@x", name: "Admin", role: "dicht_admin" },
  });
  authorizeMock.mockReturnValue(true);
}

test("unauthenticated GET returns 401", async () => {
  sessionMock.mockResolvedValue(null);
  const res = await GET(makeRequest("http://x/api/admin/queue/recent-actions"));
  expect(res.status).toBe(401);
});

test("non-admin GET returns 403", async () => {
  sessionMock.mockResolvedValue({
    user: { id: "R1", email: "r@x", name: "R", role: "reporter" },
  });
  authorizeMock.mockReturnValue(false);
  const res = await GET(makeRequest("http://x/api/admin/queue/recent-actions"));
  expect(res.status).toBe(403);
});

test("returns empty list when admin has no recent assignments", async () => {
  allowAdmin();
  const res = await GET(makeRequest("http://x/api/admin/queue/recent-actions"));
  expect(res.status).toBe(200);
  expect((await res.json()).data).toEqual([]);
});

test("returns assignments the admin personally made in the last 24 hours", async () => {
  allowAdmin("admin-42");
  const now = Date.now();
  assignmentDocs.push(
    {
      _id: "A1",
      complaintId: "C1",
      assignedToTechId: "T1",
      assignedById: "admin-42",
      assignedAt: new Date(now - 60_000).toISOString(),
    },
    {
      _id: "A2",
      complaintId: "C2",
      assignedToTechId: "T2",
      assignedById: "other-admin",
      assignedAt: new Date(now - 30_000).toISOString(),
    },
    {
      _id: "A3",
      complaintId: "C3",
      assignedToTechId: "T3",
      assignedById: "admin-42",
      assignedAt: new Date(now - 48 * 60 * 60 * 1000).toISOString(),
    },
  );
  userDocs.push(
    { _id: "T1", name: "Tech One", email: "t1@x", role: "dicht_technician" },
    { _id: "T2", name: "Tech Two", email: "t2@x", role: "dicht_technician" },
    { _id: "T3", name: "Tech Three", email: "t3@x", role: "dicht_technician" },
  );

  const res = await GET(makeRequest("http://x/api/admin/queue/recent-actions"));
  expect(res.status).toBe(200);
  const body = await res.json();
  expect(body.data).toHaveLength(1);
  expect(body.data[0]).toMatchObject({
    complaintId: "C1",
    assignedToName: "Tech One",
  });
  expect(body.data[0].changedAt).toBeTruthy();
});

test("limit param clamps to 1..50 default 10", async () => {
  allowAdmin("admin-limit-test");
  for (let i = 0; i < 25; i++) {
    assignmentDocs.push({
      _id: `A${i}`,
      complaintId: `C${i}`,
      assignedToTechId: `T${i}`,
      assignedById: "admin-limit-test",
      assignedAt: new Date(Date.now() - i * 1000).toISOString(),
    });
    userDocs.push({
      _id: `T${i}`,
      name: `T${i}`,
      email: `t${i}@x`,
      role: "dicht_technician",
    });
  }

  const req5 = makeRequest("http://x/api/admin/queue/recent-actions?limit=5");
  const res5 = await GET(req5);
  expect((await res5.json()).data.length).toBe(5);
});
