import { LogOut } from "lucide-react";
import { signOutAction } from "@/lib/auth/actions";

export function SignOut() {
  return (
    <form action={signOutAction}>
      <button
        type="submit"
        className="inline-flex h-9 items-center gap-1.5 rounded-md px-2.5 text-sm font-medium text-muted-strong transition-colors hover:bg-surface-raised hover:text-foreground-strong focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
        aria-label="Sign out"
      >
        <LogOut className="h-4 w-4" aria-hidden="true" />
        <span className="hidden lg:inline">Sign out</span>
      </button>
    </form>
  );
}
