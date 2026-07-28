import Link from "next/link";
import { redirect } from "next/navigation";
import { PlusCircle } from "lucide-react";
import { getServerSession } from "@/lib/auth/dal";
import { ComplaintList } from "@/components/reporter/ComplaintList";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function MyComplaintsPage(): Promise<React.ReactElement> {
  const session = await getServerSession();
  if (!session) {
    redirect("/sign-in");
  }

  return (
    <div className="mx-auto max-w-3xl">
      <header className="mb-10">
        <p className="text-xs font-semibold uppercase tracking-wider text-accent-strong">
          Your queue
        </p>
        <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-foreground-strong sm:text-4xl">
              My complaints
            </h1>
            <p className="mt-2 max-w-2xl text-base text-muted-strong">
              Track the status of every complaint you have filed. New ones
              join the queue below in real time.
            </p>
          </div>
          <Link
            href="/complaints/new"
            className="inline-flex items-center gap-2 rounded-md bg-brand px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
          >
            <PlusCircle className="h-4 w-4" />
            New complaint
          </Link>
        </div>
      </header>
      <ComplaintList />
    </div>
  );
}
