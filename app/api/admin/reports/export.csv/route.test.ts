/**
 * @jest-environment node
 */
jest.mock("@/lib/db/connection", () => ({
  connect: jest.fn(async () => undefined),
}));

const complaints: Array<Record<string, unknown>> = [];

jest.mock("@/lib/db/models/complaint", () => ({
  ComplaintModel: {
    find: (filter: Record<string, unknown>) => {
      const cutoff = (filter.createdAt as { $gte?: Date; $lte?: Date }) ?? {};
      const filtered = complaints.filter((c) => {
        const created = new Date(c.createdAt as string);
        if (cutoff.$gte && created < cutoff.$gte) return false;
        if (cutoff.$lte && created > cutoff.$lte) return false;
        if (
          filter.priority &&
          !(filter.priority as { $in?: string[] }).$in?.includes(
            c.priority as string,
          )
        )
          return false;
        return true;
      });
      return {
        lean: async () => filtered.map((d) => ({ ...d })),
      };
    },
    __seed: (doc: Record<string, unknown>) => complaints.push(doc),
  },
}));

jest.mock("@/lib/db/models/category", () => ({
  CategoryModel: {
    find: (filter: { _id: { $in: Array<{ toString(): string }> } }) => {
      const ids = filter._id.$in.map(String);
      return {
        lean: async () =>
          [
            { _id: "K1", systemType: "Electrical" },
          ].filter((c) => ids.includes(c._id)),
      };
    },
  },
}));

jest.mock("@/lib/db/models/location", () => ({
  LocationModel: {
    find: (filter: { _id: { $in: Array<{ toString(): string }> } }) => {
      const ids = filter._id.$in.map(String);
      return {
        lean: async () =>
          [
            { _id: "L1", name: "Library" },
          ].filter((l) => ids.includes(l._id)),
      };
    },
  },
}));

const sessionMock = jest.fn();
const authorizeMock = jest.fn();
jest.mock("@/lib/auth/dal", () => ({
  getServerSession: (...args: unknown[]) => sessionMock(...args),
  authorizeRole: (...args: unknown[]) => authorizeMock(...args),
}));

import { GET } from "./route";

function makeRequest(url = "http://x/api/admin/reports/export.csv"): Request {
  return new Request(url, { method: "GET" });
}

beforeEach(() => {
  complaints.length = 0;
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

test("returns CSV with text/csv content-type and CSV header row", async () => {
  allowAdmin();
  complaints.push({
    _id: "0123456789abcdef01234567",
    categoryId: "K1",
    locationId: "L1",
    status: "Submitted",
    priority: "High",
    createdAt: new Date(),
    slaAcknowledgeBy: new Date(),
    slaResolveBy: new Date(),
    resolvedAt: null,
  });

  const res = await GET(makeRequest());
  expect(res.status).toBe(200);
  expect(res.headers.get("content-type")).toContain("text/csv");
  const cd = res.headers.get("content-disposition") ?? "";
  expect(cd).toMatch(/^attachment; filename=/);
  expect(cd).toMatch(/\.csv/);

  const csv = await res.text();
  expect(csv).toMatch(/Complaint ID,Created At,Status,Priority/);
  expect(csv).toMatch(/0123456789abcdef01234567/);
  expect(csv).toMatch(/High/);
  expect(csv).toMatch(/Electrical/);
  expect(csv).toMatch(/Library/);
});

test("complaint with empty DB returns just the header row", async () => {
  allowAdmin();
  const res = await GET(makeRequest());
  expect(res.status).toBe(200);
  const csv = await res.text();
  // Header row + an empty data row (toCsv emits trailing newline).
  const lines = csv.replace(/\n$/, "").split("\n");
  expect(lines).toHaveLength(1);
  expect(lines[0]).toMatch(/Complaint ID/);
});

test("respects severity filter", async () => {
  allowAdmin();
  complaints.push(
    {
      _id: "1",
      categoryId: "K1",
      locationId: "L1",
      status: "Submitted",
      priority: "High",
      createdAt: new Date(),
      slaAcknowledgeBy: new Date(),
      slaResolveBy: new Date(),
      resolvedAt: null,
    },
    {
      _id: "2",
      categoryId: "K1",
      locationId: "L1",
      status: "Submitted",
      priority: "Low",
      createdAt: new Date(),
      slaAcknowledgeBy: new Date(),
      slaResolveBy: new Date(),
      resolvedAt: null,
    },
  );
  const res = await GET(makeRequest("http://x/api/admin/reports/export.csv?severity=High"));
  const csv = await res.text();
  expect(csv).toMatch(/^.*\n[^,]+,[^,]+,[^,]+,High,/m);
  // Low must NOT appear in any data row.
  const dataLines = csv.replace(/^.*Complaint ID.*\n/, "").trim().split("\n");
  for (const line of dataLines) {
    expect(line.split(",")[3]).not.toBe("Low");
  }
});
