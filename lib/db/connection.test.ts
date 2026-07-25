const mockMongooseConnect = jest.fn().mockResolvedValue(undefined);
const mockMongooseDisconnect = jest.fn().mockResolvedValue(undefined);

jest.mock("mongoose", () => ({
  __esModule: true,
  default: {
    connect: mockMongooseConnect,
    disconnect: mockMongooseDisconnect,
  },
}));

beforeEach(() => {
  jest.clearAllMocks();
  jest.resetModules();
});

describe("connection", () => {
  it("connects to MongoDB", async () => {
    process.env.MONGODB_URI = "mongodb://localhost:27017/test";
    // eslint-disable-next-line @typescript-eslint/no-require-imports -- jest resetModules requires require()
    const { connect } = require("./connection");
    await connect();
    expect(mockMongooseConnect).toHaveBeenCalledWith("mongodb://localhost:27017/test", {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });
  });

  it("disconnects from MongoDB", async () => {
    process.env.MONGODB_URI = "mongodb://localhost:27017/test";
    // eslint-disable-next-line @typescript-eslint/no-require-imports -- jest resetModules requires require()
    const { connect, disconnect } = require("./connection");
    await connect();
    await disconnect();
    expect(mockMongooseDisconnect).toHaveBeenCalled();
  });

  it("skips connect if already connected", async () => {
    process.env.MONGODB_URI = "mongodb://localhost:27017/test";
    // eslint-disable-next-line @typescript-eslint/no-require-imports -- jest resetModules requires require()
    const { connect } = require("./connection");
    await connect();
    await connect();
    expect(mockMongooseConnect).toHaveBeenCalledTimes(1);
  });

  it("skips disconnect if not connected", async () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports -- jest resetModules requires require()
    const { disconnect } = require("./connection");
    await disconnect();
    expect(mockMongooseDisconnect).not.toHaveBeenCalled();
  });

  it("throws if MONGODB_URI is missing", async () => {
    delete process.env.MONGODB_URI;
    // eslint-disable-next-line @typescript-eslint/no-require-imports -- jest resetModules requires require()
    const { connect } = require("./connection");
    await expect(connect()).rejects.toThrow("Missing MONGODB_URI environment variable");
  });
});
