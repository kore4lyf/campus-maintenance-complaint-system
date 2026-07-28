"use client";

import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";

/*
 * PDF generated server-side. @react-pdf/renderer doesn't read CSS custom
 * properties, so the brand palette lives here as literal hex constants
 * matching the tokens in app/globals.css — sampled from public/cms-lasu-full.png.
 *
 *   Brand navy    #0c2848
 *   Accent gold   #d4a014
 *   Severity Critical #dc2626
 *   Severity High    #ea7c1c
 *   Severity Medium  #0284c7
 *   Severity Low     #059669
 */
const COLOR = {
  brand: "#0c2848",
  brandStrong: "#001c3c",
  brandSoft: "#1a3858",
  accent: "#d4a014",
  ink: "#0f172a",
  inkSoft: "#475569",
  muted: "#94a3b8",
  rule: "#e2e8f0",
  danger: "#dc2626",
  warning: "#ea7c1c",
  info: "#0284c7",
  success: "#059669",
  surfaceAlt: "#f8fafc",
} as const;

const SEVERITY_COLOR: Record<string, string> = {
  Critical: COLOR.danger,
  High: COLOR.warning,
  Medium: COLOR.info,
  Low: COLOR.success,
};

const styles = StyleSheet.create({
  page: {
    padding: 36,
    fontSize: 10,
    fontFamily: "Helvetica",
    color: COLOR.ink,
    backgroundColor: "#ffffff",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    borderBottomWidth: 2,
    borderBottomColor: COLOR.brand,
    paddingBottom: 8,
    marginBottom: 18,
  },
  brand: {
    fontSize: 18,
    fontWeight: 700,
    color: COLOR.brand,
    letterSpacing: 0.5,
  },
  brandSub: {
    fontSize: 8,
    color: COLOR.inkSoft,
    marginTop: 2,
    letterSpacing: 1.5,
    textTransform: "uppercase",
  },
  meta: { fontSize: 9, color: COLOR.inkSoft, textAlign: "right" },
  metaKey: { fontWeight: 700, color: COLOR.ink },
  filters: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: COLOR.rule,
  },
  filterPill: {
    fontSize: 9,
    color: COLOR.brand,
    backgroundColor: "#f1f5f9",
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  section: { marginTop: 14 },
  sectionTitle: {
    fontSize: 10,
    fontWeight: 700,
    color: COLOR.brand,
    marginBottom: 6,
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  card: {
    width: "48%",
    borderRadius: 6,
    borderWidth: 1,
    borderColor: COLOR.rule,
    padding: 10,
    backgroundColor: "#ffffff",
  },
  cardLabel: { fontSize: 8, color: COLOR.inkSoft, textTransform: "uppercase", letterSpacing: 1 },
  cardValue: { fontSize: 22, fontWeight: 700, color: COLOR.brand, marginTop: 4 },
  cardDetail: { fontSize: 8, color: COLOR.inkSoft, marginTop: 4 },
  cardAccent: { color: COLOR.danger, fontWeight: 700 },
  barRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
    gap: 4,
  },
  barName: { width: 90, fontSize: 8, color: COLOR.ink },
  barTrack: {
    flex: 1,
    height: 6,
    backgroundColor: COLOR.surfaceAlt,
    borderRadius: 999,
  },
  barFill: { height: 6, borderRadius: 999 },
  barCount: { width: 28, fontSize: 8, color: COLOR.ink, textAlign: "right" },
  footer: {
    position: "absolute",
    bottom: 22,
    left: 36,
    right: 36,
    fontSize: 7,
    color: COLOR.muted,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  footerBrand: { color: COLOR.accent, fontWeight: 700 },
});

interface ChartPoint {
  name: string;
  count: number;
}

interface PdfReportProps {
  byCategory: ChartPoint[];
  byLocation: ChartPoint[];
  bySeverity: ChartPoint[];
  breachCount: { acknowledgeOverdue: number; resolveOverdue: number };
  avgResolutionMs: number | null;
  backlog: number;
  filters: { time: string; severity: string; location: string; status: string };
  generatedAt: string;
}

function fillForName(name: string, fallback: string): string {
  return SEVERITY_COLOR[name] ?? fallback;
}

function BarChart({
  data,
  maxCount,
  fallbackColor,
}: {
  data: ChartPoint[];
  maxCount: number;
  fallbackColor: string;
}) {
  return (
    <View>
      {data.slice(0, 8).map((item, i) => {
        const pct =
          maxCount > 0 ? Math.max(2, (item.count / maxCount) * 100) : 2;
        return (
          <View key={i} style={styles.barRow}>
            <Text style={styles.barName}>{item.name.slice(0, 18)}</Text>
            <View style={styles.barTrack}>
              <View
                style={[
                  styles.barFill,
                  {
                    width: `${pct}%`,
                    backgroundColor: fillForName(item.name, fallbackColor),
                  },
                ]}
              />
            </View>
            <Text style={styles.barCount}>{item.count}</Text>
          </View>
        );
      })}
    </View>
  );
}

function card({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail?: string;
}) {
  return (
    <View style={styles.card}>
      <Text style={styles.cardLabel}>{label}</Text>
      <Text style={styles.cardValue}>{value}</Text>
      {detail ? <Text style={styles.cardDetail}>{detail}</Text> : null}
    </View>
  );
}

function Pill({ label, value }: { label: string; value: string }) {
  if (!value || value === "all" || value === "—") return null;
  return (
    <Text style={styles.filterPill}>
      {label}: {value}
    </Text>
  );
}

export function PdfReport({
  byCategory,
  byLocation,
  bySeverity,
  breachCount,
  avgResolutionMs,
  backlog,
  filters,
  generatedAt,
}: PdfReportProps) {
  const totalBreaches =
    breachCount.acknowledgeOverdue + breachCount.resolveOverdue;

  const maxCat = Math.max(...byCategory.map((d) => d.count), 1);
  const maxLoc = Math.max(...byLocation.map((d) => d.count), 1);
  const maxSev = Math.max(...bySeverity.map((d) => d.count), 1);
  const avgMinutes =
    avgResolutionMs !== null ? Math.round(avgResolutionMs / 60000) : null;
  const avgLabel =
    avgMinutes !== null
      ? avgMinutes < 60
        ? `${avgMinutes} min`
        : `${Math.round(avgMinutes / 60)} hr`
      : "N/A";

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* ---------- Header ---------- */}
        <View style={styles.header}>
          <View>
            <Text style={styles.brand}>LASU CMS · Maintenance Report</Text>
            <Text style={styles.brandSub}>
              Lagos State University · Directorate of ICT
            </Text>
          </View>
          <View style={styles.meta}>
            <Text>
              <Text style={styles.metaKey}>Generated </Text>
              {new Date(generatedAt).toLocaleString()}
            </Text>
            <Text>
              <Text style={styles.metaKey}>Status </Text>
              Active filter set
            </Text>
          </View>
        </View>

        {/* ---------- Filter summary ---------- */}
        <View style={styles.filters}>
          <Pill label="Time" value={filters.time} />
          <Pill label="Severity" value={filters.severity} />
          <Pill label="Location" value={filters.location} />
          <Pill label="Status" value={filters.status} />
        </View>

        {/* ---------- Numeric cards ---------- */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>At a glance</Text>
          <View style={styles.grid}>
            {card({
              label: "SLA breaches",
              value: String(totalBreaches),
              detail: `Ack overdue ${breachCount.acknowledgeOverdue} · Resolve overdue ${breachCount.resolveOverdue}`,
            })}
            {card({
              label: "Avg resolution time",
              value: avgLabel,
              detail: "Across all resolved complaints in this filter set.",
            })}
            {card({
              label: "Backlog",
              value: String(backlog),
              detail: "Open submissions older than 7 days.",
            })}
          </View>
        </View>

        {/* ---------- Volume charts ---------- */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Volume by category</Text>
          <BarChart
            data={byCategory}
            maxCount={maxCat}
            fallbackColor={COLOR.brand}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Volume by location</Text>
          <BarChart
            data={byLocation}
            maxCount={maxLoc}
            fallbackColor={COLOR.brandSoft}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Volume by severity</Text>
          <BarChart
            data={bySeverity}
            maxCount={maxSev}
            fallbackColor={COLOR.inkSoft}
          />
        </View>

        {/* ---------- Footer ---------- */}
        <View style={styles.footer} fixed>
          <Text>
            <Text style={styles.footerBrand}>LASU CMS</Text>
            {" · Campus Maintenance Complaint Management System"}
          </Text>
          <Text
            render={({ pageNumber, totalPages }) =>
              `Page ${pageNumber} / ${totalPages}`
            }
          />
        </View>
      </Page>
    </Document>
  );
}
