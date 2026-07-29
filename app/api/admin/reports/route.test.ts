/**
 * @jest-environment node
 */
jest.mock("@/lib/db/connection", () => ({
  connect: jest.fn(async () => undefined),
}));

const aggregateResult: unknown[] = [];
const categories: Array<{ _id: string; systemType: string }> = [];
const locations: Array<{ _id: string; name: string }> = [];

jest.mock("@/lib/db/models/complaint", () => ({
  ComplaintModel: {
    aggregate: jest.fn(async () => aggregateResult),
  },
}));

jest.mock("@/lib/db/models/category", () => ({
  CategoryModel: {
    find: (filter: { _id: { $in: Array<{ toString(): string }> } }) => {
      const ids = filter._id.$in.map(String);
      return {
        lean: async () => categories.filter((c) => ids.includes(String(c._id))),
      };
    },
    __seed: (doc: { _id: string; systemType: string }) => categories.push(doc),
  },
}));

jest.mock("@/lib/db/models/location", () => ({
  LocationModel: {
    find: (filter: { _id: { $in: Array<{ toString(): string }> } }) => {
      const ids = filter._id.$in.map(String);
      return {
        lean: async () => locations.filter((l) => ids.includes(String(l._id))),
      };
    },
    __seed: (doc: { _id: string; name: string }) => locations.push(doc),
  },
}));

const sessionMock = jest.fn();
const authorizeMock = jest.fn();
jest.mock("@/lib/auth/dal", () => ({
  getServerSession: (...args: unknown[]) => sessionMock(...args),
  authorizeRole: (...args: unknown[]) => authorizeMock(...args),
}));

import { GET } from "./route";
import { ComplaintModel } from "@/lib/db/models/complaint";

function makeRequest(url = "http://x/api/admin/reports"): Request {
  return new Request(url, { method: "GET" });
}

beforeEach(() => {
  aggregateResult.length = 0;
  categories.length = 0;
  locations.length = 0;
  sessionMock.mockReset();
  authorizeMock.mockReset();
});

function allowAdmin(): void {
  sessionMock.mockResolvedValue({
    user: { id: "A1", email: "a@x", name: "A", role: "dicht_admin" },
  });
  authorizeMock.mockReturnValue(true);
}

test("non-admin returns 403", async () => {
  sessionMock.mockResolvedValue({
    user: { id: "R1", email: "r@x", name: "R", role: "reporter" },
  });
  authorizeMock.mockReturnValue(false);
  const res = await GET(makeRequest());
  expect(res.status).toBe(403);
});

test("empty DB returns the expected zero/fallback shape", async () => {
  allowAdmin();
  aggregateResult.push({
    byCategory: [],
    byLocation: [],
    bySeverity: [],
    breachCount: [],
    resolveBreachCount: [],
    avgResolution: [],
    backlog: [],
    totalCount: [{ total: 0 }],
  });
  const res = await GET(makeRequest());
  expect(res.status).toBe(200);
  const body = await res.json();
  expect(body.data).toMatchObject({
    byCategory: [],
    byLocation: [],
    bySeverity: [],
    breachCount: { acknowledgeOverdue: 0, resolveOverdue: 0 },
    avgResolutionMs: null,
    backlog: 0,
  });
  expect(body.meta.totalCount).toBe(0);
});

test("groups by category/location/severity by joining names", async () => {
  allowAdmin();
  categories.push({ _id: "K1", systemType: "Electrical" });
  locations.push({ _id: "L1", name: "Library" });
  aggregateResult.push({
    byCategory: [{ _id: "K1", count: 4 }],
    byLocation: [{ _id: "L1", count: 4 }],
    bySeverity: [{ _id: "High", count: 4 }],
    breachCount: [{ acknowledgeOverdue: 1 }],
    resolveBreachCount: [{ resolveOverdue: 2 }],
    avgResolution: [{ avgMs: 3600_000 }],
    backlog: [{ count: 5 }],
    totalCount: [{ total: 12 }],
  });
  const res = await GET(makeRequest());
  const body = await res.json();
  expect(body.data.byCategory[0]).toMatchObject({ name: "Electrical", count: 4 });
  expect(body.data.byLocation[0]).toMatchObject({ name: "Library", count: 4 });
  expect(body.data.bySeverity[0]).toMatchObject({ name: "High", count: 4 });
  expect(body.data.breachCount.acknowledgeOverdue).toBe(1);
  expect(body.data.breachCount.resolveOverdue).toBe(2);
  expect(body.data.backlog).toBe(5);
});

test("time window filters apply to the aggregate match stage", async () => {
  allowAdmin();
  aggregateResult.push({
    byCategory: [],
    byLocation: [],
    bySeverity: [],
    breachCount: [],
    resolveBreachCount: [],
    avgResolution: [],
    backlog: [],
    totalCount: [{ total: 0 }],
  });
  await GET(makeRequest("http://x/api/admin/reports?time=7d"));
  const calls = (ComplaintModel.aggregate as jest.Mock).mock.calls;
  const pipeline = calls[calls.length - 1][0];
  expect(pipeline[0].$match).toBeDefined();
  expect(pipeline[0].$match.createdAt.$gte).toBeInstanceOf(Date);
});

test("multi-value filters pass through to the match stage", async () => {
  allowAdmin();
  aggregateResult.push({
    byCategory: [],
    byLocation: [],
    bySeverity: [],
    breachCount: [],
    resolveBreachCount: [],
    avgResolution: [],
    backlog: [],
    totalCount: [{ total: 0 }],
  });
  await GET(
    makeRequest(
      "http://x/api/admin/reports?severity=High&severity=Critical&status=Submitted",
    ),
  );
  const calls = (ComplaintModel.aggregate as jest.Mock).mock.calls;
  const pipeline = calls[calls.length - 1][0];
  expect(pipeline[0].$match.priority.$in).toEqual(["High", "Critical"]);
  expect(pipeline[0].$match.status.$in).toEqual(["Submitted"]);
});
