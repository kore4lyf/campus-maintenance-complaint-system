import { TopNav } from "@/components/shared/TopNav";
import { MobileBottomNav } from "@/components/shared/MobileBottomNav";
import { requireRole } from "@/lib/auth/dal";

export default async function ReporterLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireRole("reporter", "dicht_admin", "dicht_technician");

  return (
    <>
      <TopNav />
      <main
        id="main-content"
        className="flex-1" 
      >
        {children}
      </main>
      <MobileBottomNav />
    </>
  );
}
