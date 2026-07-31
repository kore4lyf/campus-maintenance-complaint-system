jest.mock("@/lib/ai/triage", () => ({
  triageComplaint: jest.fn(),
}));

jest.mock("@/lib/storage/cloudinary", () => ({
  compressAndUpload: jest.fn().mockResolvedValue({
    url: "https://example.cloudinary.com/x.jpg",
    publicId: "x",
    bytes: 1024,
    format: "jpg",
  }),
}));

jest.mock("@/lib/db/connection", () => ({
  connect: jest.fn(async () => undefined),
}));

jest.mock("@/lib/db/models/complaint", () => ({
  ComplaintModel: {
    create: jest.fn().mockResolvedValue({
      _id: "60f1b9c8e7d8e2b1a4f3ed11",
      status: "Submitted",
      slaAcknowledgeBy: new Date(),
      slaResolveBy: new Date(),
    }),
  },
}));

jest.mock("@/lib/db/models/category", () => ({
  CategoryModel: {
    findById: jest.fn(async () => ({
      _id: "60f1b9c8e7d8e2b1a4f3ec11",
      name: "Plumbing Issues",
      systemType: "Plumbing",
      defaultSeverity: "High",
      slaAcknowledgeHrs: 4,
      slaResolveHrs: 24,
    })),
  },
}));

jest.mock("@/lib/db/models/location", () => ({
  LocationModel: {
    findById: jest.fn(async () => ({
      _id: "60f1b9c8e7d8e2b1a4f3ec22",
      name: "Engineering Block",
      area: "academic",
    })),
  },
}));

jest.mock("@/lib/db/models/user", () => ({
  UserModel: {
    create: jest.fn().mockResolvedValue({
      _id: "60f1b9c8e7d8e2b1a4f3ed99",
    }),
  },
}));

jest.mock("@/lib/db/helpers/duplicate-detection", () => ({
  findOrCreateDuplicateParent: jest.fn(async () => ({
    isDuplicate: false,
    parentComplaintId: null,
  })),
}));

jest.mock("@/lib/auth/config", () => ({
  getSession: jest.fn().mockResolvedValue({
    user: { id: "60f1b9c8e7d8e2b1a4f3ed88", role: "reporter" },
  }),
}));

jest.mock("next/navigation", () => ({
  useRouter: () => ({
    push: jest.fn(),
    refresh: jest.fn(),
  }),
}));

import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { ComplaintForm } from "./ComplaintForm";
import { triageComplaint } from "@/lib/ai/triage";

const triageMock = triageComplaint as jest.Mock;

const CATEGORIES = [
  { id: "60f1b9c8e7d8e2b1a4f3ec11", name: "Plumbing Issues", systemType: "Plumbing" },
];
const LOCATIONS = [
  { id: "60f1b9c8e7d8e2b1a4f3ec22", name: "Engineering Block", area: "academic" },
];

const originalFetch = global.fetch;

beforeEach(() => {
  jest.clearAllMocks();
  triageMock.mockResolvedValue({
    enabled: true,
    fallback: false,
    model: "gpt-4o-mini",
    severity: "High",
    rationale: "Burst pipe in basement; flooding imminent.",
    categoryId: undefined,
    ranAt: new Date(),
    promptTokens: 90,
    completionTokens: 40,
    costUsd: 0.0001,
    latencyMs: 1000,
  });
  global.fetch = jest.fn(async () => {
    return new Response(
      JSON.stringify({ data: { id: "60f1b9c8e7d8e2b1a4f3ed11", redirectTo: "/complaints/60f1b9c8e7d8e2b1a4f3ed11" } }),
      { status: 201, headers: { "content-type": "application/json" } },
    );
  }) as typeof fetch;
});

afterEach(() => {
  global.fetch = originalFetch;
});

describe("ComplaintForm", () => {
  test("renders every required field including the anonymous toggle and the submit button", () => {
    render(<ComplaintForm categories={CATEGORIES} locations={LOCATIONS} />);
    expect(screen.getByLabelText(/category/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/location/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/describe the fault/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/choose photo/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/submit anonymously/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /submit complaint/i })).toBeInTheDocument();
  });

  test("blocks submission with an inline error when the description is too short", async () => {
    render(<ComplaintForm categories={CATEGORIES} locations={LOCATIONS} />);
    fireEvent.change(screen.getByLabelText(/category/i), {
      target: { value: CATEGORIES[0].id },
    });
    fireEvent.change(screen.getByLabelText(/location/i), {
      target: { value: LOCATIONS[0].id },
    });
    fireEvent.change(screen.getByLabelText(/describe the fault/i), {
      target: { value: "too short" },
    });
    fireEvent.click(screen.getByRole("button", { name: /submit complaint/i }));
    await waitFor(() => {
      expect(screen.getByText(/at least 10 characters/i)).toBeInTheDocument();
    });
    expect(global.fetch).not.toHaveBeenCalled();
  });

  test("happy path POSTs to /api/complaints and never calls triage from the client", async () => {
    render(<ComplaintForm categories={CATEGORIES} locations={LOCATIONS} />);
    fireEvent.change(screen.getByLabelText(/category/i), {
      target: { value: CATEGORIES[0].id },
    });
    fireEvent.change(screen.getByLabelText(/location/i), {
      target: { value: LOCATIONS[0].id },
    });
    fireEvent.change(screen.getByLabelText(/describe the fault/i), {
      target: { value: "Burst pipe in basement flooding the lab." },
    });
    fireEvent.click(screen.getByRole("button", { name: /submit complaint/i }));
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });
    const called = (global.fetch as jest.Mock).mock.calls[0];
    const calledUrl = called[0] as string;
    const calledInit = called[1] as RequestInit;
    expect(calledUrl).toMatch(/\/api\/complaints$/);
    expect(calledInit.method).toBe("POST");
    expect(calledInit.body).toBeInstanceOf(FormData);
    expect(triageMock).not.toHaveBeenCalled();
  });

  test("shows a server error message when the API rejects the submission", async () => {
    global.fetch = jest.fn(async () => {
      const body = JSON.stringify({ error: { code: "invalid_complaint", message: "Bad description" } });
      return {
        ok: false,
        status: 422,
        json: async () => JSON.parse(body),
      } as unknown as Response;
    }) as typeof fetch;
    render(<ComplaintForm categories={CATEGORIES} locations={LOCATIONS} />);
    fireEvent.change(screen.getByLabelText(/category/i), {
      target: { value: CATEGORIES[0].id },
    });
    fireEvent.change(screen.getByLabelText(/location/i), {
      target: { value: LOCATIONS[0].id },
    });
    fireEvent.change(screen.getByLabelText(/describe the fault/i), {
      target: { value: "Burst pipe in basement flooding the lab." },
    });
    fireEvent.click(screen.getByRole("button", { name: /submit complaint/i }));
    const alert = await screen.findByRole("alert", {}, { timeout: 5000 });
    expect(alert).toBeInTheDocument();
    expect(alert.textContent).toMatch(/Bad description|Submission failed|422/);
  });
});
