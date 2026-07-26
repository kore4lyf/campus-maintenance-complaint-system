import { triageSchema, severitySchema, SEVERITY_VALUES } from "./schemas";

describe("severitySchema", () => {
  test.each(SEVERITY_VALUES)("accepts severity %s", (value) => {
    expect(severitySchema.safeParse(value).success).toBe(true);
  });

  test("rejects an unknown severity", () => {
    expect(severitySchema.safeParse("Catastrophic").success).toBe(false);
  });
});

describe("triageSchema", () => {
  test("accepts a fully-populated object", () => {
    const parsed = triageSchema.safeParse({
      categoryName: "Plumbing Issues",
      severity: "High",
      rationale: "Burst pipe in the basement is flooding the lab.",
    });
    expect(parsed.success).toBe(true);
  });

  test("rejects rationale shorter than 10 characters", () => {
    const parsed = triageSchema.safeParse({
      categoryName: "Plumbing Issues",
      severity: "High",
      rationale: "short",
    });
    expect(parsed.success).toBe(false);
  });

  test("rejects empty categoryName", () => {
    const parsed = triageSchema.safeParse({
      categoryName: "",
      severity: "High",
      rationale: "Sufficient rationale here",
    });
    expect(parsed.success).toBe(false);
  });

  test("rejects rationale longer than 500 characters", () => {
    const parsed = triageSchema.safeParse({
      categoryName: "Plumbing Issues",
      severity: "High",
      rationale: "x".repeat(501),
    });
    expect(parsed.success).toBe(false);
  });
});
