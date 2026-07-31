interface PublicUser {
  _id: unknown;
  email: string;
  name: string | null;
  role: string;
  createdAt: Date;
  updatedAt: Date;
}

interface PublicComplaint {
  _id: unknown;
  reporterId: unknown;
  isAnonymous: boolean;
  categoryId: unknown;
  locationId: unknown;
  description: string;
  photoUrls: string[];
  priority: string;
  slaAcknowledgeBy: Date;
  slaResolveBy: Date;
  status: string;
  escalated: boolean;
  proofPhotoUrl: string | null;
  aiSuggestion?: {
    enabled: boolean;
    model?: string;
    categoryId?: unknown;
    severity?: string;
    rationale?: string;
    ranAt?: Date;
    fallback: boolean;
  };
  parentComplaintId?: unknown;
  createdAt: Date;
  updatedAt: Date;
}

function toPublicUser(doc: Record<string, unknown>): PublicUser {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- stripping PII
  const { passwordHash: _, ...rest } = doc;
  return rest as unknown as PublicUser;
}

function toPublicComplaint(doc: Record<string, unknown>): PublicComplaint {
  const { aiSuggestion, status, ...rest } = doc;
  if (aiSuggestion && typeof aiSuggestion === "object") {
    const {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars -- stripping AI cost fields
      promptTokens: _pt,
      // eslint-disable-next-line @typescript-eslint/no-unused-vars -- stripping AI cost fields
      completionTokens: _ct,
      // eslint-disable-next-line @typescript-eslint/no-unused-vars -- stripping AI cost fields
      costUsd: _cu,
      // eslint-disable-next-line @typescript-eslint/no-unused-vars -- stripping AI cost fields
      error: _e,
      // eslint-disable-next-line @typescript-eslint/no-unused-vars -- stripping AI cost fields
      latencyMs: _lm,
      ...publicAi
    } = aiSuggestion as Record<string, unknown>;
    return { ...rest, aiSuggestion: publicAi, status } as PublicComplaint;
  }
  return { ...rest, status } as PublicComplaint;
}

function toPublicJSON(doc: Record<string, unknown>): Record<string, unknown> {
  if ("passwordHash" in doc) {
    return toPublicUser(doc) as unknown as Record<string, unknown>;
  }
  if ("slaAcknowledgeBy" in doc) {
    return toPublicComplaint(doc) as unknown as Record<string, unknown>;
  }
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- stripping PII
  const { passwordHash: _ph, ...rest } = doc;
  return rest;
}

export { toPublicJSON, toPublicUser, toPublicComplaint };
export type { PublicUser, PublicComplaint };
