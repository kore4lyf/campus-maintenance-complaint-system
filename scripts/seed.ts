import mongoose from "mongoose";
import { connect } from "@/lib/db/connection";
import { UserModel } from "@/lib/db/models/user";
import { getAuth } from "@/lib/auth/config";

const CATEGORIES = [
  { name: "Electrical Faults", systemType: "Electrical", defaultSeverity: "High", slaAcknowledgeHrs: 4, slaResolveHrs: 24 },
  { name: "Plumbing Issues", systemType: "Plumbing", defaultSeverity: "High", slaAcknowledgeHrs: 4, slaResolveHrs: 24 },
  { name: "Carpentry & Woodwork", systemType: "Carpentry", defaultSeverity: "Medium", slaAcknowledgeHrs: 8, slaResolveHrs: 48 },
  { name: "HVAC & Air Conditioning", systemType: "HVAC", defaultSeverity: "Critical", slaAcknowledgeHrs: 2, slaResolveHrs: 12 },
  { name: "ICT & Networking", systemType: "ICT", defaultSeverity: "Medium", slaAcknowledgeHrs: 8, slaResolveHrs: 48 },
  { name: "Cleaning & Sanitation", systemType: "Cleaning", defaultSeverity: "Low", slaAcknowledgeHrs: 24, slaResolveHrs: 72 },
  { name: "Security & Safety", systemType: "Security", defaultSeverity: "Critical", slaAcknowledgeHrs: 1, slaResolveHrs: 8 },
  { name: "Other Maintenance", systemType: "Other", defaultSeverity: "Medium", slaAcknowledgeHrs: 8, slaResolveHrs: 48 },
];

const LOCATIONS = [
  { name: "Female Hostel A", area: "hostel" },
  { name: "Female Hostel B", area: "hostel" },
  { name: "Male Hostel A", area: "hostel" },
  { name: "Male Hostel B", area: "hostel" },
  { name: "Engineering Block", area: "academic" },
  { name: "Science Block", area: "academic" },
  { name: "Arts Block", area: "academic" },
  { name: "Management Block", area: "academic" },
  { name: "Library", area: "academic" },
  { name: "ICT Centre", area: "lab" },
  { name: "Engineering Lab", area: "lab" },
  { name: "Science Lab", area: "lab" },
  { name: "Admin Building", area: "admin" },
  { name: "Vice Chancellor Office", area: "admin" },
  { name: "Main Gate", area: "other" },
  { name: "Sports Complex", area: "other" },
];

interface SeedDocument {
  systemType?: string;
  name?: string;
  area?: string;
  defaultSeverity?: string;
  slaAcknowledgeHrs?: number;
  slaResolveHrs?: number;
}

async function seedCategories(
  CategoryModel: mongoose.Model<SeedDocument>
): Promise<number> {
  let count = 0;
  for (const cat of CATEGORIES) {
    const result = await CategoryModel.findOneAndUpdate(
      { systemType: cat.systemType },
      { $set: cat },
      { upsert: true, new: true }
    );
    if (result) count++;
  }
  return count;
}

async function seedLocations(
  LocationModel: mongoose.Model<SeedDocument>
): Promise<number> {
  let count = 0;
  for (const loc of LOCATIONS) {
    const existing = await LocationModel.findOne({ name: loc.name });
    if (!existing) {
      await LocationModel.create(loc);
      count++;
    }
  }
  return count;
}

type Role = "dicht_admin" | "dicht_technician";

interface SeedUserTrio {
  email: string | undefined;
  password: string | undefined;
  name: string | undefined;
}

function readTrio(
  emailVar: string,
  passwordVar: string,
  nameVar: string,
): SeedUserTrio | null {
  const email = process.env[emailVar];
  const password = process.env[passwordVar];
  const name = process.env[nameVar];
  if (!email || !password || !name) {
    return null;
  }
  return { email, password, name };
}

async function seedRole(
  trio: SeedUserTrio,
  role: Role,
): Promise<"created" | "updated" | "skipped"> {
  await connect();
  const auth = await getAuth();

  try {
    await auth.api.signUpEmail({
      body: { email: trio.email, password: trio.password, name: trio.name },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (!/USER_ALREADY_EXISTS|already/i.test(message)) {
      throw err;
    }
    // Already exists: ensure password is in sync and role is correct.
    await UserModel.findOneAndUpdate(
      { email: trio.email },
      { $set: { role, name: trio.name } },
    );
    return "updated";
  }

  await UserModel.findOneAndUpdate(
    { email: trio.email },
    { $set: { role, name: trio.name } },
  );
  return "created";
}

async function seedAdmin(): Promise<"created" | "updated" | "skipped"> {
  const trio = readTrio("SEED_ADMIN_EMAIL", "SEED_ADMIN_PASSWORD", "SEED_ADMIN_NAME");
  if (!trio) return "skipped";
  return seedRole(trio, "dicht_admin");
}

async function seedTechnician(): Promise<"created" | "updated" | "skipped"> {
  const trio = readTrio("SEED_TECH_EMAIL", "SEED_TECH_PASSWORD", "SEED_TECH_NAME");
  if (!trio) return "skipped";
  return seedRole(trio, "dicht_technician");
}

export {
  seedCategories,
  seedLocations,
  seedAdmin,
  seedTechnician,
  CATEGORIES,
  LOCATIONS,
};
