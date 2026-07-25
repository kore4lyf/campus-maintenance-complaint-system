import mongoose from "mongoose";
import { connect } from "./connection";

async function createIndexes(): Promise<void> {
  await connect();
  const db = mongoose.connection;

  const complaintModel = db.model("Complaint");
  const userModel = db.model("User");
  const assignmentModel = db.model("Assignment");
  const notificationModel = db.model("Notification");

  await complaintModel.collection.createIndexes([
    { key: { slaResolveBy: 1 }, name: "sla-resolve-by-ttl" },
    { key: { status: 1 }, name: "status-index" },
    { key: { categoryId: 1 }, name: "category-id-index" },
    { key: { locationId: 1 }, name: "location-id-index" },
    { key: { createdAt: 1 }, name: "created-at-index" },
    {
      key: { categoryId: 1, locationId: 1, createdAt: 1 },
      name: "duplicate-detection-window",
    },
  ]);

  await userModel.collection.createIndexes([
    { key: { email: 1 }, unique: true, name: "email-unique" },
    { key: { role: 1 }, name: "role-index" },
  ]);

  await assignmentModel.collection.createIndexes([
    { key: { complaintId: 1 }, name: "complaint-id-index" },
  ]);

  await notificationModel.collection.createIndexes([
    { key: { recipientId: 1 }, name: "recipient-id-index" },
  ]);
}

export { createIndexes };