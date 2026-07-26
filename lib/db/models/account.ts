import mongoose, { Schema, InferSchemaType } from "mongoose";

const accountSchema = new Schema(
  {
    _id: { type: String },
    userId: { type: String, required: true, index: true },
    accountId: { type: String, required: true },
    providerId: { type: String, required: true },
    password: { type: String },
    accessToken: { type: String },
    refreshToken: { type: String },
    idToken: { type: String },
    accessTokenExpiresAt: { type: Date },
    refreshTokenExpiresAt: { type: Date },
    scope: { type: String },
  },
  { timestamps: true }
);

export { accountSchema };
export type AccountDocument = InferSchemaType<typeof accountSchema>;
export const AccountModel =
  mongoose.models.Account || mongoose.model("Account", accountSchema);
