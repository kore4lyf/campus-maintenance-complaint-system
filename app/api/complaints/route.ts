import { NextResponse } from "next/server";
import { ZodError, z } from "zod";
import { revalidatePath } from "next/cache";
import { connect } from "@/lib/db/connection";
import { ComplaintModel } from "@/lib/db/models/complaint";
import { CategoryModel } from "@/lib/db/models/category";
import { LocationModel } from "@/lib/db/models/location";
import { UserModel } from "@/lib/db/models/user";
import { findOrCreateDuplicateParent } from "@/lib/db/helpers/duplicate-detection";
import { ApiError } from "@/lib/utils/errors";
import { getServerSession } from "@/lib/auth/dal";
import { triageComplaint } from "@/lib/ai/triage";
import { compressAndUpload } from "@/lib/storage/cloudinary";
import { paginateCursor } from "@/lib/utils/pagination";
import { toPublicComplaint } from "@/lib/utils/pii";
import { checkRateLimit, rateLimitHeaders } from "@/lib/rate-limit";
import type { TriageResult } from "@/lib/ai/triage";
import type { Severity } from "@/lib/ai/schemas";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const DESCRIPTION_MIN = 10;
const DESCRIPTION_MAX = 2000;

const formSchema = z.object({
  categoryId: z.string().min(1, "categoryId is required"),
  locationId: z.string().min(1, "locationId is required"),
  description: z
    .string()
    .trim()
    .min(DESCRIPTION_MIN, `Description must be at least ${DESCRIPTION_MIN} characters`)
    .max(DESCRIPTION_MAX, `Description must be at most ${DESCRIPTION_MAX} characters`),
  isAnonymous: z.boolean().optional().default(false),
});

type FormInput = z.infer<typeof formSchema>;

interface UserContext {
  reporterId: string | null;
  isAnonymous: boolean;
  reporterIdsForPii: string[];
  reporterEmailsForPii: string[];
}

interface CategoryLookup {
  _id: string;
  name: string;
  systemType: string;
  defaultSeverity: Severity;
  slaAcknowledgeHrs: number;
  slaResolveHrs: number;
}

interface LocationLookup {
  _id: string;
  name: string;
}

interface ParsedRequest {
  fields: FormInput;
  photo: { buffer: Buffer; mime: string; name: string | null } | null;
}

function badRequest(code: string, message: string, status: number) {
  return NextResponse.json(
    { error: { code, message } },
    { status, headers: { "content-type": "application/json" } },
  );
}

function isValidObjectId(value: string): boolean {
  return /^[a-fA-F0-9]{24}$/.test(value);
}

function pickString(form: FormData, key: string): string {
  const raw = form.get(key);
  if (typeof raw === "string") return raw;
  if (raw instanceof File) return raw.name ?? "";
  return "";
}

function pickBoolean(form: FormData, key: string): boolean {
  const raw = form.get(key);
  if (typeof raw === "string") {
    const v = raw.trim().toLowerCase();
    return v === "true" || v === "on" || v === "1" || v === "yes";
  }
  return false;
}

async function readFormFromRequest(request: Request): Promise<ParsedRequest> {
  const contentType = request.headers.get("content-type") ?? "";
  if (contentType.includes("multipart/form-data")) {
    const form = await request.formData();
    const fileEntry = form.get("photo");
    let photo: ParsedRequest["photo"] = null;
    if (fileEntry instanceof File && fileEntry.size > 0) {
      photo = {
        buffer: Buffer.from(await fileEntry.arrayBuffer()),
        mime: fileEntry.type || "application/octet-stream",
        name: fileEntry.name ?? null,
      };
    }
    return {
      fields: {
        categoryId: pickString(form, "categoryId"),
        locationId: pickString(form, "locationId"),
        description: pickString(form, "description"),
        isAnonymous: pickBoolean(form, "isAnonymous"),
      },
      photo,
    };
  }
  const body = await request.json().catch(() => ({}));
  const raw: Record<string, unknown> = body && typeof body === "object" ? body : {};
  return {
    fields: {
      categoryId: typeof raw.categoryId === "string" ? raw.categoryId : "",
      locationId: typeof raw.locationId === "string" ? raw.locationId : "",
      description:
        typeof raw.description === "string" ? raw.description : "",
      isAnonymous: Boolean(raw.isAnonymous),
    },
    photo: null,
  };
}

async function readSessionUser(): Promise<UserContext> {
  const session = await getServerSession();
  if (!session) {
    throw new ApiError("unauthenticated", "Authentication required", 401);
  }
  const userId = session.user.id;
  const userEmail = session.user.email;
  if (!isValidObjectId(userId)) {
    throw new ApiError("invalid_session", "Session user id is invalid", 401);
  }
  return {
    reporterId: userId,
    isAnonymous: false,
    reporterIdsForPii: [userId],
    reporterEmailsForPii: userEmail ? [userEmail] : [],
  };
}

async function validateCategoryAndLocation(
  categoryId: string,
  locationId: string,
): Promise<{ category: CategoryLookup; location: LocationLookup }> {
  if (!isValidObjectId(categoryId)) {
    throw new ApiError("invalid_category", "categoryId is not a valid id", 422);
  }
  if (!isValidObjectId(locationId)) {
    throw new ApiError("invalid_location", "locationId is not a valid id", 422);
  }
  const category = await CategoryModel.findOne({ _id: categoryId }).lean();
  if (!category) {
    throw new ApiError("invalid_category", "Category not found", 422);
  }
  const location = await LocationModel.findOne({ _id: locationId }).lean();
  if (!location) {
    throw new ApiError("invalid_location", "Location not found", 422);
  }
  return {
    category: {
      _id: String(category._id),
      name: category.name,
      systemType: category.systemType,
      defaultSeverity: category.defaultSeverity as Severity,
      slaAcknowledgeHrs: category.slaAcknowledgeHrs,
      slaResolveHrs: category.slaResolveHrs,
    },
    location: {
      _id: String(location._id),
      name: location.name,
    },
  };
}

function pickPriority(triage: TriageResult): Severity {
  return triage.severity;
}

function computeSlaDeadlines(args: {
  now: Date;
  acknowledgeHrs: number;
  resolveHrs: number;
}): { slaAcknowledgeBy: Date; slaResolveBy: Date } {
  const ackMs = args.acknowledgeHrs * 60 * 60 * 1000;
  const resMs = args.resolveHrs * 60 * 60 * 1000;
  return {
    slaAcknowledgeBy: new Date(args.now.getTime() + ackMs),
    slaResolveBy: new Date(args.now.getTime() + resMs),
  };
}

function aiSuggestionRecordFrom(triage: TriageResult): Record<string, unknown> {
  if (triage.fallback) {
    return {
      enabled: true,
      fallback: true,
      model: "rules",
      severity: triage.severity,
      rationale: triage.rationale,
      ranAt: triage.ranAt,
      error: triage.error,
      promptTokens: 0,
      completionTokens: 0,
      costUsd: 0,
      latencyMs: 0,
    };
  }
  return {
    enabled: true,
    fallback: false,
    model: triage.model,
    categoryId: undefined,
    severity: triage.severity,
    rationale: triage.rationale,
    ranAt: triage.ranAt,
    promptTokens: triage.promptTokens,
    completionTokens: triage.completionTokens,
    costUsd: triage.costUsd,
    latencyMs: triage.latencyMs,
  };
}

function duplicateTriageRecordFrom(
  category: CategoryLookup,
): TriageResult {
  return {
    enabled: true,
    fallback: true,
    model: "rules",
    severity: category.defaultSeverity,
    rationale: "Duplicate cluster (rules, no AI) within 30-minute window",
    categoryId: undefined,
    ranAt: new Date(),
    error: "Duplicate detected within 30-minute category+location window",
    promptTokens: 0,
    completionTokens: 0,
    costUsd: 0,
    latencyMs: 0,
  };
}

export async function POST(request: Request): Promise<NextResponse> {
  await connect();

  let userCtx: UserContext;
  let formInput: FormInput;
  let photo: ParsedRequest["photo"] = null;

  try {
    const parsed = await readFormFromRequest(request);
    formInput = parsed.fields;
    photo = parsed.photo;

    const validated = formSchema.safeParse(formInput);
    if (!validated.success) {
      const issue = validated.error.issues[0];
      return badRequest(
        "invalid_complaint",
        issue?.message ?? "Invalid complaint payload",
        422,
      );
    }

    userCtx = await readSessionUser();
  } catch (err) {
    if (err instanceof ApiError) {
      return badRequest(err.code, err.message, err.status);
    }
    if (err instanceof ZodError) {
      return badRequest(
        "invalid_complaint",
        err.issues[0]?.message ?? "Invalid input",
        422,
      );
    }
    return badRequest("server_error", "Failed to read submission", 500);
  }

  const rateLimitResult = await checkRateLimit(
    "complaintSubmit",
    userCtx.reporterId ?? "anonymous",
  );
  if (!rateLimitResult.allowed) {
    return NextResponse.json(
      { error: { code: "rate_limited", message: "Too many requests" } },
      {
        status: 429,
        headers: {
          "content-type": "application/json",
          ...rateLimitHeaders(rateLimitResult),
        },
      },
    );
  }

  try {
    const lookup = await validateCategoryAndLocation(
      formInput.categoryId,
      formInput.locationId,
    );

    const dup = await findOrCreateDuplicateParent(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- mongoose ObjectId cast
      lookup.category._id as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- mongoose ObjectId cast
      lookup.location._id as any,
    );

    let photoUrls: string[] = [];
    if (photo) {
      const uploaded = await compressAndUpload({
        buffer: photo.buffer,
        mime: photo.mime,
        ...(photo.name ? { originalName: photo.name } : {}),
      });
      photoUrls = [uploaded.url];
    }

    const triage = dup.isDuplicate
      ? duplicateTriageRecordFrom(lookup.category)
      : await triageComplaint({
          description: formInput.description,
          ...(userCtx.reporterIdsForPii.length > 0
            ? { reporterIds: userCtx.reporterIdsForPii }
            : {}),
          ...(userCtx.reporterEmailsForPii.length > 0
            ? { reporterEmails: userCtx.reporterEmailsForPii }
            : {}),
          location: { name: lookup.location.name },
          category: {
            _id: lookup.category._id,
            name: lookup.category.name,
            systemType: lookup.category.systemType,
            defaultSeverity: lookup.category.defaultSeverity,
          },
        });

    const priority = pickPriority(triage);
    const now = new Date();
    const sla = computeSlaDeadlines({
      now,
      acknowledgeHrs: lookup.category.slaAcknowledgeHrs,
      resolveHrs: lookup.category.slaResolveHrs,
    });
    const aiSuggestionRecord = aiSuggestionRecordFrom(triage);

    const created = await ComplaintModel.create({
      reporterId: userCtx.reporterId,
      isAnonymous: formInput.isAnonymous,
      categoryId: lookup.category._id,
      locationId: lookup.location._id,
      description: formInput.description,
      photoUrls,
      priority,
      slaAcknowledgeBy: sla.slaAcknowledgeBy,
      slaResolveBy: sla.slaResolveBy,
      status: "Submitted",
      escalated: false,
      aiSuggestion: aiSuggestionRecord,
      ...(dup.parentComplaintId ? { parentComplaintId: dup.parentComplaintId } : {}),
    });

    return NextResponse.json(
      {
        data: {
          id: String(created._id),
          redirectTo: `/complaints/${String(created._id)}`,
        },
      },
      { status: 201, headers: { "content-type": "application/json" } },
    );
  } catch (err) {
    if (err instanceof ApiError) {
      return badRequest(err.code, err.message, err.status);
    }
    if (err instanceof ZodError) {
      return badRequest(
        "invalid_complaint",
        err.issues[0]?.message ?? "Invalid input",
        422,
      );
    }
    return badRequest("server_error", "Failed to create complaint", 500);
  }
}

function reporterListView(doc: Record<string, unknown>): Record<string, unknown> {
  const publicDoc = toPublicComplaint(doc) as unknown as Record<string, unknown>;
  const {
    aiSuggestion: _aiSuggestion,
    escalated: _escalated,
    ...rest
  } = publicDoc;
  void _aiSuggestion;
  void _escalated;
  return rest;
}

export async function GET(request: Request): Promise<NextResponse> {
  await connect();

  const session = await getServerSession();
  if (!session) {
    return NextResponse.json(
      { error: { code: "unauthenticated", message: "Authentication required" } },
      { status: 401, headers: { "content-type": "application/json" } },
    );
  }

  if (!isValidObjectId(session.user.id)) {
    return NextResponse.json(
      { error: { code: "invalid_session", message: "Session user id is invalid" } },
      { status: 401, headers: { "content-type": "application/json" } },
    );
  }

  const userId = session.user.id;
  const url = new URL(request.url);
  const cursor = url.searchParams.get("cursor");
  const includeClosed = url.searchParams.get("includeClosed") === "true";
  const anonymousOnly = url.searchParams.get("anonymousOnly") === "true";
  const statusFilter = url.searchParams.get("status");

  const query: Record<string, unknown> = {
    $or: [{ reporterId: userId }],
  };

  if (includeClosed) {
    query.status = "Closed";
  } else {
    query.status = { $ne: "Closed" };
  }

  if (anonymousOnly) {
    query.isAnonymous = true;
  }

  if (statusFilter) {
    query.status = statusFilter;
  }

  const { data, meta } = await paginateCursor({
    model: ComplaintModel,
    query,
    sort: { _id: -1 },
    pageSize: 20,
    cursor,
  });

  const categoryIds = [...new Set(data.map((d) => String(d.categoryId)))];
  const locationIds = [...new Set(data.map((d) => String(d.locationId)))];

  const [categories, locations] = await Promise.all([
    CategoryModel.find({ _id: { $in: categoryIds } })
      .lean()
      .then((docs) =>
        Object.fromEntries(docs.map((d) => [String(d._id), d.name])),
      ),
    LocationModel.find({ _id: { $in: locationIds } })
      .lean()
      .then((docs) =>
        Object.fromEntries(docs.map((d) => [String(d._id), d.name])),
      ),
  ]);

  const publicData = data.map((doc) => {
    const publicDoc = reporterListView(
      doc as unknown as Record<string, unknown>,
    );
    return {
      ...publicDoc,
      categoryName: categories[String(doc.categoryId)] ?? null,
      locationName: locations[String(doc.locationId)] ?? null,
    };
  });

  return NextResponse.json(
    { data: publicData, meta },
    { status: 200, headers: { "content-type": "application/json" } },
  );
}
