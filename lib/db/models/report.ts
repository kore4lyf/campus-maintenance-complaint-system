import mongoose, { Schema, InferSchemaType } from "mongoose";

const reportSchema = new Schema(
  {
    period: { type: String, required: true },
    byCategory: { type: Schema.Types.Mixed, default: {} },
    byLocation: { type: Schema.Types.Mixed, default: {} },
    avgResolutionHrs: { type: Number, default: 0 },
    slaBreachCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export { reportSchema };
export type ReportDocument = InferSchemaType<typeof reportSchema>;
export const ReportModel =
  mongoose.models.Report || mongoose.model("Report", reportSchema);
