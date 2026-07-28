jest.mock("@/lib/db/models/complaint", () => ({
  ComplaintModel: {
    findOneAndUpdate: jest.fn(),
    findById: jest.fn(),
  },
}));

jest.mock("@/lib/utils/errors", () => ({
  ApiError: class ApiError extends Error {
    code: string;
    status: number;
    constructor(code: string, message: string, status: number) {
      super(message);
      this.code = code;
      this.status = status;
    }
  },
}));

import { transitionStatus } from "./transition";
import { ComplaintModel } from "../models/complaint";

const mockedFindOneAndUpdate = ComplaintModel.findOneAndUpdate as jest.Mock;
const mockedFindById = ComplaintModel.findById as jest.Mock;

describe("transitionStatus", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("returns success when findOneAndUpdate succeeds", async () => {
    const updatedDoc = { _id: "c1", status: "Acknowledged", __v: 1 };
    mockedFindOneAndUpdate.mockResolvedValue(updatedDoc);
    const result = await transitionStatus(
      "c1" as unknown as mongoose.Types.ObjectId,
      "Submitted",
      "Acknowledged",
      0,
    );
    expect(result.success).toBe(true);
    expect(result.complaint).toEqual(updatedDoc);
  });

  test("throws not_found when complaint does not exist", async () => {
    mockedFindOneAndUpdate.mockResolvedValue(null);
    mockedFindById.mockResolvedValue(null);
    await expect(
      transitionStatus(
        "c1" as unknown as mongoose.Types.ObjectId,
        "Submitted",
        "Acknowledged",
        0,
      ),
    ).rejects.toThrow("Complaint not found");
  });

  test("throws stale_write when version mismatch", async () => {
    mockedFindOneAndUpdate.mockResolvedValue(null);
    mockedFindById.mockResolvedValue({ status: "Submitted", __v: 1 });
    await expect(
      transitionStatus(
        "c1" as unknown as mongoose.Types.ObjectId,
        "Submitted",
        "Acknowledged",
        0,
      ),
    ).rejects.toThrow("Please retry");
  });

  test("throws stale_write when status mismatch but same version", async () => {
    mockedFindOneAndUpdate.mockResolvedValue(null);
    mockedFindById.mockResolvedValue({ status: "Acknowledged", __v: 0 });
    await expect(
      transitionStatus(
        "c1" as unknown as mongoose.Types.ObjectId,
        "Submitted",
        "Acknowledged",
        0,
      ),
    ).rejects.toThrow("Please retry");
  });
});
