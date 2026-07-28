"use client";

import { ErrorBoundary } from "@/components/ErrorBoundary";

export default function ReporterError({
  error,
  reset,
}: {
  error: Error & { digest?: string | undefined };
  reset: () => void;
}) {
  return <ErrorBoundary role="reporter" error={error} reset={reset} />;
}
