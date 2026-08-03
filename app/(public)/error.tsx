"use client";

import { ErrorBoundary } from "@/components/ErrorBoundary";

export default function PublicError({
  error,
  reset,
}: {
  error: Error & { digest?: string | undefined };
  reset: () => void;
}) {
  return <ErrorBoundary role="public" error={error} reset={reset} />;
}
