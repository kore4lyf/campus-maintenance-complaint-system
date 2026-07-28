import { evaluateBreachState, formatOverdueDuration } from "./breach-detection";

describe("evaluateBreachState", () => {
  const now = new Date("2026-07-26T12:00:00Z");

  test("returns none when status is Submitted and within SLA", () => {
    const result = evaluateBreachState({
      complaint: {
        slaAcknowledgeBy: new Date("2026-07-26T13:00:00Z"),
        slaResolveBy: new Date("2026-07-26T14:00:00Z"),
        status: "Submitted",
      },
      now,
    });
    expect(result.kind).toBe("none");
    expect(result.overdueMs).toBe(0);
  });

  test("returns acknowledge_overdue when Submitted and past acknowledge deadline", () => {
    const result = evaluateBreachState({
      complaint: {
        slaAcknowledgeBy: new Date("2026-07-26T11:00:00Z"),
        slaResolveBy: new Date("2026-07-26T14:00:00Z"),
        status: "Submitted",
      },
      now,
    });
    expect(result.kind).toBe("acknowledge_overdue");
    expect(result.overdueMs).toBe(60 * 60 * 1000);
  });

  test("returns resolve_overdue when Acknowledged and past resolve deadline", () => {
    const result = evaluateBreachState({
      complaint: {
        slaAcknowledgeBy: new Date("2026-07-26T10:00:00Z"),
        slaResolveBy: new Date("2026-07-26T11:30:00Z"),
        status: "Acknowledged",
      },
      now,
    });
    expect(result.kind).toBe("resolve_overdue");
    expect(result.overdueMs).toBe(30 * 60 * 1000);
  });

  test("returns resolve_overdue when In Progress and past resolve deadline", () => {
    const result = evaluateBreachState({
      complaint: {
        slaAcknowledgeBy: new Date("2026-07-26T10:00:00Z"),
        slaResolveBy: new Date("2026-07-26T11:00:00Z"),
        status: "In Progress",
      },
      now,
    });
    expect(result.kind).toBe("resolve_overdue");
    expect(result.overdueMs).toBe(60 * 60 * 1000);
  });

  test("returns none for Resolved status even if past deadline", () => {
    const result = evaluateBreachState({
      complaint: {
        slaAcknowledgeBy: new Date("2026-07-26T10:00:00Z"),
        slaResolveBy: new Date("2026-07-26T11:00:00Z"),
        status: "Resolved",
      },
      now,
    });
    expect(result.kind).toBe("none");
  });

  test("returns none for Closed status", () => {
    const result = evaluateBreachState({
      complaint: {
        slaAcknowledgeBy: new Date("2026-07-26T10:00:00Z"),
        slaResolveBy: new Date("2026-07-26T11:00:00Z"),
        status: "Closed",
      },
      now,
    });
    expect(result.kind).toBe("none");
  });
});

describe("formatOverdueDuration", () => {
  test("returns 0m for zero or negative", () => {
    expect(formatOverdueDuration(0)).toBe("0m");
    expect(formatOverdueDuration(-1000)).toBe("0m");
  });

  test("formats minutes only", () => {
    expect(formatOverdueDuration(30 * 60 * 1000)).toBe("30m");
  });

  test("formats hours only", () => {
    expect(formatOverdueDuration(2 * 60 * 60 * 1000)).toBe("2h");
  });

  test("formats hours and minutes", () => {
    expect(formatOverdueDuration(2.5 * 60 * 60 * 1000)).toBe("2h 30m");
  });
});
