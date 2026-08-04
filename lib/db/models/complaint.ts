import mongoose, { Schema, InferSchemaType } from "mongoose";
import { ApiError } from "@/lib/utils/errors";

const VALID_TRANSITIONS: Record<string, string[]> = {
  Submitted: ["Acknowledged"],
  Acknowledged: ["In Progress"],
  "In Progress": ["Resolved", "Acknowledged"],
  Resolved: ["Closed"],
  Closed: [],
};

const ADMIN_OVERRIDES: Record<string, string> = {
  "In Progress": "Acknowledged",
};

const aiSuggestionSchema = new Schema(
  {
    enabled: { type: Boolean, default: false },
    model: { type: String },
    categoryId: { type: mongoose.Schema.Types.ObjectId, ref: "Category" },
    severity: {
      type: String,
      enum: ["Critical", "High", "Medium", "Low"],
    },
    rationale: { type: String },
    latencyMs: { type: Number },
    promptTokens: { type: Number },
    completionTokens: { type: Number },
    costUsd: { type: Number },
    ranAt: { type: Date },
    fallback: { type: Boolean, default: false },
    error: { type: String },
  },
  { _id: false, timestamps: false }
);

const complaintSchema = new Schema(
  {
    reporterId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    isAnonymous: { type: Boolean, default: false },
    categoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      required: true,
    },
    locationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Location",
      required: true,
    },
    description: { type: String, required: true, minlength: 10, maxlength: 2000 },
    photoUrls: [{ type: String }],
    priority: {
      type: String,
      enum: ["Critical", "High", "Medium", "Low"],
      default: "Medium",
    },
    slaAcknowledgeBy: { type: Date, required: true },
    slaResolveBy: { type: Date, required: true },
    status: {
      type: String,
      enum: ["Submitted", "Acknowledged", "In Progress", "Resolved", "Closed"],
      default: "Submitted",
    },
    escalated: { type: Boolean, default: false },
    resolvedAt: { type: Date },
    aiSuggestion: aiSuggestionSchema,
    parentComplaintId: { type: mongoose.Schema.Types.ObjectId, ref: "Complaint" },
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- mongoose schema hook types
const schema = complaintSchema as any;

schema.virtual("_statusHistory", {
  ref: "StatusHistory",
  localField: "_id",
  foreignField: "complaintId",
});

schema.virtual("proofPhotoUrl").get(function (this: Record<string, unknown>) {
  const sh = this._statusHistory as
    | Array<{ toStatus: string; photoUrl?: string }>
    | undefined;
  if (!Array.isArray(sh)) return null;
  for (let i = sh.length - 1; i >= 0; i--) {
    const entry = sh[i];
    if (entry && entry.toStatus === "Resolved" && entry.photoUrl) {
      return entry.photoUrl;
    }
  }
  return null;
});

schema.pre("init", function (this: any, doc: Record<string, unknown>) { // eslint-disable-line @typescript-eslint/no-explicit-any
  this.$locals._wasStatus = doc.status;
});

function validateTransition(prev: string, nextStatus: string, role?: string) {
  const allowed = VALID_TRANSITIONS[prev];
  if (!allowed || !allowed.includes(nextStatus)) {
    throw new ApiError(
      "invalid_transition",
      `Cannot transition from ${prev} to ${nextStatus}`,
      422
    );
  }
  const blockedByAdmin = ADMIN_OVERRIDES[prev] === nextStatus;
  if (blockedByAdmin && role !== "dicht_admin") {
    throw new ApiError(
      "invalid_transition",
      `Only admins can transition from ${prev} to ${nextStatus}`,
      422
    );
  }
}

schema.pre("validate", function (this: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
  if (this.slaAcknowledgeBy >= this.slaResolveBy) {
    this.invalidate(
      "slaAcknowledgeBy",
      "slaAcknowledgeBy must be before slaResolveBy",
      this.slaAcknowledgeBy
    );
  }
});

schema.pre("save", function (this: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
  if (!this.isModified("status")) {
    return;
  }
  const prev = this.$locals._wasStatus as string | undefined;
  const nextStatus = this.status;
  if (prev === undefined || prev === nextStatus) {
    return;
  }
  const role = this.$locals.session?.role as string | undefined;
  validateTransition(prev, nextStatus, role);
});

schema.pre("findOneAndUpdate", function (this: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
  const update = this.getUpdate() as Record<string, unknown> | null;
  if (!update) return;
  const nextStatus =
    update.status ?? (update.$set as Record<string, unknown> | undefined)?.status;
  if (!nextStatus || typeof nextStatus !== "string") return;

  const filter = this.getFilter() as Record<string, unknown>;
  const prevStatus = filter.status as string | undefined;
  if (!prevStatus) {
    throw new ApiError(
      "invalid_transition",
      "findOneAndUpdate that changes status must include the current status in the filter",
      422
    );
  }
  if (prevStatus === nextStatus) return;

  const role = this.getOptions?.().role as string | undefined;
  validateTransition(prevStatus, nextStatus, role);
});

export { complaintSchema, ApiError, VALID_TRANSITIONS, ADMIN_OVERRIDES };
export type AiSuggestionDocument = InferSchemaType<typeof aiSuggestionSchema>;
export type ComplaintDocument = InferSchemaType<typeof complaintSchema>;
export const ComplaintModel: mongoose.Model<ComplaintDocument> =
  (mongoose.models.Complaint as mongoose.Model<ComplaintDocument>) ??
  mongoose.model<ComplaintDocument>("Complaint", complaintSchema);
