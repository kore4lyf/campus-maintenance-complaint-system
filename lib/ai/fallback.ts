interface FallbackInput {
  category: {
    defaultSeverity: "Critical" | "High" | "Medium" | "Low";
    systemType: string;
    name: string;
  };
  error: string;
}

interface AiSuggestionRecord {
  enabled: boolean;
  fallback: true;
  model: "rules";
  severity: "Critical" | "High" | "Medium" | "Low";
  rationale: string;
  categoryId: undefined;
  ranAt: Date;
  error: string;
  promptTokens: 0;
  completionTokens: 0;
  costUsd: 0;
  latencyMs: number;
}

function fallbackCategorySeverity(input: FallbackInput): AiSuggestionRecord {
  const { category, error } = input;
  const rationale = `Rules based fallback (no AI rationale) for ${category.systemType} with default ${category.defaultSeverity}; reason: ${error}`;
  return {
    enabled: true,
    fallback: true,
    model: "rules",
    severity: category.defaultSeverity,
    rationale,
    categoryId: undefined,
    ranAt: new Date(),
    error,
    promptTokens: 0,
    completionTokens: 0,
    costUsd: 0,
    latencyMs: 0,
  };
}

export { fallbackCategorySeverity };
export type { AiSuggestionRecord, FallbackInput };
