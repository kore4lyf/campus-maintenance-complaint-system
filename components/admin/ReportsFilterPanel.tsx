"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { SlidersHorizontal, X } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Field, Select } from "@/components/ui/Field";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import type { BadgeProps } from "@/components/ui/Badge";

const TIME_OPTIONS = [
  { value: "", label: "All time" },
  { value: "today", label: "Today" },
  { value: "7d", label: "Last 7 days" },
  { value: "30d", label: "Last 30 days" },
  { value: "90d", label: "Last 90 days" },
] as const;

const SEVERITY_OPTIONS = [
  { value: "Critical", tone: "danger" as BadgeProps["tone"] },
  { value: "High", tone: "warning" as BadgeProps["tone"] },
  { value: "Medium", tone: "info" as BadgeProps["tone"] },
  { value: "Low", tone: "success" as BadgeProps["tone"] },
] as const;

interface Location {
  _id: string;
  name: string;
}

interface ReportsFilterPanelProps {
  locations: Location[];
}

function ToggleChip({
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
        <Badge tone={tone ?? "neutral"}>{label}</Badge>
      )}
    </button>
  );
}

export function ReportsFilterPanel({ locations }: ReportsFilterPanelProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const currentTime = searchParams.get("time") ?? "";
  const currentSeverity = searchParams.getAll("severity");
  const currentLocationId = searchParams.getAll("locationId");
  const currentStatus = searchParams.getAll("status");

  const activeCount =
    (currentTime ? 1 : 0) + currentSeverity.length + currentLocationId.length + currentStatus.length;

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

  function clearAll() {
    router.push("/admin/reports");
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
              {activeCount === 0 ? "No filters applied" : `${activeCount} active`}
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
            Time window
          </h3>
          <div className="flex flex-wrap gap-1.5">
            {TIME_OPTIONS.map((option) => (
              <ToggleChip
                key={option.value || "all"}
                label={option.label}
                active={currentTime === option.value}
                onClick={() => setParam("time", option.value)}
              />
            ))}
          </div>
        </div>

        <div>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-strong">
            Severity
          </h3>
          <div className="flex flex-wrap gap-1.5">
            {SEVERITY_OPTIONS.map((option) => (
              <ToggleChip
                key={option.value}
                tone={option.tone}
                label={option.value}
                active={currentSeverity.includes(option.value)}
                onClick={() => toggleArrayParam("severity", option.value)}
              />
            ))}
          </div>
        </div>

        <div>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-strong">
            Location
          </h3>
          <Field>
            <Select
              value=""
              onChange={(e) => {
                if (e.target.value) {
                  toggleArrayParam("locationId", e.target.value);
                  e.target.value = "";
                }
              }}
            >
              <option value="">Add location filter…</option>
              {locations
                .filter((loc) => !currentLocationId.includes(loc._id))
                .map((loc) => (
                  <option key={loc._id} value={loc._id}>
                    {loc.name}
                  </option>
                ))}
            </Select>
          </Field>
          {currentLocationId.length > 0 ? (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {currentLocationId.map((locId) => {
                const loc = locations.find((l) => l._id === locId);
                return (
                  <ToggleChip
                    key={locId}
                    label={loc?.name ?? locId}
                    active
                    onClick={() => toggleArrayParam("locationId", locId)}
                  />
                );
              })}
            </div>
          ) : null}
        </div>

        <div>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-strong">
            Status
          </h3>
          <div className="flex flex-wrap gap-1.5">
            {["Submitted", "Acknowledged", "In Progress", "Resolved", "Closed"].map(
              (status) => (
                <ToggleChip
                  key={status}
                  label={status}
                  active={currentStatus.includes(status)}
                  onClick={() => toggleArrayParam("status", status)}
                />
              ),
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}
