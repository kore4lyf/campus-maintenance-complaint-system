jest.mock("@/lib/db/connection", () => ({
  connect: jest.fn(async () => undefined),
}));

jest.mock("@/lib/db/models/category", () => {
  const docs = new Map<string, unknown>();
  return {
    CategoryModel: {
      findById: jest.fn(async (id: string) => docs.get(id) ?? null),
      __seed: (id: string, doc: unknown) => docs.set(id, doc),
    },
  };
});

jest.mock("@/lib/db/models/location", () => {
  const docs = new Map<string, unknown>();
  return {
    LocationModel: {
      findById: jest.fn(async (id: string) => docs.get(id) ?? null),
      __seed: (id: string, doc: unknown) => docs.set(id, doc),
    },
  };
});

const createMock = jest.fn();

jest.mock("@/lib/db/models/complaint", () => ({
  ComplaintModel: {
    create: (...args: unknown[]) => createMock(...args),
  },
}));

const userCreateMock = jest.fn();

jest.mock("@/lib/db/models/user", () => ({
  UserModel: {
    create: (...args: unknown[]) => userCreateMock(...args),
  },
}));

jest.mock("@/lib/db/helpers/duplicate-detection", () => ({
  findOrCreateDuplicateParent: jest.fn(async () => ({
    isDuplicate: false,
    parentComplaintId: null,
  })),
}));

jest.mock("@/lib/auth/config", () => ({
  getSession: jest.fn(),
}));

jest.mock("@/lib/ai/triage", () => ({
  triageComplaint: jest.fn(),
}));

jest.mock("@/lib/storage/cloudinary", () => ({
  compressAndUpload: jest.fn(),
}));

jest.mock("@/lib/auth/anonymous-token", () => ({
  signAnonymousToken: jest.fn(),
  verifyAnonymousToken: jest.fn(),
}));

import { POST } from "./route";
import { CategoryModel } from "@/lib/db/models/category";
import { LocationModel } from "@/lib/db/models/location";
import { getSession } from "@/lib/auth/config";
import { triageComplaint } from "@/lib/ai/triage";
import { compressAndUpload } from "@/lib/storage/cloudinary";
import { signAnonymousToken, verifyAnonymousToken } from "@/lib/auth/anonymous-token";
import { findOrCreateDuplicateParent } from "@/lib/db/helpers/duplicate-detection";

const getSessionMock = getSession as jest.Mock;
const triageMock = triageComplaint as jest.Mock;
const compressMock = compressAndUpload as jest.Mock;
const signTokenMock = signAnonymousToken as jest.Mock;
const verifyTokenMock = verifyAnonymousToken as jest.Mock;
const dupMock = findOrCreateDuplicateParent as jest.Mock;
const categoryModel = CategoryModel as jest.Mocked<typeof CategoryModel> & {
  __seed: (id: string, doc: unknown) => void;
};
const locationModel = LocationModel as jest.Mocked<typeof LocationModel> & {
  __seed: (id: string, doc: unknown) => void;
};

const CATEGORY_ID = "60f1b9c8e7d8e2b1a4f3ec11";
const LOCATION_ID = "60f1b9c8e7d8e2b1a4f3ec22";

beforeEach(() => {
  jest.clearAllMocks();
  categoryModel.__seed(CATEGORY_ID, {
    _id: CATEGORY_ID,
    name: "Plumbing Issues",
    systemType: "Plumbing",
    defaultSeverity: "High",
    slaAcknowledgeHrs: 4,
    slaResolveHrs: 24,
  });
  locationModel.__seed(LOCATION_ID, {
    _id: LOCATION_ID,
    name: "Engineering Block",
    area: "academic",
  });
  compressMock.mockResolvedValue({
    url: "https://example.cloudinary.com/complaints/test.jpg",
    publicId: "complaints/test",
    bytes: 1024,
    format: "jpg",
  });
  triageMock.mockResolvedValue({
    enabled: true,
    fallback: false,
    model: "gpt-4o-mini",
    severity: "High",
    rationale: "Burst pipe in basement; water damage imminent.",
    categoryId: undefined,
    ranAt: new Date("2026-07-26T12:00:00.000Z"),
    promptTokens: 100,
    completionTokens: 50,
    costUsd: 0.0001,
    latencyMs: 1200,
  });
  dupMock.mockResolvedValue({ isDuplicate: false, parentComplaintId: null });
  signTokenMock.mockResolvedValue("test.jwt.token");
  verifyTokenMock.mockResolvedValue({
    sub: "60f1b9c8e7d8e2b1a4f3ed99",
    sid: "sid-1",
    iat: 1,
    exp: 7_776_000,
  });
  getSessionMock.mockResolvedValue({
    user: {
      id: "60f1b9c8e7d8e2b1a4f3ed88",
      email: "alice@example.com",
      role: "reporter",
    },
  });
  userCreateMock.mockImplementation(async (payload: unknown) => ({
    _id: "60f1b9c8e7d8e2b1a4f3ed99",
    ...(typeof payload === "object" && payload !== null ? payload : {}),
  }));
});

function makeMultipartRequest(
  fields: Record<string, string>,
  photo?: File,
): Request {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) {
    fd.set(k, v);
  }
  if (photo) fd.set("photo", photo);
  return new Request("http://localhost/api/complaints", {
    method: "POST",
    body: fd,
  });
}

function makeJsonRequest(payload: Record<string, unknown>): Request {
  return new Request("http://localhost/api/complaints", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  });
}

describe("POST /api/complaints", () => {
  test("rejects a description shorter than 10 characters with invalid_complaint", async () => {
    const res = await POST(makeJsonRequest({
      categoryId: CATEGORY_ID,
      locationId: LOCATION_ID,
      description: "short",
      isAnonymous: false,
    }));
    expect(res.status).toBe(422);
    const body = await res.json();
    expect(body.error?.code).toBe("invalid_complaint");
  });

  test("rejects an unauthenticated non-anonymous request with 401", async () => {
    getSessionMock.mockResolvedValueOnce(null);
    const res = await POST(makeJsonRequest({
      categoryId: CATEGORY_ID,
      locationId: LOCATION_ID,
      description: "Valid description with enough characters.",
      isAnonymous: false,
    }));
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error?.code).toBe("unauthenticated");
  });

  test("persists a complaint with AI priority on the happy path and returns redirectTo", async () => {
    createMock.mockResolvedValueOnce({
      _id: "60f1b9c8e7d8e2b1a4f3ed11",
      status: "Submitted",
      slaAcknowledgeBy: new Date(),
      slaResolveBy: new Date(),
      escalated: false,
      aiSuggestion: { enabled: true, fallback: false },
      parentComplaintId: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    const res = await POST(makeJsonRequest({
      categoryId: CATEGORY_ID,
      locationId: LOCATION_ID,
      description: "Burst pipe in basement flooding the lab.",
      isAnonymous: false,
    }));
    expect(res.status).toBe(201);
    const body = (await res.json()) as {
      data: { id: string; redirectTo: string; trackerUrl?: string };
    };
    expect(body.data.id).toBe("60f1b9c8e7d8e2b1a4f3ed11");
    expect(body.data.redirectTo).toMatch(/^\/complaints\//);
    expect(body.data.trackerUrl).toBeUndefined();
    expect(triageMock).toHaveBeenCalledTimes(1);
    expect(createMock).toHaveBeenCalledTimes(1);
    const createArg = createMock.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(createArg.priority).toBe("High");
    expect(createArg.status).toBe("Submitted");
    expect(createArg.reporterId).toBe("60f1b9c8e7d8e2b1a4f3ed88");
    expect(createArg.parentComplaintId).toBeUndefined();
  });

  test("uses category.defaultSeverity when AI triage falls back (no AI call)", async () => {
    createMock.mockResolvedValueOnce({
      _id: "60f1b9c8e7d8e2b1a4f3ed11",
      status: "Submitted",
      slaAcknowledgeBy: new Date(),
      slaResolveBy: new Date(),
      escalated: false,
      aiSuggestion: { enabled: true, fallback: true },
      parentComplaintId: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    triageMock.mockResolvedValueOnce({
      enabled: true,
      fallback: true,
      model: "rules",
      severity: "High",
      rationale: "Timeout fallback",
      categoryId: undefined,
      ranAt: new Date(),
      error: "timeout",
      promptTokens: 0,
      completionTokens: 0,
      costUsd: 0,
      latencyMs: 8000,
    });

    const res = await POST(makeJsonRequest({
      categoryId: CATEGORY_ID,
      locationId: LOCATION_ID,
      description: "Burst pipe in basement flooding the lab.",
      isAnonymous: false,
    }));
    expect(res.status).toBe(201);
    const createArg = createMock.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(createArg.priority).toBe("High");
    expect(createArg.aiSuggestion).toMatchObject({ fallback: true });
  });

  test("skips AI and clusters as duplicate when parent exists in window", async () => {
    createMock.mockResolvedValueOnce({
      _id: "60f1b9c8e7d8e2b1a4f3ed11",
      status: "Submitted",
      slaAcknowledgeBy: new Date(),
      slaResolveBy: new Date(),
      escalated: false,
      aiSuggestion: { enabled: true, fallback: true },
      parentComplaintId: "60f1b9c8e7d8e2b1a4f3ed77",
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    dupMock.mockResolvedValueOnce({
      isDuplicate: true,
      parentComplaintId: "60f1b9c8e7d8e2b1a4f3ed77",
    });
    const res = await POST(makeJsonRequest({
      categoryId: CATEGORY_ID,
      locationId: LOCATION_ID,
      description: "Burst pipe in basement flooding the lab.",
      isAnonymous: false,
    }));
    expect(res.status).toBe(201);
    expect(triageMock).not.toHaveBeenCalled();
    const createArg = createMock.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(createArg.parentComplaintId).toBe("60f1b9c8e7d8e2b1a4f3ed77");
  });

  test("anonymous submission creates hidden user and returns a trackerUrl", async () => {
    createMock.mockResolvedValueOnce({
      _id: "60f1b9c8e7d8e2b1a4f3ed22",
      status: "Submitted",
      slaAcknowledgeBy: new Date(),
      slaResolveBy: new Date(),
      escalated: false,
      aiSuggestion: { enabled: true, fallback: false },
      parentComplaintId: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    const res = await POST(makeJsonRequest({
      categoryId: CATEGORY_ID,
      locationId: LOCATION_ID,
      description: "Anonymous report: pipe burst in basement.",
      isAnonymous: true,
    }));
    expect(res.status).toBe(201);
    expect(userCreateMock).toHaveBeenCalledTimes(1);
    expect(signTokenMock).toHaveBeenCalledTimes(1);
    const body = (await res.json()) as {
      data: { id: string; redirectTo: string; trackerUrl?: string };
    };
    expect(body.data.trackerUrl).toMatch(/^\/track\//);
    expect(body.data.redirectTo).toMatch(/^\/track\//);
    expect(compressMock).not.toHaveBeenCalled();
    const userCreateArg = userCreateMock.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(userCreateArg.role).toBe("reporter");
    expect(userCreateArg.name).toBe("Anonymous Reporter");
    const createArg = createMock.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(createArg.isAnonymous).toBe(true);
    expect(createArg.reporterId).toBe("60f1b9c8e7d8e2b1a4f3ed99");
  });

  test("rejects unknown category with 422 invalid_category", async () => {
    const res = await POST(makeJsonRequest({
      categoryId: "60f1b9c8e7d8e2b1a4f3ffff",
      locationId: LOCATION_ID,
      description: "Valid description with enough characters.",
      isAnonymous: false,
    }));
    expect(res.status).toBe(422);
    const body = await res.json();
    expect(body.error?.code).toBe("invalid_category");
  });

  test("uploads the photo via compressAndUpload when a file is attached", async () => {
    createMock.mockResolvedValueOnce({
      _id: "60f1b9c8e7d8e2b1a4f3ed33",
      status: "Submitted",
      slaAcknowledgeBy: new Date(),
      slaResolveBy: new Date(),
      escalated: false,
      aiSuggestion: { enabled: true, fallback: false },
      parentComplaintId: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    const photoBytes = new Uint8Array(1024);
    const photoFile = new File([photoBytes], "evidence.jpg", {
      type: "image/jpeg",
    });
    const req = makeMultipartRequest(
      {
        categoryId: CATEGORY_ID,
        locationId: LOCATION_ID,
        description: "Burst pipe in basement flooding the lab.",
        isAnonymous: "false",
      },
      photoFile,
    );
    const res = await POST(req);
    expect(res.status).toBe(201);
    expect(compressMock).toHaveBeenCalledTimes(1);
    const createArg = createMock.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(createArg.photoUrls).toEqual([
      "https://example.cloudinary.com/complaints/test.jpg",
    ]);
  });
});
