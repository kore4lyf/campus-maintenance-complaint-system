type LogLevel = "info" | "warn" | "error";

interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  [key: string]: unknown;
}

const REDACTED_FIELDS = new Set([
  "password",
  "passwordHash",
  "email",
  "name",
  "anonymousId",
  "cronSecret",
  "authorization",
]);

function redactValue(key: string, value: unknown): unknown {
  if (REDACTED_FIELDS.has(key)) {
    if (typeof value === "string" && value.length > 0) {
      return "[REDACTED]";
    }
    return undefined;
  }
  if (value !== null && typeof value === "object" && !Array.isArray(value)) {
    return redactObject(value as Record<string, unknown>);
  }
  return value;
}

function redactObject(obj: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    const redacted = redactValue(key, value);
    if (redacted !== undefined) {
      result[key] = redacted;
    }
  }
  return result;
}

function formatEntry(entry: LogEntry): string {
  const redacted = redactObject(entry as unknown as Record<string, unknown>);
  return JSON.stringify(redacted);
}

function log(level: LogLevel, message: string, data?: Record<string, unknown> | object): void {
  const entry: LogEntry = {
    level,
    message,
    timestamp: new Date().toISOString(),
    ...(data ? redactObject(data as Record<string, unknown>) : {}),
  };

  const formatted = formatEntry(entry);

  if (level === "error") {
    console.error(formatted);
  } else if (level === "warn") {
    console.warn(formatted);
  } else {
    console.log(formatted);
  }
}

export const logger = {
  info: (message: string, data?: Record<string, unknown> | object) =>
    log("info", message, data),
  warn: (message: string, data?: Record<string, unknown> | object) =>
    log("warn", message, data),
  error: (message: string, data?: Record<string, unknown> | object) =>
    log("error", message, data),
};
