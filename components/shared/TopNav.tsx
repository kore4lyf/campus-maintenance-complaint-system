"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { useCurrentUser, useCurrentRole, useSessionStatus } from "@/lib/auth/role-context";
import { SignOut } from "./SignOut";
import { NotificationBell } from "@/components/notifications/NotificationBell";

/*
 * TopNav — sticky brand + role-aware menu + user identity.
 *
 * Spec 0014 §D: every interactive element in TopNav must hit the Apple
 * HIG 44 pt tap-target floor via `min-h-[44px]`. The brand block was
 * 36 px before; now 44 via min-height. Nav links were ~32 px (paddings
 * only); now wrapped in a `min-h-[44px] inline-flex items-center`.
 * The user pill that follows SignOut was a stat-card style chip; now
 * it sits in a 44 px touch target too.
 */

interface TopNavProps {
  showNav?: boolean;
  showSignIn?: boolean;
}

export function TopNav({ showNav = true, showSignIn = true }: TopNavProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const user = useCurrentUser();
  const role = useCurrentRole();
  const sessionStatus = useSessionStatus();
  const pathname = usePathname();

  const navItems = (() => {
    if (!showNav) return [];
    if (role === "reporter") {
      return [
        { href: "/complaints/new", label: "Submit" },
        { href: "/complaints/mine", label: "My complaints" },
      ];
    }
    if (role === "dicht_admin") {
      return [
        { href: "/admin/queue", label: "Queue" },
        { href: "/admin/reports", label: "Reports" },
        { href: "/admin/users", label: "Users" },
      ];
    }
    if (role === "dicht_technician") {
      return [{ href: "/technician/queue", label: "Queue" }];
    }
    return [];
  })();

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-surface/85 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
        <Link
          href="/"
          className="group inline-flex min-h-[44px] items-center gap-3 rounded-md px-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
          aria-label="LASU CMS"
        >
          <Image
            src="/cms-lasu-full.png"
            alt="LASU CMS"
            width={2081}
            height={942}
            className="h-10 w-auto"
            priority
          />
        </Link>

        {navItems.length > 0 && (
          <nav aria-label="Primary" className="hidden items-center gap-1 md:flex">
            {navItems.map((item) => {
              const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <NavLink key={item.href} href={item.href} active={active}>
                  {item.label}
                </NavLink>
              );
            })}
          </nav>
        )}

        <div className="flex items-center gap-2">
          {sessionStatus === "loading" ? (
            <div className="h-8 w-20 animate-pulse rounded-md bg-surface-raised" />
          ) : user ? (
            <>
              <NotificationBell />
              <div className="inline-flex min-h-[44px] items-center gap-2 rounded-full border border-border bg-surface-raised/60 py-1 px-2">
                <span
                  className="flex h-7 w-7 items-center justify-center rounded-full bg-brand text-xs font-semibold text-white"
                  aria-hidden="true"
                >
                  {user.name?.[0]?.toUpperCase() ?? user.email?.[0]?.toUpperCase() ?? "U"}
                </span>
                <span
                  className="hidden max-w-[10rem] truncate text-sm font-medium text-foreground-strong sm:inline"
                  title={user.name || user.email}
                >
                  {user.name || user.email}
                </span>
              </div>
              <div className="inline-flex min-h-[44px] items-center">
                <SignOut />
              </div>
            </>
          ) : showSignIn ? (
            <Link
              href="/sign-in"
              className="inline-flex min-h-[44px] items-center rounded-md px-4 text-sm font-medium text-brand transition-colors hover:bg-surface-raised focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
            >
              Sign in
            </Link>
          ) : null}
          {navItems.length > 0 && (
            <button
              type="button"
              onClick={() => setMobileOpen((prev) => !prev)}
              className="inline-flex min-h-[44px] items-center justify-center rounded-md p-2 text-muted-strong transition-colors hover:bg-surface-raised hover:text-foreground-strong md:hidden"
              aria-label={mobileOpen ? "Close menu" : "Open menu"}
              aria-expanded={mobileOpen}
            >
              {mobileOpen ? (
                <X className="h-5 w-5" aria-hidden="true" />
              ) : (
                <Menu className="h-5 w-5" aria-hidden="true" />
              )}
            </button>
          )}
        </div>
      </div>

      {mobileOpen && navItems.length > 0 && (
        <nav
          aria-label="Mobile navigation"
          className="border-t border-border bg-surface px-4 py-3 md:hidden"
        >
          <ul className="flex flex-col gap-1">
            {navItems.map((item) => {
              const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={() => setMobileOpen(false)}
                    className={`flex min-h-[44px] items-center rounded-lg px-3 text-sm font-medium transition-colors ${
                      active
                        ? "bg-brand/10 text-brand"
                        : "text-muted-strong hover:bg-surface-raised hover:text-foreground-strong"
                    }`}
                  >
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      )}
    </header>
  );
}

function NavLink({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={`inline-flex min-h-[44px] items-center rounded-md px-3 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 ${
        active
          ? "bg-brand/10 text-brand"
          : "text-muted-strong hover:bg-surface-raised hover:text-foreground-strong"
      }`}
    >
      {children}
    </Link>
  );
}
