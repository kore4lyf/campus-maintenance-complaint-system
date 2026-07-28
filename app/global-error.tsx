"use client";

import { ErrorBoundary } from "@/components/ErrorBoundary";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string | undefined };
  reset: () => void;
}) {
  // global-error.tsx replaces <html> + <body>. Mount the ErrorBoundary inside
  // a fresh document root so any layout-shaping errors don't take the page
  // completely down.
  return (
    <html lang="en">
      <body className="min-h-screen bg-surface font-sans">
        <ErrorBoundary role="root" error={error} reset={reset} />
      </body>
    </html>
  );
}
