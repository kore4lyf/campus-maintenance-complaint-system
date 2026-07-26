import { z } from "zod";

const SEVERITY_VALUES = ["Critical", "High", "Medium", "Low"] as const;
type Severity = (typeof SEVERITY_VALUES)[number];

const severitySchema = z.enum(SEVERITY_VALUES);

const triageSchema = z.object({
  categoryName: z
    .string()
    .min(1, "categoryName must not be empty")
    .max(100, "categoryName must be 100 characters or fewer")
    .describe(
      "The single best category name for this complaint (e.g. 'Plumbing Issues').",
    ),
  severity: severitySchema.describe(
    "Severity tier that determines the SLA deadline. Must be one of Critical | High | Medium | Low.",
  ),
  rationale: z
    .string()
    .min(10, "rationale must explain the severity in at least 10 characters")
    .max(500, "rationale must be 500 characters or fewer")
    .describe(
      "One sentence explaining why the chosen severity is appropriate for this complaint.",
    ),
});

type TriageOutput = z.infer<typeof triageSchema>;

export { triageSchema, severitySchema, SEVERITY_VALUES };
export type { Severity, TriageOutput };
