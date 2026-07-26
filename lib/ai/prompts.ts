const PII_BLACKLIST = [
  "anonymousId",
  "passwordHash",
  "reporterEmail",
  "p@ssw0rd",
  "reporterUserId",
] as const;

interface TriagePromptInput {
  description: string;
  location: { name: string };
  category: {
    name: string;
    systemType: string;
    defaultSeverity: "Critical" | "High" | "Medium" | "Low";
  };
}

interface TriagePromptOutput {
  system: string;
  user: string;
  urgencyHint: string;
}

function buildSystemPrompt(): string {
  return [
    "You triage campus maintenance complaints for the DICT team at the Lagos State University.",
    "Read the free-text description and the chosen category. Decide a severity tier (Critical | High | Medium | Low) and a one-sentence rationale.",
    "Severity definitions:",
    "- Critical: immediate safety risk or full outage of an essential service (electrical fire, flooding, total loss of HVAC in server rooms).",
    "- High: significant disruption to teaching, research, or living conditions (no water in a hostel, recurrent power outage in a lab).",
    "- Medium: comfort or amenity issues, single fixture failures, slow degradation.",
    "- Low: cosmetic, minimal disruption, inconvenience only.",
    "Match the chosen category's default severity only when the description neither escalates nor de-escalates it.",
    "Output strictly the structured fields requested. Do not include addresses, names, emails, IDs, or any reporter PII in your rationale.",
  ].join("\n");
}

function urgencyHintFor(severity: string): string {
  return `The chosen category's default severity is ${severity}. Raise it when the description indicates escalation; lower it only when the description clearly indicates a downgrade.`;
}

function buildUserPrompt(input: TriagePromptInput): TriagePromptOutput {
  const { description, location, category } = input;
  const safeDescription = description.trim();
  const safeLocation = location.name.trim();
  const safeCategoryName = category.name.trim();
  const safeSystemType = category.systemType.trim();

  const user = [
    `Location: ${safeLocation}`,
    `Category: ${safeCategoryName} (${safeSystemType})`,
    `Reporter's category default severity: ${category.defaultSeverity}`,
    "Description:",
    safeDescription,
  ].join("\n\n");

  const system = buildSystemPrompt();

  return {
    system,
    user,
    urgencyHint: urgencyHintFor(category.defaultSeverity),
  };
}

function assertPiIFree(prompt: string, report: Record<string, unknown>): void {
  for (const marker of PII_BLACKLIST) {
    if (prompt.includes(marker)) {
      const error = new Error(
        `AI prompt contains disallowed marker "${marker}" (PII discipline violation)`,
      );
      (error as Error & { context?: Record<string, unknown> }).context = report;
      throw error;
    }
  }

  const printablePii = ["email", "password"];
  for (const tag of printablePii) {
    const pattern = new RegExp(`\\b${tag}\\b`, "i");
    if (pattern.test(prompt)) {
      const error = new Error(
        `AI prompt contains the literal token "${tag}" (PII discipline violation)`,
      );
      (error as Error & { context?: Record<string, unknown> }).context = report;
      throw error;
    }
  }
}

function scrubPII(input: {
  prompt: string;
  reportedReporterIds?: ReadonlyArray<string>;
  reportedEmails?: ReadonlyArray<string>;
}): string {
  const { prompt, reportedReporterIds, reportedEmails } = input;
  const report: Record<string, unknown> = {
    promptLength: prompt.length,
  };

  let cleaned = prompt;
  const banned: string[] = [];
  for (const id of reportedReporterIds ?? []) {
    if (id && cleaned.includes(id)) {
      banned.push(`reporterUserId substring "${id}"`);
      cleaned = cleaned.split(id).join("[REDACTED_USER_ID]");
    }
  }
  for (const email of reportedEmails ?? []) {
    if (email && cleaned.includes(email)) {
      banned.push(`reporterEmail substring "${email}"`);
      cleaned = cleaned.split(email).join("[REDACTED_EMAIL]");
    }
  }

  if (banned.length > 0) {
    report.redactions = banned;
    const err = new Error("AI prompt contained reporter identifiers (redacted)");
    (err as Error & { context?: Record<string, unknown> }).context = report;
    throw err;
  }

  assertPiIFree(cleaned, report);
  return cleaned;
}

export {
  buildSystemPrompt,
  buildUserPrompt,
  scrubPII,
  urgencyHintFor,
  PII_BLACKLIST,
};
export type { TriagePromptInput, TriagePromptOutput };
