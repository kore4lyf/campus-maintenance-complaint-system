import mongoose, { Schema, InferSchemaType } from "mongoose";

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
    aiSuggestion: aiSuggestionSchema,
    parentComplaintId: { type: mongoose.Schema.Types.ObjectId, ref: "Complaint" },
  },
  { timestamps: true }
);

export { complaintSchema };
export type AiSuggestionDocument = InferSchemaType<typeof aiSuggestionSchema>;
export type ComplaintDocument = InferSchemaType<typeof complaintSchema>;
export const ComplaintModel = mongoose.models.Complaint || mongoose.model("Complaint", complaintSchema);
