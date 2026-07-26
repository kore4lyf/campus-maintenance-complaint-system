jest.mock("@/lib/db/connection", () => ({
  connect: jest.fn(async () => undefined),
}));

const complaintFindByIdMock = jest.fn();
jest.mock("@/lib/db/models/complaint", () => ({
  ComplaintModel: {
    findById: (...args: unknown[]) => complaintFindByIdMock(...args),
  },
}));

const assignmentFindOneMock = jest.fn();
jest.mock("@/lib/db/models/assignment", () => ({
  AssignmentModel: {
    findOne: (...args: unknown[]) => assignmentFindOneMock(...args),
  },
}));

jest.mock("@/lib/auth/config", () => ({
  getSession: jest.fn(),
}));

import { GET } from "./route";
import { getSession } from "@/lib/auth/config";

const getSessionMock = getSession as jest.Mock;

const OWNER_ID = "60f1b9c8e7d8e2b1a4f3ed88";
const ADMIN_ID = "60f1b9c8e7d8e2b1a4f3ed99";
const TECH_ID = "60f1b9c8e7d8e2b1a4f3edaa";
const COMPLAINT_ID = "60f1b9c8e7d8e2b1a4f3edbb";

function complaintDoc(opts?: { reporterId?: string; status?: string; priority?: string }) {
  const reporterId = opts?.reporterId ?? OWNER_ID;
  return {
    _id: COMPLAINT_ID,
    reporterId,
    isAnonymous: false,
    categoryId: "60f1b9c8e7d8e2b1a4f3ec11",
    locationId: "60f1b9c8e7d8e2b1a4f3ec22",
    description: "Burst pipe in basement flooding the lab.",
    photoUrls: ["https://example.cloudinary.com/x.jpg"],
    priority: opts?.priority ?? "High",
    slaAcknowledgeBy: new Date(),
    slaResolveBy: new Date(),
    status: opts?.status ?? "Submitted",
    escalated: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    aiSuggestion: {
      enabled: true,
      fallback: false,
      severity: "Critical",
      rationale: "Severe flooding requires immediate response.",
      model: "gpt-4o-mini",
      ranAt: new Date(),
      categoryId: null,
      latencyMs: 1000,
    },
    parentComplaintId: null,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  complaintFindByIdMock.mockImplementation(async () => complaintDoc());
  assignmentFindOneMock.mockResolvedValue(null);
});

describe("GET /api/complaints/[id]", () => {
  test("returns 401 when there is no session", async () => {
    getSessionMock.mockResolvedValueOnce(null);
    const res = await GET(new Request("http://x"), {
      params: Promise.resolve({ id: COMPLAINT_ID }),
    });
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error?.code).toBe("unauthenticated");
  });

  test("returns 404 when complaint id is malformed", async () => {
    const res = await GET(new Request("http://x"), {
      params: Promise.resolve({ id: "not-an-id" }),
    });
    expect(res.status).toBe(404);
  });

  test("strips AI rationale and priority from a reporter's view of their own complaint", async () => {
    getSessionMock.mockResolvedValueOnce({
      user: { id: OWNER_ID, role: "reporter" },
    });
    const res = await GET(new Request("http://x"), {
      params: Promise.resolve({ id: COMPLAINT_ID }),
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { data: Record<string, unknown> };
    expect(body.data.status).toBe("Submitted");
    expect(body.data.priority).toBeUndefined();
    expect(body.data.aiSuggestion).toBeUndefined();
    expect(body.data.description).toBeDefined();
    expect(body.data.photoUrls).toEqual(["https://example.cloudinary.com/x.jpg"]);
  });

  test("returns 403 when reporter tries to view a complaint they do not own", async () => {
    getSessionMock.mockResolvedValueOnce({
      user: { id: ADMIN_ID, role: "reporter" },
    });
    const res = await GET(new Request("http://x"), {
      params: Promise.resolve({ id: COMPLAINT_ID }),
    });
    expect(res.status).toBe(403);
  });

  test("allows admin to view any complaint and keeps AI rationale fields", async () => {
    getSessionMock.mockResolvedValueOnce({
      user: { id: ADMIN_ID, role: "dicht_admin" },
    });
    const res = await GET(new Request("http://x"), {
      params: Promise.resolve({ id: COMPLAINT_ID }),
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { data: Record<string, unknown> };
    expect(body.data.priority).toBe("High");
    const ai = body.data.aiSuggestion as Record<string, unknown>;
    expect(ai.rationale).toBeDefined();
    expect(ai.model).toBeDefined();
    expect(ai.ranAt).toBeDefined();
  });

  test("lets a technician see assigned complaints with priority but no AI rationale", async () => {
    assignmentFindOneMock.mockResolvedValueOnce({ _id: "60f1b9c8e7d8e2b1a4f3edcc" });
    getSessionMock.mockResolvedValueOnce({
      user: { id: TECH_ID, role: "dicht_technician" },
    });
    const res = await GET(new Request("http://x"), {
      params: Promise.resolve({ id: COMPLAINT_ID }),
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { data: Record<string, unknown> };
    expect(body.data.priority).toBe("High");
    expect(body.data.aiSuggestion).toBeUndefined();
  });

  test("returns 403 when technician is not assigned to the complaint", async () => {
    assignmentFindOneMock.mockResolvedValueOnce(null);
    getSessionMock.mockResolvedValueOnce({
      user: { id: TECH_ID, role: "dicht_technician" },
    });
    const res = await GET(new Request("http://x"), {
      params: Promise.resolve({ id: COMPLAINT_ID }),
    });
    expect(res.status).toBe(403);
  });
});
