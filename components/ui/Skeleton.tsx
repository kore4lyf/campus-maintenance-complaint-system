import type { HTMLAttributes } from "react";

/*
 * Skeleton — pulsing placeholder block with three shape primitives.
 *   line       multi-line text broken into unequal segments.
 *   rect       rectangle with configurable aspect ratio.
 *   circle     h-w-equal PerfectCircle, used for avatars.
 *
 * Used for loaders on ReporterDashboardEmpty, RecentActionsFeed, and the
 * assignee/technician dropdowns.
 */

interface SkeletonBaseProps extends HTMLAttributes<HTMLDivElement> {
  tone?: "soft" | "default" | undefined;
}

export function Skeleton({
  className = "",
  tone = "default",
  ...rest
}: SkeletonBaseProps) {
  const toneClass =
    tone === "soft" ? "bg-border/40" : "bg-surface-raised";
  return (
    <div
      aria-hidden="true"
      className={`animate-pulse rounded-md ${toneClass} ${className}`}
      {...rest}
    />
  );
}

export function SkeletonLine({
  width,
  className = "",
  tone = "default",
}: {
  width?: string | undefined;
  className?: string | undefined;
  tone?: "soft" | "default" | undefined;
}) {
  return <Skeleton className={`h-3 ${width ?? "w-full"} ${className}`} tone={tone} />;
}

export function SkeletonRect({
  aspect = "16/9",
  className = "",
  tone = "default",
}: {
  aspect?: string | undefined;
  className?: string | undefined;
  tone?: "soft" | "default" | undefined;
}) {
  return (
    <Skeleton
      className={`w-full ${className}`}
      style={{ aspectRatio: aspect }}
      tone={tone}
    />
  );
}

export function SkeletonCircle({
  size = "h-10 w-10",
  className = "",
}: {
  size?: string | undefined;
  className?: string | undefined;
}) {
  return <Skeleton className={`rounded-full ${size} ${className}`} />;
}

export function SkeletonLines({
  count = 3,
  className = "",
}: {
  count?: number | undefined;
  className?: string | undefined;
}) {
  const widths = ["w-11/12", "w-9/12", "w-10/12", "w-7/12", "w-8/12"];
  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonLine key={i} width={widths[i % widths.length]} />
      ))}
    </div>
  );
}
