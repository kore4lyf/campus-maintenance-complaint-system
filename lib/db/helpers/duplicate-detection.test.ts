jest.mock("@/lib/db/models/complaint", () => ({
  ComplaintModel: {
    findOne: jest.fn(),
  },
}));

jest.mock("mongoose", () => ({
  startSession: jest.fn(),
  Types: { ObjectId: jest.fn() },
  default: { startSession: jest.fn(), Types: { ObjectId: jest.fn() } },
}));

import mongoose from "mongoose";
import { checkForDuplicate, findOrCreateDuplicateParent, DUPLICATE_WINDOW_MINUTES } from "./duplicate-detection";
import { ComplaintModel } from "../models/complaint";

const mockedFindOne = ComplaintModel.findOne as jest.Mock;
const mockedStartSession = mongoose.startSession as jest.Mock;

function makeMockSession() {
  return {
    startTransaction: jest.fn().mockResolvedValue(undefined),
    commitTransaction: jest.fn().mockResolvedValue(undefined),
    abortTransaction: jest.fn().mockResolvedValue(undefined),
    endSession: jest.fn().mockResolvedValue(undefined),
  };
}

describe("checkForDuplicate", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("returns isDuplicate false when no existing complaint found", async () => {
    const sortFn = jest.fn().mockResolvedValue(null);
    mockedFindOne.mockReturnValue({ sort: sortFn });
    const result = await checkForDuplicate(
      "cat1" as unknown as mongoose.Types.ObjectId,
      "loc1" as unknown as mongoose.Types.ObjectId,
    );
    expect(result.isDuplicate).toBe(false);
    expect(result.parentComplaintId).toBeNull();
  });

  test("returns isDuplicate true with parentComplaintId when found", async () => {
    const existingDoc = { _id: "existing123" };
    const sortFn = jest.fn().mockResolvedValue(existingDoc);
    mockedFindOne.mockReturnValue({ sort: sortFn });
    const result = await checkForDuplicate(
      "cat1" as unknown as mongoose.Types.ObjectId,
      "loc1" as unknown as mongoose.Types.ObjectId,
    );
    expect(result.isDuplicate).toBe(true);
    expect(result.parentComplaintId).toBe("existing123");
  });

  test("exports DUPLICATE_WINDOW_MINUTES as 30", () => {
    expect(DUPLICATE_WINDOW_MINUTES).toBe(30);
  });
});

describe("findOrCreateDuplicateParent", () => {
  let mockSession: ReturnType<typeof makeMockSession>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockSession = makeMockSession();
    mockedStartSession.mockResolvedValue(mockSession);
  });

  test("commits transaction when no duplicate found", async () => {
    const sortFn = jest.fn().mockResolvedValue(null);
    mockedFindOne.mockReturnValue({ sort: sortFn });

    const result = await findOrCreateDuplicateParent(
      "cat1" as unknown as mongoose.Types.ObjectId,
      "loc1" as unknown as mongoose.Types.ObjectId,
    );

    expect(result.isDuplicate).toBe(false);
    expect(result.parentComplaintId).toBeNull();
    expect(mockSession.startTransaction).toHaveBeenCalledTimes(1);
    expect(mockSession.commitTransaction).toHaveBeenCalledTimes(1);
    expect(mockSession.abortTransaction).not.toHaveBeenCalled();
    expect(mockSession.endSession).toHaveBeenCalledTimes(1);
  });

  test("aborts transaction when duplicate found", async () => {
    const existingDoc = { _id: "parent123" };
    const sortFn = jest.fn().mockResolvedValue(existingDoc);
    mockedFindOne.mockReturnValue({ sort: sortFn });

    const result = await findOrCreateDuplicateParent(
      "cat1" as unknown as mongoose.Types.ObjectId,
      "loc1" as unknown as mongoose.Types.ObjectId,
    );

    expect(result.isDuplicate).toBe(true);
    expect(result.parentComplaintId).toBe("parent123");
    expect(mockSession.abortTransaction).toHaveBeenCalledTimes(1);
    expect(mockSession.commitTransaction).not.toHaveBeenCalled();
    expect(mockSession.endSession).toHaveBeenCalledTimes(1);
  });

  test("aborts transaction and throws on error", async () => {
    const sortFn = jest.fn().mockRejectedValue(new Error("DB connection lost"));
    mockedFindOne.mockReturnValue({ sort: sortFn });

    await expect(
      findOrCreateDuplicateParent(
        "cat1" as unknown as mongoose.Types.ObjectId,
        "loc1" as unknown as mongoose.Types.ObjectId,
      ),
    ).rejects.toThrow("DB connection lost");

    expect(mockSession.abortTransaction).toHaveBeenCalledTimes(1);
    expect(mockSession.commitTransaction).not.toHaveBeenCalled();
    expect(mockSession.endSession).toHaveBeenCalledTimes(1);
  });

  test("passes session option to findOne for transaction isolation", async () => {
    const sortFn = jest.fn().mockResolvedValue(null);
    mockedFindOne.mockReturnValue({ sort: sortFn });

    await findOrCreateDuplicateParent(
      "cat1" as unknown as mongoose.Types.ObjectId,
      "loc1" as unknown as mongoose.Types.ObjectId,
    );

    expect(mockedFindOne).toHaveBeenCalledWith(
      expect.anything(),
      null,
      expect.objectContaining({ session: mockSession }),
    );
  });
});
