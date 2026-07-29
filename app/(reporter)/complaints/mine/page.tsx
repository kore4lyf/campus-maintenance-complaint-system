import Link from "next/link";
import { redirect } from "next/navigation";
import { PlusCircle } from "lucide-react";
import { getServerSession } from "@/lib/auth/dal";
import { ComplaintList } from "@/components/reporter/ComplaintList";
import {
  PageShell,
  HeroBand,
  HeroBody,
  PageShellCtaBand,
} from "@/components/shared/PageShell";

/*
 * MyComplaintsPage — reporter home (Server Component).
 *
 * Aesthetic pass (2026-07-29):
 *   - Adds a numbered caption strip in the hero actions slot so the
 *     page composes with Home / Detail / Queue cadence.
 *   - Tightens the kicker + CTA cluster to use the same chip pattern
 *     as the rest of the in-app surfaces.
 *
 * Tokens used: bg-brand on the primary CTA, text-accent-strong on
 * the dot accent in the chip.
 */

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function MyComplaintsPage(): Promise<React.ReactElement> {
  const session = await getServerSession();
  if (!session) {
    redirect("/sign-in");
  }

  return (
    <PageShell>
      <HeroBand
        kicker="Your queue"
        title="My complaints"
        subtitle="Track the status of every complaint you have filed. New ones join the queue below in real time."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1.5 text-xs font-medium text-muted-strong">
              <span className="h-1.5 w-1.5 rounded-full bg-accent" aria-hidden="true" />
              Live
            </span>
            <Link
              href="/complaints/new"
              className="inline-flex items-center gap-2 rounded-md bg-brand px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-[background-color,transform,box-shadow] duration-fast hover:-translate-y-0.5 hover:bg-brand-strong hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
            >
              <PlusCircle className="h-4 w-4" />
              New complaint
            </Link>
          </div>
        }
      />

      <HeroBody>
        <ComplaintList />
      </HeroBody>

      <PageShellCtaBand
        title="Spot a new issue on campus?"
        body="Report a fault in under a minute — pick a category, attach a photo if you can, and the rest is handled."
        action={
          <Link
            href="/complaints/new"
            className="inline-flex items-center gap-2 rounded-md bg-accent px-6 py-3 text-base font-semibold text-brand-strong shadow-sm transition-[background-color,color,transform] duration-fast hover:-translate-y-0.5 hover:bg-accent-strong hover:text-brand hover:shadow-md"
          >
            <PlusCircle className="h-4 w-4" />
            Report a fault
          </Link>
        }
      />
    </PageShell>
  );
}
