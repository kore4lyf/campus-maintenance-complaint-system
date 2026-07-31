import { toPublicUser, toPublicComplaint, toPublicJSON } from "./pii";

describe("toPublicUser", () => {
  test("strips passwordHash", () => {
    const doc = {
      _id: "abc123",
      email: "test@example.com",
      name: "Alice",
      role: "reporter",
      passwordHash: "hashed_secret",
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const result = toPublicUser(doc);
    expect(result.email).toBe("test@example.com");
    expect(result.name).toBe("Alice");
    expect(result).not.toHaveProperty("passwordHash");
  });
});

describe("toPublicComplaint", () => {
  test("strips sensitive aiSuggestion fields", () => {
    const doc = {
      _id: "abc123",
      reporterId: "user1",
      isAnonymous: false,
      categoryId: "cat1",
      locationId: "loc1",
      description: "Broken light",
      photoUrls: [],
      priority: "High",
      slaAcknowledgeBy: new Date(),
      slaResolveBy: new Date(),
      status: "Submitted",
      escalated: false,
      proofPhotoUrl: null,
      aiSuggestion: {
        enabled: true,
        model: "gpt-4o-mini",
        severity: "High",
        rationale: "Electrical issue",
        promptTokens: 100,
        completionTokens: 50,
        costUsd: 0.001,
        latencyMs: 500,
        error: null,
        fallback: false,
        ranAt: new Date(),
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const result = toPublicComplaint(doc);
    expect(result.aiSuggestion).toBeDefined();
    expect(result.aiSuggestion).not.toHaveProperty("promptTokens");
    expect(result.aiSuggestion).not.toHaveProperty("completionTokens");
    expect(result.aiSuggestion).not.toHaveProperty("costUsd");
    expect(result.aiSuggestion).not.toHaveProperty("latencyMs");
    expect(result.aiSuggestion).not.toHaveProperty("error");
    expect(result.status).toBe("Submitted");
  });

  test("handles complaint without aiSuggestion", () => {
    const doc = {
      _id: "abc123",
      reporterId: "user1",
      isAnonymous: false,
      categoryId: "cat1",
      locationId: "loc1",
      description: "Broken light",
      photoUrls: [],
      priority: "High",
      slaAcknowledgeBy: new Date(),
      slaResolveBy: new Date(),
      status: "Submitted",
      escalated: false,
      proofPhotoUrl: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const result = toPublicComplaint(doc);
    expect(result.status).toBe("Submitted");
    expect(result).not.toHaveProperty("aiSuggestion");
  });
});

describe("toPublicJSON", () => {
  test("routes to toPublicUser for user docs", () => {
    const doc = {
      _id: "abc",
      email: "a@b.com",
      name: "Alice",
      role: "reporter",
      passwordHash: "secret",
    };
    const result = toPublicJSON(doc);
    expect(result).not.toHaveProperty("passwordHash");
    expect(result.email).toBe("a@b.com");
  });

  test("routes to toPublicComplaint for complaint docs", () => {
    const doc = {
      _id: "abc",
      slaAcknowledgeBy: new Date(),
      slaResolveBy: new Date(),
      status: "Submitted",
      description: "test",
    };
    const result = toPublicJSON(doc);
    expect(result.status).toBe("Submitted");
  });

  test("strips passwordHash from unknown doc shapes", () => {
    const doc = { _id: "abc", passwordHash: "secret", other: "value" };
    const result = toPublicJSON(doc);
    expect(result).not.toHaveProperty("passwordHash");
    expect(result.other).toBe("value");
  });
});
