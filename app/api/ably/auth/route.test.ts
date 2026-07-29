/**
 * @jest-environment node
 */
import { NextResponse } from "next/server";

const mockCreateTokenRequest = jest.fn();

jest.mock("ably", () => ({
  __esModule: true,
  default: {
    Rest: jest.fn().mockImplementation(() => ({
      auth: {
        createTokenRequest: mockCreateTokenRequest,
      },
    })),
  },
}));

jest.mock("@/lib/auth/config", () => ({
  getAuth: jest.fn(),
  getSession: jest.fn(),
}));

import { getSession } from "@/lib/auth/config";
import { GET } from "./route";

describe("GET /api/ably/auth", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.ABLY_API_KEY = "appId.keyId:keySecret";
  });

  afterEach(() => {
    delete process.env.ABLY_API_KEY;
  });

  test("returns 401 when there is no authenticated session", async () => {
    (getSession as jest.Mock).mockResolvedValue(null);

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data).toEqual({ error: "Unauthorized" });
  });

  test("returns 500 when ABLY_API_KEY is missing", async () => {
    delete process.env.ABLY_API_KEY;
    (getSession as jest.Mock).mockResolvedValue({ user: { id: "user-1" } });

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data).toEqual({ error: "Ably is not configured" });
  });

  test("returns a token request for the authenticated user", async () => {
    const tokenRequest = { token: "ably-token-123", expiresIn: 60 };
    (getSession as jest.Mock).mockResolvedValue({ user: { id: "user-1" } });
    mockCreateTokenRequest.mockResolvedValue(tokenRequest);

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual(tokenRequest);
  });
});
