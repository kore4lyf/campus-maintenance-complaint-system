"use client";

import { Archive, EyeOff, Filter } from "lucide-react";
import { Checkbox, Select } from "@/components/ui/Field";

export interface ComplaintFiltersState {
  includeClosed: boolean;
  anonymousOnly: boolean;
  status: string;
}

interface ComplaintFiltersProps {
  filters: ComplaintFiltersState;
  onFilterChange: (filters: ComplaintFiltersState) => void;
}

const STATUS_OPTIONS = [
  { value: "", label: "All statuses" },
  { value: "Submitted", label: "Submitted" },
  { value: "Acknowledged", label: "Acknowledged" },
  { value: "In Progress", label: "In Progress" },
  { value: "Resolved", label: "Resolved" },
  { value: "Closed", label: "Closed" },
];

export function ComplaintFilters({
  filters,
  onFilterChange,
}: ComplaintFiltersProps) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <Checkbox
        checked={filters.includeClosed}
        onChange={(e) =>
          onFilterChange({ ...filters, includeClosed: e.target.checked })
        }
        label={
          <span className="inline-flex items-center gap-1.5">
            <Archive className="h-3.5 w-3.5 text-muted-strong" aria-hidden="true" />
            Show closed
          </span>
        }
      />
      <Checkbox
        checked={filters.anonymousOnly}
        onChange={(e) =>
          onFilterChange({ ...filters, anonymousOnly: e.target.checked })
        }
        label={
          <span className="inline-flex items-center gap-1.5">
            <EyeOff className="h-3.5 w-3.5 text-muted-strong" aria-hidden="true" />
            Anonymous only
          </span>
        }
      />
      <div className="flex items-center gap-1.5">
        <Filter className="h-3.5 w-3.5 text-muted-strong" aria-hidden="true" />
        <Select
          value={filters.status}
          onChange={(e) =>
            onFilterChange({ ...filters, status: e.target.value })
          }
          className="w-auto rounded-md border border-border bg-surface px-2 py-1 text-xs text-foreground-strong"
        >
          {STATUS_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </Select>
      </div>
    </div>
  );
}
