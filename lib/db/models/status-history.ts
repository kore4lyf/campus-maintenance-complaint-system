import mongoose, { Schema, InferSchemaType } from "mongoose";

const statusHistorySchema = new Schema(
  {
    complaintId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Complaint",
      required: true,
    },
    fromStatus: { type: String, required: true },
    toStatus: { type: String, required: true },
    changedById: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    note: { type: String },
    photoUrl: { type: String },
    changedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

export { statusHistorySchema };
export type StatusHistoryDocument = InferSchemaType<typeof statusHistorySchema>;
export const StatusHistoryModel = mongoose.models.StatusHistory || mongoose.model("StatusHistory", statusHistorySchema);
