import mongoose from "mongoose";

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

export { seedCategories, seedLocations, CATEGORIES, LOCATIONS };
