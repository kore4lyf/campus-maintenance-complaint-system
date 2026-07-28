"use client";

import { toUserMessage } from "@/lib/utils/errors";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string | undefined };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center p-8 text-center">
      <div className="w-full max-w-md rounded-xl border border-border bg-surface-raised p-8 shadow-lg">
        <h1 className="text-xl font-bold text-danger">Something went wrong</h1>
        <p className="mt-3 text-sm text-muted-strong">
          {toUserMessage(error)}
        </p>
        <button
          type="button"
          onClick={reset}
          className="mt-6 rounded-md bg-brand px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-strong"
        >
          Try again
        </button>
      </div>
    </div>
  );
}
