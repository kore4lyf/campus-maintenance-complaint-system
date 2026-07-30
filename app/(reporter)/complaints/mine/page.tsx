import Link from "next/link";
import { redirect } from "next/navigation";
import { PlusCircle } from "lucide-react";
import { getServerSession } from "@/lib/auth/dal";
import { ComplaintList } from "@/components/reporter/ComplaintList";
import {
  PageShell,
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
