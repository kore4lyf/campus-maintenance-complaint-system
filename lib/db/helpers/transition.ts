import mongoose from "mongoose";
import { ComplaintModel } from "../models/complaint";
import { ApiError } from "@/lib/utils/errors";

interface TransitionResult {
  success: boolean;
  complaint: mongoose.Document | null;
}

async function transitionStatus(
  complaintId: mongoose.Types.ObjectId,
  currentStatus: string,
  targetStatus: string,
  currentVersion: number,
  updateFields: Record<string, unknown> = {},
  role?: string
): Promise<TransitionResult> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- mock model types
  const result = await (ComplaintModel as any).findOneAndUpdate(
    {
      _id: complaintId,
      status: currentStatus,
      __v: currentVersion,
    },
    {
      $set: { status: targetStatus, ...updateFields },
    },
    { new: true, role }
  );

  if (!result) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- mock model types
    const existing = await (ComplaintModel as any).findById(complaintId);
    if (!existing) {
      throw new ApiError("not_found", "Complaint not found", 404);
    }
    if (existing.status !== currentStatus || existing.__v !== currentVersion) {
      throw new ApiError(
        "stale_write",
        `Complaint has changed since it was read. Please retry.`,
        409
      );
    }
    throw new ApiError("transition_failed", "Failed to update complaint status", 500);
  }

  return { success: true, complaint: result };
}

export { transitionStatus };
export type { TransitionResult };
