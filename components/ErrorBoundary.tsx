"use client";

import { AlertCircle, RefreshCw, Mail } from "lucide-react";
import { Button } from "@/components/ui/Button";

/*
 * Shared error surface used by app/error.tsx (root + the three role-group
 * error.tsx files). The five files were each repeating the same raw recipe;
 * this lets them share intent without losing role-specific copy.
 */

interface ErrorBoundaryProps {
  role: "root" | "reporter" | "admin" | "technician";
  error: Error & { digest?: string | undefined };
  reset: () => void;
}

const ROLE_INTRO: Record<ErrorBoundaryProps["role"], string> = {
  root: "We hit an unexpected error rendering this page.",
  reporter:
    "We hit an error loading your reporter view. Your in-flight complaint drafts are unaffected.",
  admin:
    "We hit an error loading the DICT console. Queue and assignment data are unchanged.",
  technician:
    "We hit an error loading the technician console. Active assignments are unchanged.",
};

export function ErrorBoundary({
  role,
  error,
  reset,
}: ErrorBoundaryProps) {
  return (
    <div className="flex min-h-[60vh] items-center justify-center px-6 py-16">
      <div className="w-full max-w-xl text-center">
        <div
          role="alert"
          aria-live="polite"
          className="inline-flex flex-col items-center gap-5"
        >
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-danger/10 text-danger shadow-sm">
            <AlertCircle className="h-7 w-7" aria-hidden="true" />
          </div>
          <p className="text-xs font-semibold uppercase tracking-wider text-accent-strong">
            Error
          </p>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground-strong">
            Something went wrong
          </h1>
          <p className="max-w-md text-sm text-muted-strong">
            {ROLE_INTRO[role]}
            {process.env.NODE_ENV !== "production" && error.digest ? (
              <>
                {" "}
                <span className="numeric text-xs text-muted">
                  digest: {error.digest}
                </span>
              </>
            ) : null}
          </p>
          {error.message ? (
            <pre className="numeric max-w-md truncate rounded-md border border-border bg-surface-raised px-3 py-2 text-xs text-muted-strong">
              {error.message}
            </pre>
          ) : null}

          <div className="mt-2 flex flex-wrap items-center justify-center gap-2">
            <Button
              variant="primary"
              size="md"
              leadingIcon={<RefreshCw className="h-4 w-4" />}
              onClick={() => reset()}
            >
              Try again
            </Button>
            <Button
              variant="secondary"
              size="md"
              leadingIcon={<Mail className="h-4 w-4" />}
              onClick={() => {
                window.location.href = "mailto:mailsupport@lasu.edu.ng";
              }}
            >
              Contact DICT
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
