import mongoose, { Schema, InferSchemaType } from "mongoose";

const categorySchema = new Schema(
  {
    name: { type: String, required: true },
    systemType: {
      type: String,
      enum: ["Electrical", "Plumbing", "Carpentry", "HVAC", "ICT", "Cleaning", "Security", "Other"],
      required: true,
      unique: true,
    },
    defaultSeverity: {
      type: String,
      enum: ["Critical", "High", "Medium", "Low"],
      required: true,
    },
    slaAcknowledgeHrs: { type: Number, required: true },
    slaResolveHrs: { type: Number, required: true },
  },
  { timestamps: true }
);

export { categorySchema };
export type CategoryDocument = InferSchemaType<typeof categorySchema>;
export const CategoryModel = mongoose.models.Category || mongoose.model("Category", categorySchema);
