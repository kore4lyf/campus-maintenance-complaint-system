import mongoose, { Schema, InferSchemaType } from "mongoose";

const verificationSchema = new Schema(
  {
    _id: { type: String },
    identifier: { type: String, required: true },
    value: { type: String, required: true },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true }
);

export { verificationSchema };
export type VerificationDocument = InferSchemaType<typeof verificationSchema>;
export const VerificationModel =
  mongoose.models.Verification || mongoose.model("Verification", verificationSchema);
