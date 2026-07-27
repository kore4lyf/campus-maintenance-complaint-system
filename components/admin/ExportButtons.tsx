"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";

export function ExportButtons() {
  const searchParams = useSearchParams();
  const [exporting, setExporting] = useState<"csv" | "pdf" | null>(null);

  function getFilterParams() {
    const params = new URLSearchParams();
    const time = searchParams.get("time");
    const severity = searchParams.getAll("severity");
    const locationId = searchParams.getAll("locationId");
    const status = searchParams.getAll("status");

    if (time) params.set("time", time);
    severity.forEach((s) => params.append("severity", s));
    locationId.forEach((l) => params.append("locationId", l));
    status.forEach((s) => params.append("status", s));

    return params.toString();
  }

  async function handleCsvExport() {
    setExporting("csv");
    try {
      const filterParams = getFilterParams();
      const response = await fetch(`/api/admin/reports/export.csv?${filterParams}`);
      if (!response.ok) throw new Error("CSV export failed");
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = response.headers.get("content-disposition")?.split("filename=")[1]?.replace(/"/g, "") ?? "report.csv";
      a.click();
      URL.revokeObjectURL(url);
      toast.success("CSV exported successfully");
    } catch {
      toast.error("Failed to export CSV");
    } finally {
      setExporting(null);
    }
  }

  async function handlePdfExport() {
    setExporting("pdf");
    try {
      const filterParams = new URLSearchParams();
      const time = searchParams.get("time");
      const severity = searchParams.getAll("severity");
      const locationId = searchParams.getAll("locationId");
      const status = searchParams.getAll("status");

      if (time) filterParams.set("time", time);
      if (severity.length > 0) filterParams.set("severity", JSON.stringify(severity));
      if (locationId.length > 0) filterParams.set("locationId", JSON.stringify(locationId));
      if (status.length > 0) filterParams.set("status", JSON.stringify(status));

      const body: Record<string, unknown> = {};
      if (time) body.time = time;
      if (severity.length > 0) body.severity = severity;
      if (locationId.length > 0) body.locationId = locationId;
      if (status.length > 0) body.status = status;

      const response = await fetch("/api/admin/reports/export.pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!response.ok) throw new Error("PDF export failed");
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = response.headers.get("content-disposition")?.split("filename=")[1]?.replace(/"/g, "") ?? "report.pdf";
      a.click();
      URL.revokeObjectURL(url);
      toast.success("PDF exported successfully");
    } catch {
      toast.error("Failed to export PDF");
    } finally {
      setExporting(null);
    }
  }

  return (
    <div className="flex gap-2">
      <button
        onClick={handleCsvExport}
        disabled={exporting !== null}
        className="rounded-lg border border-border bg-surface-raised px-3 py-1.5 text-xs font-medium text-foreground hover:bg-surface-raised/80 disabled:opacity-50"
      >
        {exporting === "csv" ? "Exporting..." : "Export CSV"}
      </button>
      <button
        onClick={handlePdfExport}
        disabled={exporting !== null}
        className="rounded-lg border border-border bg-surface-raised px-3 py-1.5 text-xs font-medium text-foreground hover:bg-surface-raised/80 disabled:opacity-50"
      >
        {exporting === "pdf" ? "Exporting..." : "Export PDF"}
      </button>
    </div>
  );
}
