"use client";

import { ErrorBoundary } from "@/components/ErrorBoundary";

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string | undefined };
  reset: () => void;
}) {
  return <ErrorBoundary role="admin" error={error} reset={reset} />;
}
