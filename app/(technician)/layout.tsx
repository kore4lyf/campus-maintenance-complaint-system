import { TopNav } from "@/components/shared/TopNav";
import { MobileBottomNav } from "@/components/shared/MobileBottomNav";

export default function TechnicianLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <TopNav />
      <main
        id="main-content"
        className="mx-auto w-full max-w-7xl flex-1 px-4 pb-24 pt-8 sm:px-6 sm:pb-12 sm:pt-10 md:pb-12"
      >
        {children}
      </main>
      <MobileBottomNav />
    </>
  );
}
