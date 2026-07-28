import mongoose, { Schema, InferSchemaType } from "mongoose";

const locationSchema = new Schema(
  {
    name: { type: String, required: true },
    area: {
      type: String,
      enum: ["hostel", "academic", "admin", "lab", "other"],
      required: true,
    },
  },
  { timestamps: true }
);

export { locationSchema };
export type LocationDocument = InferSchemaType<typeof locationSchema>;
export const LocationModel: mongoose.Model<LocationDocument> =
  (mongoose.models.Location as mongoose.Model<LocationDocument>) ??
  mongoose.model<LocationDocument>("Location", locationSchema);
