/**
 * @jest-environment node
 */
jest.unmock("mongoose");

import mongoose from "mongoose";
import { complaintSchema } from "../models/complaint";
import { userSchema } from "../models/user";
import { notificationSchema } from "../models/notification";
import { categorySchema } from "../models/category";
import { statusHistorySchema } from "../models/status-history";

const MONGODB_URI = process.env.MONGODB_URI;
const TEST_DB = `invariants_test_${Date.now()}`;

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- runtime test models don't need strict typing
let Complaint: mongoose.Model<any>;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let User: mongoose.Model<any>;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let Notification: mongoose.Model<any>;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let Category: mongoose.Model<any>;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let StatusHistory: mongoose.Model<any>;

beforeAll(async () => {
  if (!MONGODB_URI) {
    throw new Error("MONGODB_URI required for runtime invariant tests");
  }
  await mongoose.connect(MONGODB_URI, { dbName: TEST_DB });

  Complaint = mongoose.model("ComplaintRuntime", complaintSchema);
  User = mongoose.model("UserRuntime", userSchema);
  Notification = mongoose.model("NotificationRuntime", notificationSchema);
  Category = mongoose.model("CategoryRuntime", categorySchema);
  StatusHistory = mongoose.model("StatusHistory", statusHistorySchema);
});

afterAll(async () => {
  await mongoose.connection.db?.dropDatabase();
  await mongoose.disconnect();
});

beforeEach(() => {
  jest.clearAllMocks();
});

afterEach(async () => {
  const db = mongoose.connection.db;
  if (db) {
    const cols = await db.listCollections().toArray();
    for (const col of cols) {
      await db.collection(col.name).deleteMany({});
    }
  }
});

function validComplaintData(overrides: Record<string, unknown> = {}) {
  const now = new Date();
  return {
    isAnonymous: true,
    reporterId: null,
    categoryId: new mongoose.Types.ObjectId(),
    locationId: new mongoose.Types.ObjectId(),
    description: "Test complaint description that is long enough",
    slaAcknowledgeBy: new Date(now.getTime() + 86400000),
    slaResolveBy: new Date(now.getTime() + 172800000),
    ...overrides,
  };
}

describe("AC-4: Anonymous complaint invariant (runtime)", () => {
  it("accepts anonymous complaint with reporterId set to logged-in user", async () => {
    const doc = new Complaint(validComplaintData({
      isAnonymous: true,
      reporterId: new mongoose.Types.ObjectId(),
    }));
    const saved = await doc.save();
    expect(saved.isAnonymous).toBe(true);
    expect(saved.reporterId).not.toBeNull();
  });

  it("accepts anonymous complaint with null reporterId", async () => {
    const doc = new Complaint(validComplaintData());
    const saved = await doc.save();
    expect(saved.isAnonymous).toBe(true);
    expect(saved.reporterId).toBeNull();
  });
});

describe("AC-5: SLA deadline ordering (runtime)", () => {
  it("rejects slaAcknowledgeBy >= slaResolveBy", async () => {
    const now = new Date();
    const doc = new Complaint(validComplaintData({
      slaAcknowledgeBy: new Date(now.getTime() + 172800000),
      slaResolveBy: new Date(now.getTime() + 86400000),
    }));

    await expect(doc.save()).rejects.toThrow(/slaAcknowledgeBy must be before slaResolveBy/);
  });

  it("accepts slaAcknowledgeBy < slaResolveBy", async () => {
    const doc = new Complaint(validComplaintData());
    const saved = await doc.save();
    expect(saved.slaAcknowledgeBy.getTime()).toBeLessThan(saved.slaResolveBy.getTime());
  });
});

describe("AC-3: Status transition validation (runtime)", () => {
  it("allows Submitted -> Acknowledged", async () => {
    const created = await Complaint.create(validComplaintData({ status: "Submitted" }));
    const doc = await Complaint.findById(created._id);
    expect(doc).not.toBeNull();

    doc!.status = "Acknowledged";
    const saved = await doc!.save();
    expect(saved.status).toBe("Acknowledged");
  });

  it("rejects Submitted -> In Progress", async () => {
    const created = await Complaint.create(validComplaintData({ status: "Submitted" }));
    const doc = await Complaint.findById(created._id);
    expect(doc).not.toBeNull();

    doc!.status = "In Progress";
    await expect(doc!.save()).rejects.toThrow(/Cannot transition from Submitted to In Progress/);
  });

  it("rejects Submitted -> Closed", async () => {
    const created = await Complaint.create(validComplaintData({ status: "Submitted" }));
    const doc = await Complaint.findById(created._id);
    expect(doc).not.toBeNull();

    doc!.status = "Closed";
    await expect(doc!.save()).rejects.toThrow(/Cannot transition from Submitted to Closed/);
  });
});

describe("AC-6: proofPhotoUrl is a virtual from statusHistory (runtime)", () => {
  it("complaint has no stored proofPhotoUrl field", async () => {
    const doc = new Complaint(validComplaintData());
    await doc.save();
    expect((doc as Record<string, unknown>).proofPhotoUrl).toBeNull();
  });

  it("complaint virtual returns photoUrl from latest Resolved statusHistory", async () => {
    const created = await Complaint.create(validComplaintData({ status: "Submitted" }));

    await StatusHistory.create({
      complaintId: created._id,
      fromStatus: "Submitted",
      toStatus: "Acknowledged",
      changedById: new mongoose.Types.ObjectId(),
      note: "Acknowledged",
    });

    await StatusHistory.create({
      complaintId: created._id,
      fromStatus: "Acknowledged",
      toStatus: "In Progress",
      changedById: new mongoose.Types.ObjectId(),
    });

    await StatusHistory.create({
      complaintId: created._id,
      fromStatus: "In Progress",
      toStatus: "Resolved",
      changedById: new mongoose.Types.ObjectId(),
      photoUrl: "https://example.com/proof.jpg",
    });

    const doc = await Complaint.findById(created._id).populate("_statusHistory");
    expect(doc).not.toBeNull();
    expect(doc!.proofPhotoUrl).toBe("https://example.com/proof.jpg");
  });
});

describe("AC-7: Notification required fields (runtime)", () => {
  it("rejects notification without complaintId", async () => {
    const doc = new Notification({
      recipientId: new mongoose.Types.ObjectId(),
      type: "status",
      message: "Test message",
      read: false,
    });

    await expect(doc.save()).rejects.toThrow(/complaintId.*required/i);
  });

  it("accepts notification with complaintId", async () => {
    const doc = new Notification({
      complaintId: new mongoose.Types.ObjectId(),
      recipientId: new mongoose.Types.ObjectId(),
      type: "status",
      message: "Test message",
      read: false,
    });

    const saved = await doc.save();
    expect(saved.complaintId).toBeDefined();
  });
});

describe("AC-2: Unique constraints (runtime)", () => {
  it("rejects duplicate users.email", async () => {
    await User.create({
      name: "Test User",
      email: "duplicate@test.com",
      role: "reporter",
    });

    await expect(
      User.create({
        name: "Test User 2",
        email: "duplicate@test.com",
        role: "reporter",
      })
    ).rejects.toThrow();
  });

  it("rejects duplicate categories.systemType", async () => {
    await Category.create({
      name: "Plumbing Services",
      systemType: "Plumbing",
      defaultSeverity: "Medium",
      slaAcknowledgeHrs: 24,
      slaResolveHrs: 72,
    });

    await expect(
      Category.create({
        name: "Plumbing Services 2",
        systemType: "Plumbing",
        defaultSeverity: "High",
        slaAcknowledgeHrs: 12,
        slaResolveHrs: 48,
      })
    ).rejects.toThrow();
  });
});
