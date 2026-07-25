import mongoose from "mongoose";
import { connect } from "./connection";

const MAX_RETRIES = 3;
const INITIAL_BACKOFF_MS = 1000;

async function createIndexes(): Promise<void> {
  await connect();
  const db = mongoose.connection;

  const complaintModel = db.model("Complaint");
  const userModel = db.model("User");
  const assignmentModel = db.model("Assignment");
  const notificationModel = db.model("Notification");
  const statusHistoryModel = db.model("StatusHistory");
  const categoryModel = db.model("Category");

  const indexOps = [
    complaintModel.collection.createIndexes([
      { key: { slaResolveBy: 1 }, name: "sla-resolve-by-deadline" },
      { key: { status: 1 }, name: "status-index" },
      { key: { categoryId: 1 }, name: "category-id-index" },
      { key: { locationId: 1 }, name: "location-id-index" },
      { key: { createdAt: 1 }, name: "created-at-index" },
      {
        key: { categoryId: 1, locationId: 1, createdAt: 1 },
        name: "duplicate-detection-window",
      },
    ]),
    userModel.collection.createIndexes([
      { key: { email: 1 }, unique: true, name: "email-unique" },
      { key: { role: 1 }, name: "role-index" },
    ]),
    assignmentModel.collection.createIndexes([
      { key: { complaintId: 1 }, name: "complaint-id-index" },
    ]),
    notificationModel.collection.createIndexes([
      { key: { recipientId: 1 }, name: "recipient-id-index" },
      { key: { complaintId: 1 }, name: "notification-complaint-id-index" },
      // Deliberate addition: auto-delete notifications older than 90 days.
      // Not in architecture spec; added for operational hygiene.
      {
        key: { createdAt: 1 },
        name: "notification-created-at-ttl",
        expireAfterSeconds: 7776000,
      },
    ]),
    statusHistoryModel.collection.createIndexes([
      { key: { complaintId: 1 }, name: "status-history-complaint-id-index" },
    ]),
    categoryModel.collection.createIndexes([
      { key: { systemType: 1 }, unique: true, name: "category-system-type-unique" },
    ]),
  ];

  let lastError: Error | undefined;
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      await Promise.all(indexOps);
      return;
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      if (attempt < MAX_RETRIES) {
        const delay = INITIAL_BACKOFF_MS * 2 ** (attempt - 1);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }
  throw lastError;
}

export { createIndexes };
