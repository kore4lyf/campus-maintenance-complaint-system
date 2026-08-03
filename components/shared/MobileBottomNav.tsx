"use client";

import { usePathname } from "next/navigation";
import { useCurrentRole } from "@/lib/auth/role-context";
import {
  PlusCircle,
  ListChecks,
  UserCircle,
  LayoutDashboard,
  BarChart3,
  Wrench,
} from "lucide-react";

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  exact?: boolean;
}

const navByRole: Record<string, NavItem[]> = {
  reporter: [
    { href: "/complaints/new", label: "Submit", icon: PlusCircle, exact: true },
    { href: "/complaints", label: "List", icon: ListChecks },
    { href: "/complaints/mine", label: "Mine", icon: UserCircle },
  ],
  dicht_admin: [
    { href: "/admin/queue", label: "Queue", icon: LayoutDashboard },
    { href: "/admin/reports", label: "Reports", icon: BarChart3 },
    { href: "/admin/users", label: "Users", icon: UserCircle },
  ],
  dicht_technician: [
    { href: "/technician/assignments", label: "Assignments", icon: Wrench },
  ],
};

function isActive(pathname: string, item: NavItem): boolean {
  if (item.exact) return pathname === item.href;
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}

export function MobileBottomNav() {
  const role = useCurrentRole();
  const pathname = usePathname() ?? "";
  const items = role ? navByRole[role] ?? [] : [];

  if (items.length === 0) return null;

  return (
    <nav
      aria-label="Mobile navigation"
      className="fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-surface/95 px-2 pb-[env(safe-area-inset-bottom,0)] backdrop-blur-md md:hidden"
    >
      <ul className="flex items-stretch justify-around">
        {items.map((item) => {
          const active = isActive(pathname, item);
          const Icon = item.icon;
          return (
            <li key={item.href} className="flex-1">
              <a
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`group flex flex-col items-center gap-1 px-2 py-2.5 text-xs font-medium transition-colors ${
                  active
                    ? "text-brand"
                    : "text-muted-strong hover:text-foreground-strong"
                }`}
              >
                <span
                  className={`flex h-9 w-9 items-center justify-center rounded-xl transition-[background-color,color] ${
                    active ? "bg-brand/10 text-brand" : "group-hover:bg-surface-raised"
                  }`}
                >
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </span>
                <span className="numeric text-[11px] font-medium leading-none">
                  {item.label}
                </span>
                {active ? (
                  <span className="-mb-1 h-0.5 w-6 rounded-full bg-brand" aria-hidden="true" />
                ) : null}
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
