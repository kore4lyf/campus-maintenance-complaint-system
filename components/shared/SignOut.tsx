"use client";

import { LogOut } from "lucide-react";

export function SignOut() {
  return (
    <button
      type="button"
      onClick={() => {
        // Placeholder: BetterAuth wires this in Feature 4
      }}
      className="rounded-md p-2 text-muted-strong transition-colors hover:bg-surface-raised hover:text-foreground"
      aria-label="Sign out"
    >
      <LogOut className="h-5 w-5" />
    </button>
  );
}
