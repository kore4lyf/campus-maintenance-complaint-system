import mongoose, { Schema, InferSchemaType } from "mongoose";

const assignmentSchema = new Schema(
  {
    complaintId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Complaint",
      required: true,
    },
    assignedToTechId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    assignedById: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    assignedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

export { assignmentSchema };
export type AssignmentDocument = InferSchemaType<typeof assignmentSchema>;
export const AssignmentModel = mongoose.models.Assignment || mongoose.model("Assignment", assignmentSchema);
