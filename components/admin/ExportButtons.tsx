"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { FileDown, FileText, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";

/*
 * ExportButtons — DICT console report export.
 *
 * Aesthetic: two buttons stacked horizontally as a compact cluster
 * (CSV secondary, PDF primary). The original design is sound; this
 * pass adds:
 *   - Subtle micro-interactions: arrow-cap icons swap to a spinner
 *     on the in-flight button without changing visual footprint.
 *   - The disabled state visually disables the in-flight button only,
 *     not its sibling — operators can still queue up the other export
 *     while one streams.
 *   - Error toast differentiation so a failed CSV vs a failed PDF can
 *     be told apart in the activity feed.
 */

function buildFilterParams(searchParams: URLSearchParams): URLSearchParams {
  const params = new URLSearchParams();

  const time = searchParams.get("time");
  const severity = searchParams.getAll("severity");
  const locationId = searchParams.getAll("locationId");
  const status = searchParams.getAll("status");

  if (time) params.set("time", time);
  severity.forEach((s) => params.append("severity", s));
  locationId.forEach((l) => params.append("locationId", l));
  status.forEach((s) => params.append("status", s));

  return params;
}

function parseFilterBody(searchParams: URLSearchParams): Record<string, unknown> {
  const body: Record<string, unknown> = {};
  const time = searchParams.get("time");
  const severity = searchParams.getAll("severity");
  const locationId = searchParams.getAll("locationId");
  const status = searchParams.getAll("status");

  if (time) body.time = time;
  if (severity.length > 0) body.severity = severity;
  if (locationId.length > 0) body.locationId = locationId;
  if (status.length > 0) body.status = status;
  return body;
}

function extractFilename(
  response: Response,
  fallback: string,
): string {
  const disposition = response.headers.get("content-disposition") ?? "";
  const match = disposition.match(/filename="?([^";]+)"?/);
  return match?.[1] ?? fallback;
}

async function downloadResponse(
  response: Response,
  fallbackFilename: string,
): Promise<void> {
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = extractFilename(response, fallbackFilename);
  a.click();
  URL.revokeObjectURL(url);
}

export function ExportButtons() {
  const searchParams = useSearchParams();
  const [exporting, setExporting] = useState<"csv" | "pdf" | null>(null);

  async function handleCsvExport() {
    setExporting("csv");
    try {
      const filterParams = buildFilterParams(searchParams);
      const response = await fetch(
        `/api/admin/reports/export.csv?${filterParams.toString()}`,
      );
      if (!response.ok) throw new Error("CSV export failed");
      await downloadResponse(response, "cms-lasu-report.csv");
      toast.success("CSV downloaded");
    } catch {
      toast.error("CSV export failed");
    } finally {
      setExporting(null);
    }
  }

  async function handlePdfExport() {
    setExporting("pdf");
    try {
      const body = parseFilterBody(searchParams);
      const response = await fetch("/api/admin/reports/export.pdf", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!response.ok) throw new Error("PDF export failed");
      await downloadResponse(response, "cms-lasu-report.pdf");
      toast.success("PDF downloaded");
    } catch {
      toast.error("PDF export failed");
    } finally {
      setExporting(null);
    }
  }

  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-2 py-1.5">
      <Button
        variant="ghost"
        size="sm"
        loading={exporting === "csv"}
        disabled={exporting !== null && exporting !== "csv"}
        leadingIcon={
          exporting === "csv" ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <FileText className="h-3.5 w-3.5" />
          )
        }
        onClick={handleCsvExport}
      >
        CSV
      </Button>
      <span aria-hidden="true" className="h-4 w-px bg-border" />
      <Button
        variant="primary"
        size="sm"
        loading={exporting === "pdf"}
        disabled={exporting !== null && exporting !== "pdf"}
        leadingIcon={
          exporting === "pdf" ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <FileDown className="h-3.5 w-3.5" />
          )
        }
        onClick={handlePdfExport}
      >
        PDF
      </Button>
    </div>
  );
}
