import Link from "next/link";

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-surface">
      <header className="border-b border-border bg-surface">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6">
          <Link href="/" className="flex items-center gap-1.5">
            <span className="text-lg font-bold text-brand">LASU</span>
            <span className="text-lg font-medium text-foreground">CMS</span>
          </Link>
          <Link
            href="/"
            className="text-sm font-medium text-muted-strong transition-colors hover:text-foreground"
          >
            Home
          </Link>
        </div>
      </header>
      <main
        id="main-content"
        className="flex flex-1 items-center justify-center px-4 py-10 sm:px-6"
      >
        <div className="w-full max-w-md">{children}</div>
      </main>
      <footer className="border-t border-border bg-surface px-4 py-6 text-center text-xs text-muted-strong sm:px-6">
        <p>
          Campus Maintenance Complaint Management System &#x2022; Lagos State
          University &#x2022; DICT
        </p>
      </footer>
    </div>
  );
}
