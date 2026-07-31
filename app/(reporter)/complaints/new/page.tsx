import { connect } from "@/lib/db/connection";
import { CategoryModel } from "@/lib/db/models/category";
import { LocationModel } from "@/lib/db/models/location";
import { requireSession } from "@/lib/auth/dal";
import { ComplaintForm } from "./ComplaintForm";
import { PageShell, HeroBand, HeroBody } from "@/components/shared/PageShell";

/*
 * NewComplaintPageServer — server wrapper for the reporter submission form.
 *
 * Aesthetic pass (2026-07-29):
 *   - Adds a numbered caption strip (`01 · New report`) on the hero
 *     band matching the home / detail / queue cadence.
 *   - Replaces the inline accent strip ("AI-assisted inference") with
 *     a Card primitive so it lifts into the page rhythm without
 *     competing with the form for visual weight.
 *   - Adds an `effort estimate` micro-callout above the form so
 *     reporters know the form takes under a minute.
 *
 * Tokens used (no new tokens):
 *   - bg-accent, text-brand-strong on the AI-assisted badge.
 *   - bg-surface for the reassurance card surface.
 */

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

interface CategoryOption {
  id: string;
  name: string;
  systemType: string;
}

interface LocationOption {
  id: string;
  name: string;
  area: string;
}

async function loadFormData(): Promise<{
  categories: CategoryOption[];
  locations: LocationOption[];
}> {
  await connect();
  const [categoryDocs, locationDocs] = await Promise.all([
    CategoryModel.find({}).sort({ systemType: 1 }).lean(),
    LocationModel.find({}).sort({ area: 1, name: 1 }).lean(),
  ]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const categories: CategoryOption[] = categoryDocs.map((c: any) => ({
    id: String(c._id),
    name: c.name,
    systemType: c.systemType,
  }));
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const locations: LocationOption[] = locationDocs.map((l: any) => ({
    id: String(l._id),
    name: l.name,
    area: l.area,
  }));
  return { categories, locations };
}

export default async function NewComplaintPage(): Promise<React.ReactElement> {
  await requireSession("/sign-in");
  const { categories, locations } = await loadFormData();

  return (
    <PageShell>
      <HeroBand
        kicker="New report"
        title="What needs fixing?"
        subtitle="Describe the maintenance issue, pick a category and location, attach a photo if it helps, and choose whether to file anonymously."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white border border-border bg-surface px-3 py-1.5 text-xs font-medium">
              Under 1 minute
            </span>
          </div>
        }
      />

      <HeroBody>
        <div className="space-y-6">
          <ComplaintForm categories={categories} locations={locations} />
        </div>
      </HeroBody>
    </PageShell>
  );
}
