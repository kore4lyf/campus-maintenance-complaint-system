import { LogOut } from "lucide-react";
import { signOutAction } from "@/lib/auth/actions";

export function SignOut() {
  return (
    <form action={signOutAction}>
      <button
        type="submit"
        className="rounded-md p-2 text-muted-strong transition-colors hover:bg-surface-raised hover:text-foreground"
        aria-label="Sign out"
      >
        <LogOut className="h-5 w-5" />
      </button>
    </form>
  );
}
