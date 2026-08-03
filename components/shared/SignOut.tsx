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
      } catch (err) {
        // signOutAction calls redirect("/") which throws a NEXT_REDIRECT
        // error. That's expected — not a failure.
        const isRedirect =
          err instanceof Error &&
          typeof (err as Error & { digest?: string }).digest === "string" &&
          (err as Error & { digest: string }).digest.startsWith("NEXT_REDIRECT");
        if (!isRedirect) {
          toast.error("Sign out failed");
          return;
        }
      }
      toast.success("Signed out");
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
