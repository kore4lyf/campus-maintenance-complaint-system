import { buildUserPrompt, buildSystemPrompt, scrubPII } from "./prompts";

describe("buildSystemPrompt", () => {
  test("mentions all four severity tiers", () => {
    const sys = buildSystemPrompt();
    expect(sys).toContain("Critical");
    expect(sys).toContain("High");
    expect(sys).toContain("Medium");
    expect(sys).toContain("Low");
  });

  test("instructs the model not to emit reporter PII", () => {
    const sys = buildSystemPrompt();
    expect(sys.toLowerCase()).toContain("pii");
  });
});

describe("buildUserPrompt", () => {
  test("includes description, location, category, system type, and default severity", () => {
    const out = buildUserPrompt({
      description: "The pipe under the sink is leaking.",
      location: { name: "Library" },
      category: {
        name: "Plumbing Issues",
        systemType: "Plumbing",
        defaultSeverity: "High",
      },
    });
    expect(out.user).toContain("The pipe under the sink is leaking.");
    expect(out.user).toContain("Library");
    expect(out.user).toContain("Plumbing Issues");
    expect(out.user).toContain("Plumbing");
    expect(out.user).toContain("High");
    expect(out.urgencyHint).toContain("High");
  });

  test("urgency hint references the default severity", () => {
    expect(
      buildUserPrompt({
        description: "x",
        location: { name: "Main Gate" },
        category: {
          name: "Security & Safety",
          systemType: "Security",
          defaultSeverity: "Critical",
        },
      }).urgencyHint,
    ).toContain("Critical");
  });
});

describe("scrubPII", () => {
  test("throws when prompt contains a reporter email substring", () => {
    expect(() =>
      scrubPII({ prompt: "Reporter email: alice@example.com", reportedEmails: ["alice@example.com"] }),
    ).toThrow(/redacted/i);
  });

  test("throws when prompt contains a reporter id substring", () => {
    expect(() =>
      scrubPII({ prompt: "_id: 60f1b9c8e7d8e2b1a4f3e2c1", reportedReporterIds: ["60f1b9c8e7d8e2b1a4f3e2c1"] }),
    ).toThrow(/redacted/i);
  });

  test("throws when prompt contains the literal token 'email'", () => {
    expect(() => scrubPII({ prompt: "Please send email to the team" })).toThrow();
  });

  test("throws when prompt contains the literal token 'password'", () => {
    expect(() => scrubPII({ prompt: "password reset flow" })).toThrow();
  });

  test("throws when prompt contains 'anonymousId' marker", () => {
    expect(() => scrubPII({ prompt: "anon: anonymousId=abc" })).toThrow();
  });

  test("returns prompt unchanged when no PII markers are present", () => {
    const prompt = "Location: Library. Category: Plumbing Issues (Plumbing).";
    expect(scrubPII({ prompt })).toBe(prompt);
  });
});
