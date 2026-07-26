"use client";

import Link from "next/link";
import { useCurrentRole } from "@/lib/auth/role-context";
import { ThemeToggle } from "./ThemeToggle";
import { SignOut } from "./SignOut";

export function TopNav() {
  const role = useCurrentRole();

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-surface/80 backdrop-blur-sm">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-1.5">
          <span className="text-lg font-bold text-brand">LASU</span>
          <span className="text-lg font-medium text-foreground">CMS</span>
        </Link>

        <nav aria-label="Primary" className="hidden items-center gap-1 md:flex">
          {role === "reporter" && (
            <>
              <Link
                href="/complaints/new"
                className="rounded-md px-3 py-1.5 text-sm font-medium text-muted-strong transition-colors hover:bg-surface-raised hover:text-foreground"
              >
                Submit
              </Link>
              <Link
                href="/complaints"
                className="rounded-md px-3 py-1.5 text-sm font-medium text-muted-strong transition-colors hover:bg-surface-raised hover:text-foreground"
              >
                My Complaints
              </Link>
            </>
          )}
          {role === "dicht_admin" && (
            <>
              <Link
                href="/admin/queue"
                className="rounded-md px-3 py-1.5 text-sm font-medium text-muted-strong transition-colors hover:bg-surface-raised hover:text-foreground"
              >
                Queue
              </Link>
              <Link
                href="/admin/reports"
                className="rounded-md px-3 py-1.5 text-sm font-medium text-muted-strong transition-colors hover:bg-surface-raised hover:text-foreground"
              >
                Reports
              </Link>
            </>
          )}
          {role === "dicht_technician" && (
            <Link
              href="/technician/queue"
              className="rounded-md px-3 py-1.5 text-sm font-medium text-muted-strong transition-colors hover:bg-surface-raised hover:text-foreground"
            >
              Queue
            </Link>
          )}
        </nav>

        <div className="flex items-center gap-1">
          <ThemeToggle />
          <SignOut />
        </div>
      </div>
    </header>
  );
}
