import { NextResponse } from "next/server";
import { connect } from "@/lib/db/connection";
import { ComplaintModel } from "@/lib/db/models/complaint";
import { NotificationModel } from "@/lib/db/models/notification";
import { UserModel } from "@/lib/db/models/user";
import { evaluateBreachState } from "@/lib/sla/breach-detection";
import { publishToChannel } from "@/lib/realtime/ably";
import { logger } from "@/lib/utils/logger";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const DEDUP_WINDOW_MS = 5 * 60 * 1000;

interface SweepResult {
  scannedCount: number;
  escalatedCount: number;
  skipCount: number;
  runId: string;
  startedAt: string;
  durationMs: number;
}

function verifyBearerAuth(request: Request): boolean {
  const authHeader = request.headers.get("authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return false;
  }
  const token = authHeader.slice(7);
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return false;
  }
  return token === cronSecret;
}

async function runSweep(): Promise<SweepResult> {
  const runId = crypto.randomUUID();
  const startedAt = new Date();
  const now = startedAt;

  logger.info("SLA sweep started", { runId, startedAt: startedAt.toISOString() });

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
      try {
        await NotificationModel.create({
          complaintId: complaint._id,
          recipientId: adminId,
          type: "escalation",
          message,
          read: false,
        });
      } catch (err) {
        logger.error("Failed to create escalation notification", {
          runId,
          complaintId,
          adminId,
          error: err instanceof Error ? err.message : "Unknown error",
        });
      }
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
      try {
        await ComplaintModel.findOneAndUpdate(
          { _id: complaint._id, escalated: { $ne: true } },
          { $set: { escalated: true } },
        );
      } catch (err) {
        logger.error("Failed to flip escalated flag", {
          runId,
          complaintId,
          error: err instanceof Error ? err.message : "Unknown error",
        });
      }
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

export async function POST(request: Request): Promise<NextResponse> {
  if (!verifyBearerAuth(request)) {
    logger.warn("SLA sweep unauthorized", {
      cronSecretPresent: !!process.env.CRON_SECRET,
    });
    return NextResponse.json(
      { error: { code: "unauthorized", message: "Invalid or missing bearer token" } },
      { status: 401, headers: { "content-type": "application/json" } },
    );
  }

  await connect();

  try {
    const result = await runSweep();

    return NextResponse.json(
      { data: result },
      { status: 200, headers: { "content-type": "application/json" } },
    );
  } catch (err) {
    logger.error("SLA sweep failed", {
      error: err instanceof Error ? err.message : "Unknown error",
    });

    return NextResponse.json(
      { error: { code: "sweep_failed", message: "SLA sweep failed" } },
      { status: 500, headers: { "content-type": "application/json" } },
    );
  }
}
