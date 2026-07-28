import { PlusCircle, ShieldCheck, Sparkles } from "lucide-react";
import { connect } from "@/lib/db/connection";
import { CategoryModel } from "@/lib/db/models/category";
import { LocationModel } from "@/lib/db/models/location";
import { requireSession } from "@/lib/auth/dal";
import { ComplaintForm } from "./ComplaintForm";

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

/*
 * Fetch the dropdown sources server-side. We throw `any` casts here
 * because the route handler /api/complaints POST path uses `(Model as any)`
 * too; the schemas are typed at the InferSchemaType<typeof Schema> level, but
 * this loader still has to flake on the strict API. The downstream shape
 * is what we project.
 */
async function loadFormData(): Promise<{
  categories: CategoryOption[];
  locations: LocationOption[];
}> {
  await connect();
  const [categoryDocs, locationDocs] = await Promise.all([
    CategoryModel.find({}).sort({ systemType: 1 }).lean(),
    LocationModel.find({}).sort({ area: 1, name: 1 }).lean(),
  ]);
  const categories: CategoryOption[] = categoryDocs.map((c: any) => ({
    id: String(c._id),
    name: c.name,
    systemType: c.systemType,
  }));
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
    <div className="mx-auto max-w-3xl">
      <header className="mb-8">
        <p className="text-xs font-semibold uppercase tracking-wider text-accent-strong">
          New report
        </p>
        <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-foreground-strong sm:text-4xl">
              What needs fixing?
            </h1>
            <p className="mt-2 max-w-2xl text-base text-muted-strong">
              Describe the maintenance issue, pick a category and location,
              attach a photo if it helps, and choose whether to file
              anonymously.
            </p>
          </div>
          <span className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1.5 text-xs font-medium text-muted-strong">
            <PlusCircle className="h-3 w-3 text-accent-strong" aria-hidden="true" />
            <span className="numeric">
              {categories.length} × {locations.length}
            </span>
            <span>categories &amp; locations</span>
          </span>
        </div>
      </header>

      <div className="mb-6 inline-flex items-start gap-2 rounded-md bg-accent-soft/40 px-4 py-3 text-xs text-muted-strong">
        <Sparkles
          className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-accent-strong"
          aria-hidden="true"
        />
        <span>
          Categories marked with an asterisk use AI-assisted severity
          inference. A technician reviews your report within the SLA window
          after submission.
        </span>
      </div>

      <ComplaintForm categories={categories} locations={locations} />

      <p className="mt-8 inline-flex items-center gap-1.5 text-xs text-muted-strong">
        <ShieldCheck
          className="h-3 w-3 text-accent-strong"
          aria-hidden="true"
        />
        DICT receives this report within seconds. Your drafts and prior
        complaints live at <span className="font-mono">/complaints/mine</span>.
      </p>
    </div>
  );
}
