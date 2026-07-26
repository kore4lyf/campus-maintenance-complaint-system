import mongoose from "mongoose";
import { connect } from "@/lib/db/connection";
import { ComplaintModel } from "@/lib/db/models/complaint";
import { computeCostUsd } from "@/lib/ai/cost";
import { runDailyCheck, DEFAULT_CEILING_USD, type MonthTotals } from "./cost-cap";

export { runDailyCheck, type MonthTotals };

function startOfMonthUtc(now: Date): Date {
  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0, 0),
  );
}

async function aggregateMonthTotals(): Promise<MonthTotals> {
  const now = new Date();
  const since = startOfMonthUtc(now);

  const pipeline: mongoose.PipelineStage[] = [
    {
      $match: {
        "aiSuggestion.ranAt": { $gte: since },
        "aiSuggestion.enabled": true,
        "aiSuggestion.fallback": false,
      },
    },
    {
      $group: {
        _id: null,
        promptTokens: {
          $sum: { $ifNull: ["$aiSuggestion.promptTokens", 0] },
        },
        completionTokens: {
          $sum: { $ifNull: ["$aiSuggestion.completionTokens", 0] },
        },
        estimatedCostUsd: {
          $sum: { $ifNull: ["$aiSuggestion.costUsd", 0] },
        },
        complaintCount: { $sum: 1 },
      },
    },
    {
      $project: {
        _id: 0,
        promptTokens: 1,
        completionTokens: 1,
        estimatedCostUsd: 1,
        complaintCount: 1,
      },
    },
  ];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- aggregate return type
  const result = (await ComplaintModel.aggregate(pipeline as any)) as Array<{
    promptTokens?: number;
    completionTokens?: number;
    estimatedCostUsd?: number;
    complaintCount?: number;
  }>;

  const first = result[0];
  return {
    promptTokens: first?.promptTokens ?? 0,
    completionTokens: first?.completionTokens ?? 0,
    estimatedCostUsd: first?.estimatedCostUsd ?? 0,
    complaintCount: first?.complaintCount ?? 0,
  };
}

function readCeilingUsd(): number {
  const raw = process.env.AI_COST_CEILING_USD;
  if (!raw) return DEFAULT_CEILING_USD;
  const parsed = Number.parseFloat(raw);
  if (!Number.isFinite(parsed) || parsed <= 0) return DEFAULT_CEILING_USD;
  return parsed;
}

async function main(): Promise<void> {
  await connect();
  const totals = await aggregateMonthTotals();
  const output = runDailyCheck({
    monthTotals: totals,
    ceilingUsd: readCeilingUsd(),
  });

  const syntheticCost = computeCostUsd({
    model: process.env.OPENAI_MODEL,
    promptTokens: totals.promptTokens,
    completionTokens: totals.completionTokens,
  });

  // eslint-disable-next-line no-console -- CLI output
  console.log(
    JSON.stringify(
      {
        ...output,
        recordedCostUsd: totals.estimatedCostUsd,
        syntheticRecheckUsd: syntheticCost,
        prospect: {
          aiTriageFallbackToRules: output.aiTriageFallbackToRules
            ? "true"
            : "false",
        },
        totals: {
          ...totals,
          ceilingUsd: output.ceilingUsd,
        },
        ranAt: new Date().toISOString(),
      },
      null,
      2,
    ),
  );
}

main().catch((err) => {
  // eslint-disable-next-line no-console -- CLI exit trail
  console.error("ai-cost-check failed:", err);
  process.exit(1);
});
