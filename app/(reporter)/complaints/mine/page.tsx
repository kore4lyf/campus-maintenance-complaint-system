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
          <Link
            href="/complaints/new"
            className="inline-flex items-center gap-2 rounded-md bg-brand px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
          >
            <PlusCircle className="h-4 w-4" />
            New complaint
          </Link>
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
            className="inline-flex items-center gap-2 rounded-md bg-accent px-6 py-3 text-base font-semibold text-brand-strong shadow-sm transition hover:bg-accent-strong hover:text-brand"
          >
            <PlusCircle className="h-4 w-4" />
            Report a fault
          </Link>
        }
      />
    </PageShell>
  );
}
