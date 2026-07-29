"use client";

import Link from "next/link";
import Image from "next/image";
import { useCurrentUser, useCurrentRole } from "@/lib/auth/role-context";
import { SignOut } from "./SignOut";

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

export function TopNav() {
  const user = useCurrentUser();
  const role = useCurrentRole();

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-surface/85 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
        <Link
          href="/"
          className="group inline-flex min-h-[44px] items-center gap-3 rounded-md px-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
          aria-label="LASU CMS"
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand shadow-sm transition-shadow group-hover:shadow-md">
            <Image
              src="/cms-lasu-icon.png"
              alt=""
              width={28}
              height={28}
              className="h-7 w-7"
              priority
            />
          </span>
          <span className="flex items-baseline gap-1.5">
            <span className="text-base font-semibold tracking-tight text-brand">
              LASU
            </span>
            <span className="text-base font-medium text-foreground-strong">
              CMS
            </span>
          </span>
        </Link>

        <nav aria-label="Primary" className="hidden items-center gap-1 md:flex">
          {role === "reporter" && (
            <>
              <NavLink href="/complaints/new">Submit</NavLink>
              <NavLink href="/complaints/mine">My complaints</NavLink>
            </>
          )}
          {role === "dicht_admin" && (
            <>
              <NavLink href="/admin/queue">Queue</NavLink>
              <NavLink href="/admin/reports">Reports</NavLink>
            </>
          )}
          {role === "dicht_technician" && (
            <NavLink href="/technician/queue">Queue</NavLink>
          )}
        </nav>

        <div className="flex items-center gap-2">
          {user ? (
            <div className="inline-flex min-h-[44px] items-center gap-2.5 rounded-full border border-border bg-surface-raised/60 py-1 pl-1 pr-2.5">
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
          ) : null}
          {user ? (
            <div className="inline-flex min-h-[44px] items-center">
              <SignOut />
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );
}

function NavLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="inline-flex min-h-[44px] items-center rounded-md px-3 text-sm font-medium text-muted-strong transition-colors hover:bg-surface-raised hover:text-foreground-strong focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
    >
      {children}
    </Link>
  );
}
