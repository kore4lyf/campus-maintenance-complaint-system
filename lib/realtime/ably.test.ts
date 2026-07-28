const mockPublish = jest.fn().mockResolvedValue(undefined);
const mockGet = jest.fn().mockReturnValue({ publish: mockPublish });

jest.mock("ably", () => ({
  __esModule: true,
  default: {
    Realtime: jest.fn().mockImplementation(() => ({
      channels: { get: mockGet },
    })),
  },
}));

import { publishToChannel, publishAssignmentNotification } from "./ably";

describe("publishToChannel", () => {
  const originalEnv = process.env.ABLY_API_KEY;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.ABLY_API_KEY = "test-key";
  });

  afterEach(() => {
    process.env.ABLY_API_KEY = originalEnv;
  });

  test("returns true when publish succeeds", async () => {
    const result = await publishToChannel({
      channelName: "test-channel",
      eventName: "test-event",
      data: { message: "hello" },
    });
    expect(result).toBe(true);
  });

  test("returns false when ABLY_API_KEY is not set", async () => {
    delete process.env.ABLY_API_KEY;
    const result = await publishToChannel({
      channelName: "test-channel",
      eventName: "test-event",
      data: { message: "hello" },
    });
    expect(result).toBe(false);
  });

  test("returns false when publish throws", async () => {
    mockPublish.mockRejectedValueOnce(new Error("network error"));
    const result = await publishToChannel({
      channelName: "test-channel",
      eventName: "test-event",
      data: { message: "hello" },
    });
    expect(result).toBe(false);
  });
});

describe("publishAssignmentNotification", () => {
  const originalEnv = process.env.ABLY_API_KEY;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.ABLY_API_KEY = "test-key";
  });

  afterEach(() => {
    process.env.ABLY_API_KEY = originalEnv;
  });

  test("publishes to user channel with assignment event", async () => {
    const result = await publishAssignmentNotification({
      technicianId: "tech1",
      complaintId: "comp1",
      adminName: "Admin",
    });
    expect(result).toBe(true);
    expect(mockGet).toHaveBeenCalledWith("user:tech1");
    expect(mockPublish).toHaveBeenCalledWith("assignment", expect.objectContaining({
      complaintId: "comp1",
      message: "Admin assigned this complaint to you",
    }));
  });
});
