const generateTextMock = jest.fn();

jest.mock("ai", () => ({
  generateText: (...args: unknown[]) => generateTextMock(...args),
  Output: {
    object: (opts: unknown) => opts,
  },
  NoObjectGeneratedError: class NoObjectGeneratedError extends Error {
    static isInstance(err: unknown): boolean {
      return err instanceof NoObjectGeneratedError;
    }
  },
}));

jest.mock("@ai-sdk/openai", () => ({
  createOpenAI: () => ({
    chat: (model: string) => ({ provider: "openai", modelId: model }),
    responses: (model: string) => ({ provider: "openai", modelId: model }),
    (model: string) => ({ provider: "openai", modelId: model }),
  }),
}));

import { triageComplaint } from "./triage";

const previousEnv = { ...process.env };

beforeEach(() => {
  generateTextMock.mockReset();
  process.env.OPENAI_API_KEY = "sk-test-key";
  process.env.OPENAI_MODEL = "gpt-4o-mini";
  process.env.OPENAI_TIMEOUT_MS = "8000";
  process.env.AI_TRIAGE_FALLBACK_TO_RULES = "";
});

afterEach(() => {
  process.env = { ...previousEnv };
});

describe("triageComplaint", () => {
  const baseInput = {
    description: "Severe water leak in Engineering Block basement.",
    location: { name: "Engineering Block" },
    category: {
      _id: "60f1b9c8e7d8e2b1a4f3e2c1",
      name: "Plumbing Issues",
      systemType: "Plumbing",
      defaultSeverity: "High" as const,
    },
  };

  test("returns AI result with severity, rationale, tokens, and cost", async () => {
    generateTextMock.mockResolvedValueOnce({
      output: {
        categoryName: "Plumbing Issues",
        severity: "Critical",
        rationale: "Basement flooding requires immediate response.",
      },
      usage: { promptTokens: 120, completionTokens: 60 },
    });

    const result = await triageComplaint(baseInput);
    expect(result.fallback).toBe(false);
    if (!result.fallback) {
      expect(result.enabled).toBe(true);
      expect(result.severity).toBe("Critical");
      expect(result.rationale).toContain("flooding");
      expect(result.promptTokens).toBe(120);
      expect(result.completionTokens).toBe(60);
      expect(result.costUsd).toBeGreaterThan(0);
      expect(result.model).toBe("gpt-4o-mini");
    }
  });

  test("falls back to category default severity when AI_TRIAGE_FALLBACK_TO_RULES=true", async () => {
    process.env.AI_TRIAGE_FALLBACK_TO_RULES = "true";
    const result = await triageComplaint(baseInput);
    expect(generateTextMock).not.toHaveBeenCalled();
    expect(result.fallback).toBe(true);
    expect(result.severity).toBe("High");
  });

  test("falls back when OPENAI_API_KEY is missing", async () => {
    delete process.env.OPENAI_API_KEY;
    const result = await triageComplaint(baseInput);
    expect(generateTextMock).not.toHaveBeenCalled();
    expect(result.fallback).toBe(true);
    expect(result.severity).toBe("High");
  });

  test("falls back when the call throws (timeout / network)", async () => {
    generateTextMock.mockRejectedValueOnce(new Error("aborted"));
    const result = await triageComplaint(baseInput);
    expect(result.fallback).toBe(true);
    expect(result.severity).toBe("High");
  });

  test("strips reporter email substring before calling the model", async () => {
    generateTextMock.mockResolvedValueOnce({
      output: {
        categoryName: "Plumbing Issues",
        severity: "Medium",
        rationale: "Slow drip under the sink.",
      },
      usage: { promptTokens: 80, completionTokens: 40 },
    });
    await triageComplaint({
      ...baseInput,
      reporterEmails: ["alice@example.com"],
    });
    const callArg = generateTextMock.mock.calls[0]?.[0] as { prompt?: string };
    expect(callArg?.prompt).not.toContain("alice@example.com");
  });
});
