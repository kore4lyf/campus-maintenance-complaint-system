import { fallbackCategorySeverity } from "./fallback";

describe("fallbackCategorySeverity", () => {
  test("returns rules-based fallback record with category default severity", () => {
    const record = fallbackCategorySeverity({
      category: {
        defaultSeverity: "Medium",
        systemType: "Cleaning",
        name: "Cleaning & Sanitation",
      },
      error: "AI call failed: timeout",
    });
    expect(record.fallback).toBe(true);
    expect(record.enabled).toBe(true);
    expect(record.severity).toBe("Medium");
    expect(record.model).toBe("rules");
    expect(record.rationale).toContain("Cleaning");
    expect(record.error).toContain("timeout");
    expect(record.promptTokens).toBe(0);
    expect(record.completionTokens).toBe(0);
    expect(record.costUsd).toBe(0);
  });

  test("preserves the category default severity across severities", () => {
    const severities = ["Critical", "High", "Medium", "Low"] as const;
    for (const severity of severities) {
      const record = fallbackCategorySeverity({
        category: {
          defaultSeverity: severity,
          systemType: "HVAC",
          name: "HVAC",
        },
        error: "reason",
      });
      expect(record.severity).toBe(severity);
    }
  });
});
