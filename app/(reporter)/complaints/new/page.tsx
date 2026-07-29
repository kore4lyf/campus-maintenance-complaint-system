import { PlusCircle, Sparkles } from "lucide-react";
import { connect } from "@/lib/db/connection";
import { CategoryModel } from "@/lib/db/models/category";
import { LocationModel } from "@/lib/db/models/location";
import { requireSession } from "@/lib/auth/dal";
import { ComplaintForm } from "./ComplaintForm";
import { PageShell, HeroBand, HeroBody } from "@/components/shared/PageShell";
import { Card } from "@/components/ui/Card";
import { Kicker, Supporting } from "@/components/ui/type";

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
            <span className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1.5 text-xs font-medium text-muted-strong">
              <PlusCircle
                className="h-3 w-3 text-accent-strong"
                aria-hidden="true"
              />
              <span className="numeric">
                {categories.length} × {locations.length}
              </span>
              <span>categories &amp; locations</span>
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-success/10 px-3 py-1.5 text-xs font-medium text-success-strong ring-1 ring-inset ring-success/20">
              <span className="h-1.5 w-1.5 rounded-full bg-success" aria-hidden="true" />
              Under 1 minute
            </span>
          </div>
        }
      />

      <HeroBody>
        <div className="mx-auto max-w-3xl space-y-6">
          <Card
            padding="md"
            variant="raised"
            className="border-accent/30 bg-accent-soft/30"
          >
            <div className="flex items-start gap-3">
              <span
                className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-accent text-brand-strong"
                aria-hidden="true"
              >
                <Sparkles className="h-5 w-5" />
              </span>
              <div>
                <Kicker>How triage works</Kicker>
                <p className="mt-1 text-sm font-semibold tracking-[-0.005em] text-foreground-strong">
                  AI-assisted, with rules as fallback.
                </p>
                <Supporting className="mt-1 text-sm leading-[1.55] text-muted-strong">
                  A technician reviews your report within the SLA window
                  after submission. If DICT&apos;s AI is offline, the rules
                  engine uses your category&apos;s default severity — submission
                  is never blocked.
                </Supporting>
              </div>
            </div>
          </Card>

          <ComplaintForm categories={categories} locations={locations} />
        </div>
      </HeroBody>
    </PageShell>
  );
}
