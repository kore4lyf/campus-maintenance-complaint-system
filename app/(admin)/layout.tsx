import { TopNav } from "@/components/shared/TopNav";
import { MobileBottomNav } from "@/components/shared/MobileBottomNav";

export const dynamic = "force-dynamic";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <TopNav />
      <main
        id="main-content"
        className="flex-1 pt-8 sm:pt-10"
      >
        {children}
      </main>
      <MobileBottomNav />
    </>
  );
}
