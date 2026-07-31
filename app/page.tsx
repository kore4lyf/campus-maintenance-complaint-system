import { redirect } from "next/navigation";
import { TopNav } from "@/components/shared/TopNav";
import { Hero } from "@/components/landing/hero";
import { StatsBand } from "@/components/landing/stats-band";
import { MaintenanceLoopSection } from "@/components/landing/maintenance-loop";
import { DualAudienceSection } from "@/components/landing/dual-audience";
import { CtaBand } from "@/components/landing/cta-band";
import { getServerSession } from "@/lib/auth/dal";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function LandingPage() {
  const session = await getServerSession();
  if (session) {
    const role = session.user.role;
    if (role === "dicht_admin") redirect("/admin/queue");
    if (role === "dicht_technician") redirect("/technician/assignments");
    redirect("/complaints/mine");
  }

  return (
    <div className="min-h-dvh bg-surface text-foreground">
      <TopNav />
      <Hero />
      <StatsBand />
      <MaintenanceLoopSection />
      <DualAudienceSection />
      <CtaBand />
    </div>
  );
}
