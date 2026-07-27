import "dotenv/config";
import { connect } from "../lib/db/connection";
import { ComplaintModel } from "../lib/db/models/complaint";
import { NotificationModel } from "../lib/db/models/notification";
import { UserModel } from "../lib/db/models/user";
import { evaluateBreachState } from "../lib/sla/breach-detection";
import { publishToChannel } from "../lib/realtime/ably";
import { logger } from "../lib/utils/logger";

const DEDUP_WINDOW_MS = 5 * 60 * 1000;

interface SweepResult {
  scannedCount: number;
  escalatedCount: number;
  skipCount: number;
  runId: string;
  startedAt: string;
  durationMs: number;
}

export async function runSweep(args?: {
  nowOverride?: Date;
}): Promise<SweepResult> {
  const runId = crypto.randomUUID();
  const startedAt = args?.nowOverride ?? new Date();
  const now = startedAt;

  logger.info("SLA sweep started", { runId, startedAt: startedAt.toISOString() });

  await connect();

  const nonClosedComplaints = await ComplaintModel.find({
    status: { $ne: "Closed" },
  }).lean();

  const admins = await UserModel.find({ role: "dicht_admin" }).lean();
  const adminIds = admins.map((a) => String(a._id));

  let escalatedCount = 0;
  let skipCount = 0;

  for (const complaint of nonClosedComplaints) {
    const breachState = evaluateBreachState({
      complaint: {
        slaAcknowledgeBy: complaint.slaAcknowledgeBy as Date,
        slaResolveBy: complaint.slaResolveBy as Date,
        status: complaint.status as string,
      },
      now,
    });

    if (breachState.kind === "none") {
      continue;
    }

    const complaintId = String(complaint._id);

    const existingNotification = await NotificationModel.findOne({
      complaintId: complaint._id,
      type: "escalation",
      createdAt: { $gte: new Date(now.getTime() - DEDUP_WINDOW_MS) },
    }).lean();

    if (existingNotification) {
      skipCount++;
      continue;
    }

    const isAcknowledgeOverdue = breachState.kind === "acknowledge_overdue";
    const message = isAcknowledgeOverdue
      ? `Acknowledgement overdue for a complaint`
      : `Priority: Resolution overdue for a complaint. DICT Director review required.`;

    for (const adminId of adminIds) {
      await NotificationModel.create({
        complaintId: complaint._id,
        recipientId: adminId,
        type: "escalation",
        message,
        read: false,
      });
    }

    let ablyPushOk = false;
    try {
      ablyPushOk = await publishToChannel({
        channelName: "admin-queue",
        eventName: "escalation",
        data: {
          complaintId,
          kind: breachState.kind,
          message,
        },
      });
    } catch {
      // Ably push is best effort
    }

    if (!complaint.escalated) {
      await ComplaintModel.findOneAndUpdate(
        { _id: complaint._id, escalated: { $ne: true } },
        { $set: { escalated: true } },
      );
    }

    escalatedCount++;

    logger.info("Escalation processed", {
      runId,
      complaintId,
      kind: breachState.kind,
      overdueMs: breachState.overdueMs,
      ablyPushOk,
    });
  }

  const durationMs = Date.now() - startedAt.getTime();

  const result: SweepResult = {
    scannedCount: nonClosedComplaints.length,
    escalatedCount,
    skipCount,
    runId,
    startedAt: startedAt.toISOString(),
    durationMs,
  };

  logger.info("SLA sweep completed", result);

  return result;
}

if (require.main === module) {
  runSweep()
    .then((result) => {
      console.log(JSON.stringify(result, null, 2));
      process.exit(0);
    })
    .catch((err) => {
      console.error("SLA sweep failed:", err);
      process.exit(1);
    });
}
