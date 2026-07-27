export type BreachKind = "none" | "acknowledge_overdue" | "resolve_overdue";

export interface BreachState {
  kind: BreachKind;
  overdueMs: number;
  asOf: Date;
}

export interface BreachInput {
  slaAcknowledgeBy: Date;
  slaResolveBy: Date;
  status: string;
}

export function evaluateBreachState({
  complaint,
  now,
}: {
  complaint: BreachInput;
  now: Date;
}): BreachState {
  const acknowledgeTime = new Date(complaint.slaAcknowledgeBy).getTime();
  const resolveTime = new Date(complaint.slaResolveBy).getTime();
  const nowMs = now.getTime();

  if (complaint.status === "Submitted" && nowMs > acknowledgeTime) {
    return {
      kind: "acknowledge_overdue",
      overdueMs: nowMs - acknowledgeTime,
      asOf: now,
    };
  }

  if (
    (complaint.status === "Acknowledged" || complaint.status === "In Progress") &&
    nowMs > resolveTime
  ) {
    return {
      kind: "resolve_overdue",
      overdueMs: nowMs - resolveTime,
      asOf: now,
    };
  }

  return { kind: "none", overdueMs: 0, asOf: now };
}

export function formatOverdueDuration(overdueMs: number): string {
  if (overdueMs <= 0) return "0m";

  const totalMinutes = Math.floor(overdueMs / (1000 * 60));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours === 0) return `${minutes}m`;
  if (minutes === 0) return `${hours}h`;
  return `${hours}h ${minutes}m`;
}
