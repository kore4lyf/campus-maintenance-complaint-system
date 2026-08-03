import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { ComplaintModel } from "@/lib/db/models/complaint";
import { CategoryModel } from "@/lib/db/models/category";
import { LocationModel } from "@/lib/db/models/location";
import { triageComplaint } from "@/lib/ai/triage";
import { computeSlaDeadlines } from "@/lib/sla/compute";

const MAX_JOBS_PER_RUN = 10;

export async function GET() {
  const headersList = await headers();
  const authHeader = headersList.get("authorization");

  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const pendingComplaints = await ComplaintModel.find({
    triageStatus: "pending",
  })
    .limit(MAX_JOBS_PER_RUN)
    .lean();

  if (pendingComplaints.length === 0) {
    return NextResponse.json({ processed: 0 });
  }

  const results = await Promise.allSettled(
    pendingComplaints.map(async (complaint) => {
      const category = await CategoryModel.findById(complaint.categoryId).lean();
      const location = await LocationModel.findById(complaint.locationId).lean();

      if (!category || !location) {
        await ComplaintModel.updateOne(
          { _id: complaint._id },
          { $set: { triageStatus: "failed" } },
        );
        return { id: complaint._id, status: "failed" };
      }

      const triage = await triageComplaint({
        description: complaint.description,
        location: { name: location.name },
        category: {
          _id: String(category._id),
          name: category.name,
          systemType: category.systemType,
          defaultSeverity: category.defaultSeverity,
        },
      });

      const priority =
        triage.enabled && !triage.fallback
          ? triage.severity
          : category.defaultSeverity;

      const now = new Date();
      const sla = computeSlaDeadlines({
        now,
        acknowledgeHrs: category.slaAcknowledgeHrs,
        resolveHrs: category.slaResolveHrs,
      });

      await ComplaintModel.updateOne(
        { _id: complaint._id },
        {
          $set: {
            triageStatus: "completed",
            priority,
            aiSuggestion: {
              enabled: triage.enabled,
              fallback: triage.fallback,
              model: triage.model,
              severity: triage.severity,
              rationale: triage.rationale,
              latencyMs: triage.latencyMs,
              promptTokens: triage.promptTokens,
              completionTokens: triage.completionTokens,
              costUsd: triage.costUsd,
              ranAt: triage.ranAt,
              error: "error" in triage ? triage.error : undefined,
            },
            slaAcknowledgeBy: sla.slaAcknowledgeBy,
            slaResolveBy: sla.slaResolveBy,
          },
        },
      );

      return { id: complaint._id, status: "completed" };
    }),
  );

  const processed = results.filter(
    (r) => r.status === "fulfilled",
  ).length;
  const failed = results.filter(
    (r) => r.status === "rejected",
  ).length;

  return NextResponse.json({ processed, failed });
}
