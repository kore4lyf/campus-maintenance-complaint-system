"use client";

import { useRouter, useSearchParams } from "next/navigation";

const SEVERITY_OPTIONS = ["Critical", "High", "Medium", "Low"] as const;

const AGE_OPTIONS = [
  { value: "all", label: "All time" },
  { value: "today", label: "Today" },
  { value: "7d", label: "Last 7 days" },
  { value: "30d", label: "Last 30 days" },
] as const;

interface Location {
  _id: string;
  name: string;
}

interface FilterPanelProps {
  locations: Location[];
}

export function FilterPanel({ locations }: FilterPanelProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const currentSeverity = searchParams.get("severity") ?? "";
  const currentAge = searchParams.get("age") ?? "all";
  const currentLocationId = searchParams.get("locationId") ?? "";

  function updateParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value && value !== "all") {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    router.push(`/admin/queue?${params.toString()}`);
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-medium text-foreground mb-2">Severity</h3>
        <div className="flex flex-wrap gap-2">
          {SEVERITY_OPTIONS.map((severity) => (
            <button
              key={severity}
              onClick={() =>
                updateParam(
                  "severity",
                  currentSeverity === severity ? "" : severity,
                )
              }
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                currentSeverity === severity
                  ? "bg-brand-500 text-white"
                  : "bg-surface-raised text-muted-strong hover:bg-surface-raised/80"
              }`}
            >
              {severity}
            </button>
          ))}
        </div>
      </div>

      <div>
        <h3 className="text-sm font-medium text-foreground mb-2">Age</h3>
        <div className="flex flex-wrap gap-2">
          {AGE_OPTIONS.map((option) => (
            <button
              key={option.value}
              onClick={() => updateParam("age", option.value)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                currentAge === option.value
                  ? "bg-brand-500 text-white"
                  : "bg-surface-raised text-muted-strong hover:bg-surface-raised/80"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <h3 className="text-sm font-medium text-foreground mb-2">Location</h3>
        <select
          value={currentLocationId}
          onChange={(e) => updateParam("locationId", e.target.value)}
          className="w-full rounded-lg border border-border bg-surface-raised px-3 py-2 text-sm text-foreground"
        >
          <option value="">All locations</option>
          {locations.map((loc) => (
            <option key={loc._id} value={loc._id}>
              {loc.name}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
