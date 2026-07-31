"use client";

import { ErrorBoundary } from "@/components/ErrorBoundary";

export default function TechnicianError({
  error,
  reset,
}: {
  error: Error & { digest?: string | undefined };
  reset: () => void;
}) {
  return <ErrorBoundary role="technician" error={error} reset={reset} />;
}
