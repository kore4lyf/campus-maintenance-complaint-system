import { runDailyCheck } from "./cost-cap";

describe("runDailyCheck", () => {
  test("returns aiTriageFallbackToRules=true when monthly cost equals ceiling", () => {
    const r = runDailyCheck({
      monthTotals: {
        promptTokens: 0,
        completionTokens: 0,
        estimatedCostUsd: 5,
        complaintCount: 100,
      },
    });
    expect(r.aiTriageFallbackToRules).toBe(true);
    expect(r.monthlyCostUsd).toBe(5);
  });

  test("returns aiTriageFallbackToRules=false when monthly cost is below ceiling", () => {
    const r = runDailyCheck({
      monthTotals: {
        promptTokens: 0,
        completionTokens: 0,
        estimatedCostUsd: 4.99,
        complaintCount: 1000,
      },
    });
    expect(r.aiTriageFallbackToRules).toBe(false);
    expect(r.monthlyCostUsd).toBe(4.99);
  });

  test("rounds fractional monthly cost to six decimals", () => {
    const r = runDailyCheck({
      monthTotals: {
        promptTokens: 0,
        completionTokens: 0,
        estimatedCostUsd: 1.234567891234,
        complaintCount: 10,
      },
    });
    expect(r.monthlyCostUsd).toBe(1.234568);
  });

  test("uses the override ceiling value when given", () => {
    const r = runDailyCheck({
      monthTotals: {
        promptTokens: 0,
        completionTokens: 0,
        estimatedCostUsd: 9,
        complaintCount: 100,
      },
      ceilingUsd: 10,
    });
    expect(r.aiTriageFallbackToRules).toBe(false);
    expect(r.ceilingUsd).toBe(10);
  });

  test("throws when the override ceiling is non-positive", () => {
    expect(() =>
      runDailyCheck({
        monthTotals: {
          promptTokens: 0,
          completionTokens: 0,
          estimatedCostUsd: 9,
          complaintCount: 100,
        },
        ceilingUsd: 0,
      }),
    ).toThrow(/ceilingUsd/);
  });
});
