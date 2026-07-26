"use client";

import { useCurrentRole } from "@/lib/auth/role-context";
import { PlusCircle, List, UserCircle, LayoutDashboard, AlertTriangle, Wrench } from "lucide-react";

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

const navByRole: Record<string, NavItem[]> = {
  reporter: [
    { href: "/complaints/new", label: "Submit", icon: PlusCircle },
    { href: "/complaints", label: "List", icon: List },
    { href: "/complaints/mine", label: "Mine", icon: UserCircle },
  ],
  dicht_admin: [
    { href: "/admin/queue", label: "Queue", icon: LayoutDashboard },
    { href: "/admin/reports", label: "Reports", icon: AlertTriangle },
  ],
  dicht_technician: [
    { href: "/technician/queue", label: "Queue", icon: Wrench },
  ],
};

export function MobileBottomNav() {
  const role = useCurrentRole();
  const items = role ? navByRole[role] ?? [] : [];

  if (items.length === 0) return null;

  return (
    <nav
      aria-label="Mobile navigation"
      className="fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-surface md:hidden"
    >
      <ul className="flex items-center justify-around py-2">
        {items.map((item) => (
          <li key={item.href}>
            <a
              href={item.href}
              className="flex flex-col items-center gap-0.5 px-3 py-1 text-xs font-medium text-muted-strong transition-colors hover:text-brand"
            >
              <item.icon className="h-5 w-5" />
              {item.label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
