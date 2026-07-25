import mongoose from "mongoose";
import { ComplaintModel } from "../models/complaint";

const DUPLICATE_WINDOW_MINUTES = 30;

interface DuplicateCheckResult {
  isDuplicate: boolean;
  parentComplaintId: mongoose.Types.ObjectId | null;
}

interface ComplaintFilter {
  categoryId: mongoose.Types.ObjectId;
  locationId: mongoose.Types.ObjectId;
  createdAt: { $gte: Date };
  parentComplaintId: null;
}

async function checkForDuplicate(
  categoryId: mongoose.Types.ObjectId,
  locationId: mongoose.Types.ObjectId
): Promise<DuplicateCheckResult> {
  const windowStart = new Date();
  windowStart.setMinutes(windowStart.getMinutes() - DUPLICATE_WINDOW_MINUTES);

  const filter: ComplaintFilter = {
    categoryId,
    locationId,
    createdAt: { $gte: windowStart },
    parentComplaintId: null,
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- mock model types
  const existing = await ComplaintModel.findOne(filter as any).sort({ createdAt: -1 });

  if (existing) {
    return {
      isDuplicate: true,
      parentComplaintId: existing._id as mongoose.Types.ObjectId,
    };
  }
  return { isDuplicate: false, parentComplaintId: null };
}

async function findOrCreateDuplicateParent(
  categoryId: mongoose.Types.ObjectId,
  locationId: mongoose.Types.ObjectId
): Promise<DuplicateCheckResult> {
  const session = await mongoose.startSession();

  await session.startTransaction();

  try {
    const windowStart = new Date();
    windowStart.setMinutes(windowStart.getMinutes() - DUPLICATE_WINDOW_MINUTES);

    const filter: ComplaintFilter = {
      categoryId,
      locationId,
      createdAt: { $gte: windowStart },
      parentComplaintId: null,
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- mock model types
    const existing = await ComplaintModel.findOne(filter as any, null, { session }).sort({
      createdAt: -1,
    });

    if (existing) {
      await session.abortTransaction();
      return {
        isDuplicate: true,
        parentComplaintId: existing._id as mongoose.Types.ObjectId,
      };
    }

    await session.commitTransaction();
    return { isDuplicate: false, parentComplaintId: null };
  } catch (err) {
    await session.abortTransaction();
    throw err;
  } finally {
    await session.endSession();
  }
}

export { checkForDuplicate, findOrCreateDuplicateParent, DUPLICATE_WINDOW_MINUTES };
export type { DuplicateCheckResult };
