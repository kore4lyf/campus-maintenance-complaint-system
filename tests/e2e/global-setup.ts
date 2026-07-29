import { MongoClient } from "mongodb";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { CATEGORIES, LOCATIONS } from "../../scripts/seed";

/*
 * Playwright global setup.
 *
 * Seeds the test database with the standard categories and locations that
 * the rest of the e2e/seed assumes. Without these, the bug surfaced on
 * 2026-07-28 (categories list fetch returned empty) recurs whenever a
 * fresh dev environment is started.
 *
 * Plain MongoDB driver is used (no Mongoose) because the seeding script
 * runs before Next.js boots, so we cannot rely on the Mongoose connection
 * pool.
 */

const DEFAULT_URI = "mongodb://127.0.0.1:27017/lasu_cms";
const DEFAULT_DB = "lasu_cms";
const COLLECTION_CATEGORIES = "categories";
const COLLECTION_LOCATIONS = "locations";

function readMongoUri(): string {
  let raw: string;
  try {
    raw = readFileSync(join(process.cwd(), ".env"), "utf-8");
  } catch {
    return DEFAULT_URI;
  }
  const line = raw
    .split(/\r?\n/)
    .map((l) => l.trim())
    .find((l) => l.startsWith("MONGODB_URI="));
  if (!line) return DEFAULT_URI;
  return line.slice("MONGODB_URI=".length).replace(/^['"]|['"]$/g, "");
}

export default async function globalSetup(): Promise<void> {
  const uri = readMongoUri();
  const client = new MongoClient(uri);
  await client.connect();
  try {
    // Mirror Mongoose: leave the DB name implicit (read from URI path,
    // defaulting to "test" when none). The dev URI in .env omits a
    // database name, so this works for the standard dev setup. Production
    // URIs that include `/cms_lasu?...` will land in `cms_lasu`.
    const db = client.db();

    const categories = db.collection(COLLECTION_CATEGORIES);
    for (const cat of CATEGORIES) {
      await categories.updateOne(
        { systemType: cat.systemType },
        { $set: cat },
        { upsert: true },
      );
    }

    const locations = db.collection(COLLECTION_LOCATIONS);
    for (const loc of LOCATIONS) {
      const existing = await locations.findOne({ name: loc.name });
      if (!existing) {
        await locations.insertOne(loc);
      }
    }

    const totalCats = await categories.countDocuments();
    const totalLocs = await locations.countDocuments();
    process.stderr.write(
      `[e2e-setup] categories=${totalCats}, locations=${totalLocs} (db=${db.databaseName})\n`,
    );
  } finally {
    await client.close();
  }
}
