import { generateText, Output, NoObjectGeneratedError } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { z } from "zod";
import { triageSchema, type TriageOutput } from "./schemas";
import { buildUserPrompt, scrubPII } from "./prompts";
import { computeCostUsd } from "./cost";
import { fallbackCategorySeverity, type AiSuggestionRecord } from "./fallback";

type Severity = "Critical" | "High" | "Medium" | "Low";

interface TriageInput {
  description: string;
  reporterIds?: ReadonlyArray<string>;
  reporterEmails?: ReadonlyArray<string>;
  location: { name: string };
  category: {
    _id: string;
    name: string;
    systemType: string;
    defaultSeverity: Severity;
  };
}

interface TriageSuccess {
  enabled: true;
  fallback: false;
  model: string;
  severity: Severity;
  rationale: string;
  categoryId: string | undefined;
  ranAt: Date;
  promptTokens: number;
  completionTokens: number;
  costUsd: number;
  latencyMs: number;
  error?: undefined;
}

type TriageResult = TriageSuccess | AiSuggestionRecord;

function readOpenAiConfig(): { apiKey: string; baseURL: string | undefined } | null {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey || apiKey === "sk-...") {
    return null;
  }
  const baseURL = process.env.OPENAI_API_URL || undefined;
  return { apiKey, baseURL };
}

function isFallbackForced(): boolean {
  const raw = process.env.AI_TRIAGE_FALLBACK_TO_RULES;
  if (!raw) return false;
  return raw.trim().toLowerCase() === "true";
}

function resolveModelName(): string {
  return process.env.OPENAI_MODEL || "gpt-4o-mini";
}

function resolveTimeoutMs(): number {
  const raw = process.env.OPENAI_TIMEOUT_MS;
  if (!raw) return 8000;
  const parsed = Number.parseInt(raw, 10);
  if (Number.isFinite(parsed) && parsed > 0) return parsed;
  return 8000;
}

function summariseError(err: unknown): string {
  if (err instanceof Error) {
    if (err.name === "AbortError") {
      return `OpenAI call aborted after timeout (${resolveTimeoutMs()}ms)`;
    }
    return err.message.slice(0, 300);
  }
  return String(err).slice(0, 300);
}

async function callOpenAi(args: {
  prompt: string;
  systemPrompt: string;
  modelName: string;
  timeoutMs: number;
  apiKey: string;
  baseURL: string | undefined;
}): Promise<{
  output: TriageOutput;
  promptTokens: number;
  completionTokens: number;
  latencyMs: number;
}> {
  const openai = createOpenAI({
    apiKey: args.apiKey,
    baseURL: args.baseURL,
  });

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), args.timeoutMs);
  const startedAt = Date.now();

  try {
    const result = await generateText({
      model: openai(args.modelName),
      system: args.systemPrompt,
      prompt: args.prompt,
      output: Output.object({
        name: "TriageDecision",
        description:
          "Severity tier and rationale for a campus maintenance complaint.",
        schema: triageSchema,
      }),
      abortSignal: controller.signal,
      temperature: 0.2,
    });

    const latencyMs = Date.now() - startedAt;
    const promptTokens =
      result.usage?.inputTokens ?? result.usage?.promptTokens ?? 0;
    const completionTokens =
      result.usage?.outputTokens ?? result.usage?.completionTokens ?? 0;

    const parsed = result.output;
    if (!parsed) {
      throw new Error("AI SDK returned no structured output");
    }
    const validated = triageSchema.parse(parsed);
    return {
      output: validated,
      promptTokens,
      completionTokens,
      latencyMs,
    };
  } finally {
    clearTimeout(timer);
  }
}

async function triageComplaint(
  input: TriageInput,
): Promise<TriageResult> {
  const category = input.category;
  const severity = category.defaultSeverity;

  const promptInput = {
    description: input.description,
    location: { name: input.location.name },
    category: {
      name: category.name,
      systemType: category.systemType,
      defaultSeverity: severity,
    },
  };
  const promptBundle = buildUserPrompt(promptInput);

  const safePrompt = scrubPII({
    prompt: promptBundle.user,
    reportedReporterIds: input.reporterIds,
    reportedEmails: input.reporterEmails,
  });

  if (isFallbackForced()) {
    return fallbackCategorySeverity({
      category,
      error: "AI_TRIAGE_FALLBACK_TO_RULES is set; rules path active",
    });
  }

  const config = readOpenAiConfig();
  if (!config) {
    return fallbackCategorySeverity({
      category,
      error: "OPENAI_API_KEY not configured; rules path active",
    });
  }

  try {
    const { output, promptTokens, completionTokens, latencyMs } =
      await callOpenAi({
        prompt: safePrompt,
        systemPrompt: promptBundle.system,
        modelName: resolveModelName(),
        timeoutMs: resolveTimeoutMs(),
        apiKey: config.apiKey,
        baseURL: config.baseURL,
      });

    const costUsd = computeCostUsd({
      model: resolveModelName(),
      promptTokens,
      completionTokens,
    });

    return {
      enabled: true,
      fallback: false,
      model: resolveModelName(),
      severity: output.severity,
      rationale: output.rationale,
      categoryId: undefined,
      ranAt: new Date(),
      promptTokens,
      completionTokens,
      costUsd,
      latencyMs,
    };
  } catch (err) {
    const summary = summariseError(err);
    if (NoObjectGeneratedError.isInstance(err)) {
      return fallbackCategorySeverity({
        category,
        error: `NoObjectGeneratedError: ${summary}`,
      });
    }
    if (err instanceof z.ZodError) {
      return fallbackCategorySeverity({
        category,
        error: `Zod parse failure: ${summary}`,
      });
    }
    return fallbackCategorySeverity({
      category,
      error: summary,
    });
  }
}

export { triageComplaint };
export type { TriageInput, TriageResult, TriageSuccess, Severity };
