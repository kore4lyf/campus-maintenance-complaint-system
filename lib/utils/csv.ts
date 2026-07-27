export function toCsvRow(values: (string | number | null | undefined)[]): string {
  return values
    .map((v) => {
      const str = v === null || v === undefined ? "" : String(v);
      if (str.includes(",") || str.includes('"') || str.includes("\n")) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    })
    .join(",");
}

export function toCsv(
  rows: Record<string, string | number | null | undefined>[],
  columns: { key: string; header: string }[],
): string {
  const header = toCsvRow(columns.map((c) => c.header));
  const lines = rows.map((row) =>
    toCsvRow(columns.map((c) => row[c.key])),
  );
  return [header, ...lines].join("\n");
}

export function formatDateForFilename(date: Date): string {
  return date.toISOString().replace(/[:.]/g, "-").slice(0, 19);
}
