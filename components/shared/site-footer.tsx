import Link from "next/link";

export function SiteFooter() {
  const cols = [
    {
      title: "Product",
      links: [
        { href: "/sign-up", label: "Reporter account" },
        { href: "/sign-in", label: "Sign in" },
        { href: "/complaints/new", label: "File anonymously" },
      ],
    },
    {
      title: "For DICT",
      links: [
        { href: "/sign-in", label: "DICT staff sign in" },
        { href: "/sign-in", label: "Technician sign in" },
        { href: "/sign-in", label: "Audit log" },
      ],
    },
    {
      title: "Resources",
      links: [
        { href: "/", label: "Documentation" },
        { href: "/", label: "SLA policy" },
        { href: "/", label: "Built on Next.js" },
      ],
    },
    {
      title: "Contact",
      links: [
        { href: "/", label: "DICT support" },
        { href: "/", label: "Report a bug" },
        { href: "/", label: "LASU DICT" },
      ],
    },
  ];

  return (
    <footer className="border-t border-border bg-surface">
      <div className="mx-auto max-w-7xl px-4 pt-16 pb-10 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 gap-10 sm:grid-cols-4 lg:gap-12">
          {cols.map((col) => (
            <div key={col.title} className="flex flex-col gap-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-strong">
                {col.title}
              </p>
              <ul role="list" className="flex flex-col gap-2.5">
                {col.links.map((link, idx) => (
                  <li key={`${col.title}-${idx}`}>
                    <Link
                      href={link.href}
                      className="text-sm leading-[1.4] text-muted-strong transition-colors duration-fast hover:text-foreground-strong"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 flex flex-col gap-3 border-t border-border pt-6 text-xs text-muted sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {new Date().getFullYear()} Lagos State University · DICT —
            Campus Maintenance Complaint Management System
          </p>
          <p>
            Built on Next.js · MongoDB · Vercel AI · Ably · Astryx design system
          </p>
        </div>
      </div>
    </footer>
  );
}
