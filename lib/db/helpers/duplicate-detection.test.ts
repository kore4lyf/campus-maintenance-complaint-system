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

import { checkForDuplicate, DUPLICATE_WINDOW_MINUTES } from "./duplicate-detection";
import { ComplaintModel } from "../models/complaint";

const mockedFindOne = ComplaintModel.findOne as jest.Mock;

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
