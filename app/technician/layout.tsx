import { TopNav } from "@/components/shared/TopNav";
import { MobileBottomNav } from "@/components/shared/MobileBottomNav";
import { requireRole } from "@/lib/auth/dal";

export default async function TechnicianLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireRole("dicht_technician");

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
