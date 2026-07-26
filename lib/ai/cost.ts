interface ModelRates {
  promptPer1kUsd: number;
  completionPer1kUsd: number;
}

const RATE_SHEET: Record<string, ModelRates> = {
  "gpt-4o-mini": { promptPer1kUsd: 0.00015, completionPer1kUsd: 0.0006 },
  "gpt-4o": { promptPer1kUsd: 0.005, completionPer1kUsd: 0.015 },
  "gpt-4.1-mini": { promptPer1kUsd: 0.0004, completionPer1kUsd: 0.0016 },
  "gpt-4.1": { promptPer1kUsd: 0.002, completionPer1kUsd: 0.008 },
};

const FALLBACK_RATES: ModelRates = {
  promptPer1kUsd: 0.00015,
  completionPer1kUsd: 0.0006,
};

function resolveRates(model: string | undefined): ModelRates {
  if (!model) return FALLBACK_RATES;
  return RATE_SHEET[model] ?? FALLBACK_RATES;
}

function computeCostUsd(args: {
  model: string | undefined;
  promptTokens: number;
  completionTokens: number;
}): number {
  const { model, promptTokens, completionTokens } = args;
  const rates = resolveRates(model);
  const promptCost = (Math.max(0, promptTokens) / 1000) * rates.promptPer1kUsd;
  const completionCost =
    (Math.max(0, completionTokens) / 1000) * rates.completionPer1kUsd;
  const total = promptCost + completionCost;
  return Math.round(total * 1e6) / 1e6;
}

export { computeCostUsd, resolveRates };
export type { ModelRates };
