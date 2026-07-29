/**
 * @jest-environment node
 */
jest.mock("@/lib/db/connection", () => ({
  connect: jest.fn(async () => undefined),
}));

const technicianDocs: Array<{ _id: string; name: string; email: string; role: string }> = [];

jest.mock("@/lib/db/models/user", () => ({
  UserModel: {
    find: (filter: { role?: string }) => {
      const filtered = technicianDocs.filter((d) => d.role === filter.role);
      return {
        select: () => ({
          lean: async () => filtered.map((d) => ({
            _id: d._id,
            name: d.name,
            email: d.email,
          })),
        }),
      };
    },
    __seed: (doc: { _id: string; name: string; email: string; role: string }) => {
      technicianDocs.push(doc);
    },
  },
}));

jest.mock("@/lib/auth/dal", () => ({
  getServerSession: jest.fn(),
  authorizeRole: jest.fn(),
}));

import { GET } from "./route";
import { getServerSession, authorizeRole } from "@/lib/auth/dal";

const getSessionMock = getServerSession as jest.Mock;
const authorizeMock = authorizeRole as jest.Mock;

beforeEach(() => {
  technicianDocs.length = 0;
  technicianDocs.push(
    { _id: "T1", name: "Tech One", email: "t1@x.com", role: "dicht_technician" },
    { _id: "T2", name: "Tech Two", email: "t2@x.com", role: "dicht_technician" },
    { _id: "A1", name: "Admin One", email: "a1@x.com", role: "dicht_admin" },
  );
  getSessionMock.mockReset();
  authorizeMock.mockReset();
});

test("unauthenticated request returns 401", async () => {
  getSessionMock.mockResolvedValue(null);
  const res = await GET();
  expect(res.status).toBe(401);
  const body = await res.json();
  expect(body.error.code).toBe("unauthenticated");
});

test("non-admin role returns 403", async () => {
  getSessionMock.mockResolvedValue({
    user: { id: "U1", email: "r@x", name: "R", role: "reporter" },
  });
  authorizeMock.mockReturnValue(false);
  const res = await GET();
  expect(res.status).toBe(403);
  expect((await res.json()).error.code).toBe("forbidden");
});

test("admin role returns only dicht_technician users", async () => {
  getSessionMock.mockResolvedValue({
    user: { id: "A1", email: "a1@x", name: "A1", role: "dicht_admin" },
  });
  authorizeMock.mockReturnValue(true);
  const res = await GET();
  expect(res.status).toBe(200);
  const body = await res.json();
  expect(body.data).toHaveLength(2);
  expect(body.data[0]).toMatchObject({ _id: "T1", name: "Tech One", email: "t1@x.com" });
  expect(body.data[1]).toMatchObject({ _id: "T2" });
  // Admin should NOT be in the technician list.
  expect(body.data.find((d: { _id: string }) => d._id === "A1")).toBeUndefined();
});

test("admin sees empty list when no technicians registered", async () => {
  technicianDocs.length = 0;
  getSessionMock.mockResolvedValue({
    user: { id: "A1", email: "a1@x", name: "A1", role: "dicht_admin" },
  });
  authorizeMock.mockReturnValue(true);
  const res = await GET();
  expect(res.status).toBe(200);
  expect((await res.json()).data).toEqual([]);
});
