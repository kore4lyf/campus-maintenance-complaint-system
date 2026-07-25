jest.mock("./connection", () => ({
  connect: jest.fn(),
}));

jest.mock("mongoose", () => {
  const mockCreateIndexes = jest.fn();
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

// eslint-disable-next-line @typescript-eslint/no-require-imports -- jest mock hoisting
const mongoose = require("mongoose");
// eslint-disable-next-line @typescript-eslint/no-require-imports -- jest mock hoisting
const { connect } = require("./connection");
// eslint-disable-next-line @typescript-eslint/no-require-imports -- jest mock hoisting
const { createIndexes } = require("./indexes");

beforeEach(() => {
  jest.clearAllMocks();
});

describe("createIndexes", () => {
  it("calls connect and creates indexes for all collections", async () => {
    await createIndexes();

    expect(connect).toHaveBeenCalled();
    expect(mongoose.default.connection.model).toHaveBeenCalledWith("Complaint");
    expect(mongoose.default.connection.model).toHaveBeenCalledWith("User");
    expect(mongoose.default.connection.model).toHaveBeenCalledWith("Assignment");
    expect(mongoose.default.connection.model).toHaveBeenCalledWith("Notification");
  });
});
