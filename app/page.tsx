import { TopNav } from "@/components/shared/TopNav";
import { Hero } from "@/components/landing/hero";
import { StatsBand } from "@/components/landing/stats-band";
import { MaintenanceLoopSection } from "@/components/landing/maintenance-loop";
import { DualAudienceSection } from "@/components/landing/dual-audience";
import { CtaBand } from "@/components/landing/cta-band";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function LandingPage() {
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
