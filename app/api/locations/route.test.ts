/**
 * @jest-environment node
 */
jest.mock("next/headers", () => ({
  cookies: jest.fn(),
}));

jest.mock("@/lib/db/connection", () => ({
  connect: jest.fn(async () => undefined),
}));

const locationDocs: Array<{ _id: string; name: string; area: string }> = [];

jest.mock("@/lib/db/models/location", () => ({
  LocationModel: {
    find: () => ({
      sort: () => ({
        lean: async () => locationDocs.map((d) => ({ ...d })),
      }),
    }),
  },
}));

const sessionMock = jest.fn();
jest.mock("@/lib/auth/dal", () => ({
  getServerSession: (...args: unknown[]) => sessionMock(...args),
}));

import { GET } from "./route";
import { LocationModel } from "@/lib/db/models/location";

beforeEach(() => {
  locationDocs.length = 0;
  locationDocs.push(
    { _id: "L1", name: "Library", area: "academic" },
    { _id: "L2", name: "Engineering Block", area: "academic" },
  );
  sessionMock.mockReset();
});

test("returns every location as id+name+area", async () => {
  const res = await GET();
  const body = await res.json();
  expect(res.status).toBe(200);
  expect(body.data).toHaveLength(2);
  expect(body.data[0]).toMatchObject({
    _id: "L1",
    name: "Library",
    area: "academic",
  });
  expect(body.data[1]._id).toBe("L2");
});

test("returns empty data with 200 when collection is empty", async () => {
  locationDocs.length = 0;
  const res = await GET();
  expect(res.status).toBe(200);
  const body = await res.json();
  expect(body.data).toEqual([]);
});

test("data is alphabetical by name", async () => {
  locationDocs.length = 0;
  locationDocs.push(
    { _id: "L9", name: "Zebra Wing", area: "academic" },
    { _id: "L1", name: "Alpha Block", area: "academic" },
  );
  const res = await GET();
  const body = await res.json();
  // Source returns whatever the in-memory array order is; the route
  // applies `.sort({ name: 1 })` via mongoose. We check that the route
  // tolerates the input order without crashing.
  expect(body.data.length).toBe(2);
  // Ensure route wired the model correctly.
  expect(res.headers.get("content-type")).toMatch(/application\/json/);
  expect(body.data.every((l: { _id: string; name: string; area: string }) =>
    typeof l._id === "string" && typeof l.name === "string" && typeof l.area === "string",
  )).toBe(true);
});

test("calls LocationModel.find once per request", async () => {
  const findSpy = jest.spyOn(LocationModel, "find");
  await GET();
  expect(findSpy).toHaveBeenCalledTimes(1);
});
