import { redirect } from "next/navigation";
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
    <div className="mx-auto max-w-2xl">
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">My complaints</h1>
        <p className="mt-1 text-sm text-muted-strong">
          Track the status of every complaint you have filed.
        </p>
      </header>
      <ComplaintList />
    </div>
  );
}
