import mongoose, { Schema, InferSchemaType } from "mongoose";

const notificationSchema = new Schema(
  {
    complaintId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Complaint",
      required: true,
    },
    recipientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    type: {
      type: String,
      enum: ["assignment", "escalation", "status"],
      required: true,
    },
    message: { type: String, required: true },
    read: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export { notificationSchema };
export type NotificationDocument = InferSchemaType<typeof notificationSchema>;
export const NotificationModel: mongoose.Model<NotificationDocument> =
  (mongoose.models.Notification as mongoose.Model<NotificationDocument>) ??
  mongoose.model<NotificationDocument>("Notification", notificationSchema);
