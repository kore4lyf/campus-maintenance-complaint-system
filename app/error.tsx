"use client";

import { ErrorBoundary } from "@/components/ErrorBoundary";

export default function RootError({
  error,
  reset,
}: {
  error: Error & { digest?: string | undefined };
  reset: () => void;
}) {
  return <ErrorBoundary role="root" error={error} reset={reset} />;
}
