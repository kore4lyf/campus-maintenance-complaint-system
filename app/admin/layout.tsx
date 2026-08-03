import { TopNav } from "@/components/shared/TopNav";
import { MobileBottomNav } from "@/components/shared/MobileBottomNav";
import { requireRole } from "@/lib/auth/dal";

export const dynamic = "force-dynamic";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireRole("dicht_admin");

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
