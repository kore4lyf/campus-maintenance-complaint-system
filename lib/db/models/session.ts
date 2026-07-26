import mongoose, { Schema, InferSchemaType } from "mongoose";

const sessionSchema = new Schema(
  {
    _id: { type: String },
    expiresAt: { type: Date, required: true },
    token: { type: String, required: true, unique: true, index: true },
    ipAddress: { type: String },
    userAgent: { type: String },
    userId: { type: String, required: true, index: true },
  },
  { timestamps: true }
);

export { sessionSchema };
export type SessionDocument = InferSchemaType<typeof sessionSchema>;
export const SessionModel =
  mongoose.models.Session || mongoose.model("Session", sessionSchema);
