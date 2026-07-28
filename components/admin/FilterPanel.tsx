"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { SlidersHorizontal, X } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Field, Select } from "@/components/ui/Field";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import type { BadgeProps } from "@/components/ui/Badge";

const SEVERITY_OPTIONS = [
  { value: "Critical", tone: "danger" as BadgeProps["tone"] },
  { value: "High", tone: "warning" as BadgeProps["tone"] },
  { value: "Medium", tone: "info" as BadgeProps["tone"] },
  { value: "Low", tone: "success" as BadgeProps["tone"] },
];

const AGE_OPTIONS = [
  { value: "all", label: "All time" },
  { value: "today", label: "Today" },
  { value: "7d", label: "Last 7 days" },
  { value: "30d", label: "Last 30 days" },
];

interface Location {
  _id: string;
  name: string;
}

interface FilterPanelProps {
  locations: Location[];
}

function FilterChip({
  label,
  active,
  tone,
  onClick,
}: {
  label: string;
  active: boolean;
  tone?: BadgeProps["tone"] | undefined;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className="focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-surface rounded-full"
    >
      {active ? (
        <span className="inline-flex items-center gap-1 rounded-full bg-brand px-3 py-1 text-xs font-semibold text-white shadow-sm ring-1 ring-inset ring-brand-strong">
          {label}
          <X className="h-3 w-3" aria-hidden="true" />
        </span>
      ) : (
        <Badge tone={tone ?? "neutral"}>
          {label}
        </Badge>
      )}
    </button>
  );
}

export function FilterPanel({ locations }: FilterPanelProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const currentSeverity = searchParams.get("severity") ?? "";
  const currentAge = searchParams.get("age") ?? "all";
  const currentLocationId = searchParams.get("locationId") ?? "";

  const activeCount =
    (currentSeverity ? 1 : 0) +
    (currentAge !== "all" ? 1 : 0) +
    (currentLocationId ? 1 : 0);

  function updateParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value && value !== "all") {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    router.push(`/admin/queue?${params.toString()}`);
  }

  function clearAll() {
    router.push("/admin/queue");
  }

  return (
    <Card padding="md" className="sticky top-24">
      <header className="mb-5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand/10 text-brand">
            <SlidersHorizontal className="h-4 w-4" aria-hidden="true" />
          </span>
          <div>
            <h2 className="text-sm font-semibold text-foreground-strong">
              Filters
            </h2>
            <p className="numeric text-xs text-muted-strong">
              {activeCount === 0
                ? "No filters applied"
                : `${activeCount} active`}
            </p>
          </div>
        </div>
        {activeCount > 0 ? (
          <Button variant="ghost" size="sm" onClick={clearAll} trailingIcon={<X className="h-3 w-3" />}>
            Clear
          </Button>
        ) : null}
      </header>

      <div className="space-y-5">
        <div>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-strong">
            Severity
          </h3>
          <div className="flex flex-wrap gap-1.5">
            {SEVERITY_OPTIONS.map((option) => (
              <FilterChip
                key={option.value}
                tone={option.tone}
                label={option.value}
                active={currentSeverity === option.value}
                onClick={() =>
                  updateParam(
                    "severity",
                    currentSeverity === option.value ? "" : option.value,
                  )
                }
              />
            ))}
          </div>
        </div>

        <div>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-strong">
            Age
          </h3>
          <div className="flex flex-wrap gap-1.5">
            {AGE_OPTIONS.map((option) => (
              <FilterChip
                key={option.value}
                label={option.label}
                active={currentAge === option.value}
                onClick={() => updateParam("age", option.value)}
              />
            ))}
          </div>
        </div>

        <Field label="Location">
          <Select
            value={currentLocationId}
            onChange={(e) => updateParam("locationId", e.target.value)}
          >
            <option value="">All locations</option>
            {locations.map((loc) => (
              <option key={loc._id} value={loc._id}>
                {loc.name}
              </option>
            ))}
          </Select>
        </Field>
      </div>
    </Card>
  );
}
