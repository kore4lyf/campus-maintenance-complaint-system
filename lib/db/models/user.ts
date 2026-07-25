import mongoose, { Schema, InferSchemaType } from "mongoose";

const userSchema = new Schema(
  {
    email: { type: String, required: true, unique: true },
    passwordHash: { type: String },
    name: {
      type: String,
      required: [true, "Name is required for human users"],
    },
    role: {
      type: String,
      enum: ["reporter", "dicht_admin", "dicht_technician"],
      required: true,
    },
    anonymousId: { type: String },
  },
  { timestamps: true }
);

export { userSchema };
export type UserDocument = InferSchemaType<typeof userSchema>;
export const UserModel = mongoose.models.User || mongoose.model("User", userSchema);
