"use client";

import { useRouter, useSearchParams } from "next/navigation";

const TIME_OPTIONS = [
  { value: "", label: "All time" },
  { value: "today", label: "Today" },
  { value: "7d", label: "Last 7 days" },
  { value: "30d", label: "Last 30 days" },
  { value: "90d", label: "Last 90 days" },
] as const;

const SEVERITY_OPTIONS = ["Critical", "High", "Medium", "Low"] as const;

const STATUS_OPTIONS = ["Submitted", "Acknowledged", "In Progress", "Resolved", "Closed"] as const;

interface Location {
  _id: string;
  name: string;
}

interface ReportsFilterPanelProps {
  locations: Location[];
}

export function ReportsFilterPanel({ locations }: ReportsFilterPanelProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const currentTime = searchParams.get("time") ?? "";
  const currentSeverity = searchParams.getAll("severity");
  const currentLocationId = searchParams.getAll("locationId");
  const currentStatus = searchParams.getAll("status");

  function toggleArrayParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    const current = params.getAll(key);
    if (current.includes(value)) {
      const next = current.filter((v) => v !== value);
      params.delete(key);
      next.forEach((v) => params.append(key, v));
    } else {
      params.append(key, value);
    }
    router.push(`/admin/reports?${params.toString()}`);
  }

  function setParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    router.push(`/admin/reports?${params.toString()}`);
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-medium text-foreground mb-2">Time Window</h3>
        <div className="flex flex-wrap gap-2">
          {TIME_OPTIONS.map((option) => (
            <button
              key={option.value}
              onClick={() => setParam("time", option.value)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                currentTime === option.value
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
        <h3 className="text-sm font-medium text-foreground mb-2">Severity</h3>
        <div className="flex flex-wrap gap-2">
          {SEVERITY_OPTIONS.map((severity) => (
            <button
              key={severity}
              onClick={() => toggleArrayParam("severity", severity)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                currentSeverity.includes(severity)
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
        <h3 className="text-sm font-medium text-foreground mb-2">Location</h3>
        <div className="flex flex-wrap gap-2">
          {locations.map((loc) => (
            <button
              key={loc._id}
              onClick={() => toggleArrayParam("locationId", loc._id)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                currentLocationId.includes(loc._id)
                  ? "bg-brand-500 text-white"
                  : "bg-surface-raised text-muted-strong hover:bg-surface-raised/80"
              }`}
            >
              {loc.name}
            </button>
          ))}
        </div>
      </div>

      <div>
        <h3 className="text-sm font-medium text-foreground mb-2">Status</h3>
        <div className="flex flex-wrap gap-2">
          {STATUS_OPTIONS.map((status) => (
            <button
              key={status}
              onClick={() => toggleArrayParam("status", status)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                currentStatus.includes(status)
                  ? "bg-brand-500 text-white"
                  : "bg-surface-raised text-muted-strong hover:bg-surface-raised/80"
              }`}
            >
              {status}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
