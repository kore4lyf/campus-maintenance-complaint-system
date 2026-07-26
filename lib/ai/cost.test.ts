import { computeCostUsd, resolveRates } from "./cost";

describe("computeCostUsd", () => {
  test("gpt-4o-mini at 1k prompt + 1k completion matches rate sheet", () => {
    const usd = computeCostUsd({
      model: "gpt-4o-mini",
      promptTokens: 1000,
      completionTokens: 1000,
    });
    expect(usd).toBeCloseTo(0.00015 + 0.0006, 6);
  });

  test("zero tokens return zero", () => {
    expect(
      computeCostUsd({ model: "gpt-4o-mini", promptTokens: 0, completionTokens: 0 }),
    ).toBe(0);
  });

  test("undefined model falls back to default rates", () => {
    const usd = computeCostUsd({
      model: undefined,
      promptTokens: 2000,
      completionTokens: 500,
    });
    expect(usd).toBeCloseTo(0.0003 + 0.0003, 6);
  });

  test("negative tokens are clamped to zero", () => {
    expect(
      computeCostUsd({ model: "gpt-4o-mini", promptTokens: -100, completionTokens: -50 }),
    ).toBe(0);
  });

  test("unknown model uses fallback rate sheet", () => {
    const rates = resolveRates("mystery-model");
    expect(rates.promptPer1kUsd).toBeGreaterThanOrEqual(0);
  });

  test("rates are non-negative for every supported model", () => {
    for (const model of ["gpt-4o-mini", "gpt-4o", "gpt-4.1-mini", "gpt-4.1"]) {
      const rates = resolveRates(model);
      expect(rates.promptPer1kUsd).toBeGreaterThan(0);
      expect(rates.completionPer1kUsd).toBeGreaterThan(0);
    }
  });
});
