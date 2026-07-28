jest.mock("./connection", () => ({
  connect: jest.fn(),
}));

jest.mock("mongoose", () => {
  const mockCreateIndexes = jest.fn().mockResolvedValue(undefined);
  return {
    __esModule: true,
    default: {
      connection: {
        model: jest.fn().mockReturnValue({
          collection: { createIndexes: mockCreateIndexes },
        }),
      },
    },
    _mockCreateIndexes: mockCreateIndexes,
  };
});

import { createIndexes } from "./indexes";
import { connect } from "./connection";

const mockedConnect = connect as jest.Mock;
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { _mockCreateIndexes: mockCreateIndexes } = require("mongoose");

describe("createIndexes", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCreateIndexes.mockReset();
    mockCreateIndexes.mockResolvedValue(undefined);
  });

  test("calls connect before creating indexes", async () => {
    await createIndexes();
    expect(mockedConnect).toHaveBeenCalled();
  });

  test("calls createIndexes on all 6 models", async () => {
    await createIndexes();
    expect(mockCreateIndexes).toHaveBeenCalledTimes(6);
  });

  test("returns successfully when all models resolve", async () => {
    await expect(createIndexes()).resolves.toBeUndefined();
  });

  test("throws when any model rejects", async () => {
    mockCreateIndexes.mockRejectedValueOnce(new Error("network error"));
    await expect(createIndexes()).rejects.toThrow("network error");
  });

  test("throws after MAX_RETRIES when models keep failing", async () => {
    mockCreateIndexes.mockRejectedValue(new Error("persistent error"));
    await expect(createIndexes()).rejects.toThrow("persistent error");
    expect(mockCreateIndexes).toHaveBeenCalledTimes(6);
  });
});
