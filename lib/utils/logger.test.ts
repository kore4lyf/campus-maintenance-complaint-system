import { logger } from "./logger";

describe("logger", () => {
  let logSpy: jest.SpyInstance;
  let warnSpy: jest.SpyInstance;
  let errorSpy: jest.SpyInstance;

  beforeEach(() => {
    logSpy = jest.spyOn(console, "log").mockImplementation();
    warnSpy = jest.spyOn(console, "warn").mockImplementation();
    errorSpy = jest.spyOn(console, "error").mockImplementation();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test("info calls console.log with JSON", () => {
    logger.info("test message", { key: "value" });
    expect(logSpy).toHaveBeenCalledTimes(1);
    const output = JSON.parse(logSpy.mock.calls[0][0]);
    expect(output.level).toBe("info");
    expect(output.message).toBe("test message");
    expect(output.key).toBe("value");
    expect(output.timestamp).toBeDefined();
  });

  test("warn calls console.warn with JSON", () => {
    logger.warn("warning message");
    expect(warnSpy).toHaveBeenCalledTimes(1);
    const output = JSON.parse(warnSpy.mock.calls[0][0]);
    expect(output.level).toBe("warn");
    expect(output.message).toBe("warning message");
  });

  test("error calls console.error with JSON", () => {
    logger.error("error message");
    expect(errorSpy).toHaveBeenCalledTimes(1);
    const output = JSON.parse(errorSpy.mock.calls[0][0]);
    expect(output.level).toBe("error");
    expect(output.message).toBe("error message");
  });

  test("redacts sensitive fields", () => {
    logger.info("login", {
      email: "user@example.com",
      password: "secret123",
      name: "Alice",
      anonymousId: "anon1",
      cronSecret: "cron_key",
      authorization: "Bearer token",
    });
    const output = JSON.parse(logSpy.mock.calls[0][0]);
    expect(output.email).toBe("[REDACTED]");
    expect(output.password).toBe("[REDACTED]");
    expect(output.name).toBe("[REDACTED]");
    expect(output.anonymousId).toBe("[REDACTED]");
    expect(output.cronSecret).toBe("[REDACTED]");
    expect(output.authorization).toBe("[REDACTED]");
  });

  test("redacts nested sensitive fields", () => {
    logger.info("nested", {
      user: { email: "a@b.com", passwordHash: "hash" },
    });
    const output = JSON.parse(logSpy.mock.calls[0][0]);
    expect(output.user.email).toBe("[REDACTED]");
    expect(output.user.passwordHash).toBe("[REDACTED]");
  });

  test("does not redact non-sensitive fields", () => {
    logger.info("safe", { action: "submit", count: 5 });
    const output = JSON.parse(logSpy.mock.calls[0][0]);
    expect(output.action).toBe("submit");
    expect(output.count).toBe(5);
  });

  test("works without data parameter", () => {
    logger.info("no data");
    const output = JSON.parse(logSpy.mock.calls[0][0]);
    expect(output.message).toBe("no data");
    expect(output.timestamp).toBeDefined();
  });
});
