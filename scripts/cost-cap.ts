const DEFAULT_CEILING_USD = 5;

interface MonthTotals {
  promptTokens: number;
  completionTokens: number;
  estimatedCostUsd: number;
  complaintCount: number;
}

interface CheckInput {
  monthTotals: MonthTotals;
  ceilingUsd?: number;
}

interface CheckOutput {
  aiTriageFallbackToRules: boolean;
  monthlyCostUsd: number;
  ceilingUsd: number;
}

function runDailyCheck(input: CheckInput): CheckOutput {
  const ceilingUsd = input.ceilingUsd ?? DEFAULT_CEILING_USD;
  if (!Number.isFinite(ceilingUsd) || ceilingUsd <= 0) {
    throw new Error("ceilingUsd must be a positive number");
  }
  const monthlyCostUsd =
    Math.round(input.monthTotals.estimatedCostUsd * 1e6) / 1e6;
  const fallback = monthlyCostUsd >= ceilingUsd;
  return {
    aiTriageFallbackToRules: fallback,
    monthlyCostUsd,
    ceilingUsd,
  };
}

export { runDailyCheck, DEFAULT_CEILING_USD };
export type { MonthTotals, CheckInput, CheckOutput };
