"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { signOutAction } from "@/lib/auth/actions";

export function SignOut() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleSignOut() {
    startTransition(async () => {
      try {
        await signOutAction();
      } catch {
        toast.error("Failed to sign out cleanly. Try again.");
        return;
      }
      toast.success("Signed out. See you again.");
      // signOutAction redirects to "/" anyway; this just gives the toast
      // a moment to mount before the route swap.
      setTimeout(() => {
        router.push("/");
        router.refresh();
      }, 200);
    });
  }

  return (
    <button
      type="button"
      onClick={handleSignOut}
      disabled={isPending}
      aria-label="Sign out"
      className="signout-btn inline-flex h-9 items-center gap-1.5 rounded-md px-2.5 text-sm font-medium text-muted-strong transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
    >
      <span className="hidden lg:inline">Sign out</span>
    </button>
  );
}
