/**
 * @jest-environment node
 */
jest.mock("@/lib/db/connection", () => ({
  connect: jest.fn(async () => undefined),
}));

const complaints: Array<Record<string, unknown>> = [];
const admins: Array<Record<string, unknown>> = [];
const notifications: Array<Record<string, unknown>> = [];

jest.mock("@/lib/db/models/complaint", () => ({
  ComplaintModel: {
    find: (filter: Record<string, unknown>) => {
      const filterStatus = (filter.status as { $ne?: string })?.$ne;
      const filtered = complaints.filter(
        (c) => !filterStatus || c.status !== filterStatus,
      );
      return {
        lean: async () => filtered.map((d) => ({ ...d })),
      };
    },
    findOneAndUpdate: jest.fn(
      (filter: { _id: string }, update: { $set: Record<string, unknown> }) => {
        const found = complaints.find((c) => String(c._id) === String(filter._id));
        if (!found) return null;
        Object.assign(found, update.$set);
        return { ...found };
      },
    ),
    __seed: (doc: Record<string, unknown>) => complaints.push(doc),
  },
}));

jest.mock("@/lib/db/models/user", () => ({
  UserModel: {
    find: (filter: Record<string, unknown>) => {
      const filtered = admins.filter((u) => u.role === filter.role);
      return {
        lean: async () => filtered.map((d) => ({ ...d })),
      };
    },
    __seed: (doc: Record<string, unknown>) => admins.push(doc),
  },
}));

jest.mock("@/lib/db/models/notification", () => ({
  NotificationModel: {
    findOne: (filter: Record<string, unknown>) => {
      const cutoff = (filter.createdAt as { $gte?: Date })?.$gte;
      const filtered = notifications.filter((n) => {
        if (n.complaintId !== filter.complaintId) return false;
        if (n.type !== filter.type) return false;
        if (cutoff && new Date(n.createdAt as string) < cutoff) return false;
        return true;
      });
      return {
        lean: async () => (filtered.length > 0 ? { ...filtered[0] } : null),
      };
    },
    create: jest.fn(async (doc: Record<string, unknown>) => {
      notifications.push({ ...doc, _id: `N-${notifications.length + 1}` });
      return notifications[notifications.length - 1];
    }),
    __seed: (doc: Record<string, unknown>) => notifications.push(doc),
  },
}));

const publishMock = jest.fn(async () => true);
jest.mock("@/lib/realtime/ably", () => ({
  publishToChannel: (...args: unknown[]) => publishMock(...args),
}));

import { POST } from "./route";

beforeEach(() => {
  complaints.length = 0;
  admins.length = 0;
  notifications.length = 0;
  publishMock.mockClear();
});

const VALID_24 = "0123456789abcdef01234567";

function makeRequest(authToken: string | null): Request {
  const headers: Record<string, string> = {};
  if (authToken) headers.authorization = `Bearer ${authToken}`;
  return new Request("http://x/api/cron/sla-sweep", {
    method: "POST",
    headers,
  });
}

test("rejects request without bearer token", async () => {
  const res = await POST(makeRequest(null));
  expect(res.status).toBe(401);
});

test("rejects request with wrong bearer token", async () => {
  process.env.CRON_SECRET = "right-secret";
  const res = await POST(makeRequest("wrong-secret"));
  expect(res.status).toBe(401);
});

test("accepts request with right bearer token", async () => {
  process.env.CRON_SECRET = "right-secret";
  const res = await POST(makeRequest("right-secret"));
  expect(res.status).toBe(200);
  delete process.env.CRON_SECRET;
});

test("empty queue returns zero counts", async () => {
  process.env.CRON_SECRET = "sec";
  const res = await POST(makeRequest("sec"));
  expect(res.status).toBe(200);
  const body = await res.json();
  expect(body.data).toMatchObject({
    scannedCount: 0,
    escalatedCount: 0,
    skipCount: 0,
  });
  expect(typeof body.data.runId).toBe("string");
  expect(typeof body.data.startedAt).toBe("string");
  expect(typeof body.data.durationMs).toBe("number");
  delete process.env.CRON_SECRET;
});

test("escalates a complaint whose acknowledge deadline is past", async () => {
  process.env.CRON_SECRET = "sec";
  admins.push({ _id: "A1", name: "Admin", email: "a@x", role: "dicht_admin" });
  complaints.push({
    _id: VALID_24,
    status: "Submitted",
    slaAcknowledgeBy: new Date(Date.now() - 60_000),
    slaResolveBy: new Date(Date.now() + 60_000),
    escalated: false,
  });
  const res = await POST(makeRequest("sec"));
  expect(res.status).toBe(200);
  const body = await res.json();
  expect(body.data.scannedCount).toBe(1);
  expect(body.data.escalatedCount).toBe(1);
  expect(body.data.skipCount).toBe(0);
  // Notification created.
  expect(notifications).toHaveLength(1);
  expect(notifications[0]).toMatchObject({
    complaintId: VALID_24,
    recipientId: "A1",
    type: "escalation",
  });
  expect(notifications[0].message).toMatch(/overdue/i);
  // Ably push invoked.
  expect(publishMock).toHaveBeenCalledWith(
    expect.objectContaining({
      channelName: "admin-queue",
      eventName: "escalation",
    }),
  );
  // Flag flipped on the complaint.
  expect((complaints[0] as { escalated?: boolean }).escalated).toBe(true);
  delete process.env.CRON_SECRET;
});

test("does not double-escalate when a notification already exists in the dedup window", async () => {
  process.env.CRON_SECRET = "sec";
  admins.push({ _id: "A1", name: "Admin", email: "a@x", role: "dicht_admin" });
  complaints.push({
    _id: VALID_24,
    status: "Submitted",
    slaAcknowledgeBy: new Date(Date.now() - 60_000),
    slaResolveBy: new Date(Date.now() + 60_000),
    escalated: false,
  });
  notifications.push({
    complaintId: VALID_24,
    recipientId: "A1",
    type: "escalation",
    message: "Acknowledgement overdue",
    createdAt: new Date(Date.now() - 60_000).toISOString(),
    read: false,
  });
  const res = await POST(makeRequest("sec"));
  expect(res.status).toBe(200);
  const body = await res.json();
  expect(body.data.escalatedCount).toBe(0);
  expect(body.data.skipCount).toBe(1);
  expect(notifications).toHaveLength(1);
  delete process.env.CRON_SECRET;
});

test("does not escalate a still-within-SLA complaint", async () => {
  process.env.CRON_SECRET = "sec";
  admins.push({ _id: "A1", name: "Admin", email: "a@x", role: "dicht_admin" });
  complaints.push({
    _id: VALID_24,
    status: "Submitted",
    slaAcknowledgeBy: new Date(Date.now() + 60_000),
    slaResolveBy: new Date(Date.now() + 120_000),
    escalated: false,
  });
  const res = await POST(makeRequest("sec"));
  expect(res.status).toBe(200);
  expect((await res.json()).data.escalatedCount).toBe(0);
  delete process.env.CRON_SECRET;
});
