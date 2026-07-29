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
 *
 * Aesthetic pass (2026-07-29):
 *   - Tightened column gap on bar charts so titles plus bars plus
 *     counts read on a single linear rhythm.
 *   - Added a slim "kicker" on the brand header (10 pt uppercase letter-
 *     spaced label) and a divider beneath the brand lockup so the
 *     institutional-ish paper reads with the same compositional cadence
 *     as the marketing surfaces on the web app.
 *   - Moved filter pill row above the numeric card grid so the report
 *     has a more natural reading order: filters → snapshot → details.
 *   - Severity bars now sample from `SEVERITY_COLOR` more aggressively
 *     so a chart labelled "Volume by Severity" reads identical to the
 *     web `BarChartCard` page.
 *   - Footer left-side footer brand chip painted in gold ink for
 *     additive brand cohesion without flooding the surface.
 */
const COLOR = {
  brand: "#0c2848",
  brandStrong: "#001c3c",
  brandSoft: "#1a3858",
  accent: "#d4a014",
  accentSoft: "#f4d76a",
  ink: "#0f172a",
  inkSoft: "#475569",
  muted: "#94a3b8",
  rule: "#e2e8f0",
  ruleStrong: "#cbd5e1",
  danger: "#dc2626",
  warning: "#ea7c1c",
  info: "#0284c7",
  success: "#059669",
  surfaceAlt: "#f8fafc",
  surface: "#ffffff",
} as const;

const SEVERITY_COLOR: Record<string, string> = {
  Critical: COLOR.danger,
  High: COLOR.warning,
  Medium: COLOR.info,
  Low: COLOR.success,
};

const CATEGORY_FALLBACK = [
  COLOR.brand,
  COLOR.accent,
  COLOR.info,
  COLOR.success,
  COLOR.warning,
  COLOR.danger,
  COLOR.brandSoft,
  COLOR.accentSoft,
];

function pickFallbackPalette(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  }
  return CATEGORY_FALLBACK[hash % CATEGORY_FALLBACK.length]!;
}

const styles = StyleSheet.create({
  page: {
    padding: 36,
    fontSize: 10,
    fontFamily: "Helvetica",
    color: COLOR.ink,
    backgroundColor: COLOR.surface,
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
  brandLock: {
    flexDirection: "column",
    gap: 1,
  },
  brand: {
    fontSize: 20,
    fontWeight: 700,
    color: COLOR.brand,
    letterSpacing: 0.4,
  },
  brandSub: {
    fontSize: 8,
    color: COLOR.inkSoft,
    marginTop: 2,
    letterSpacing: 1.8,
    textTransform: "uppercase",
  },
  // Slim accent dot the same role as the "Lagos State University · DICT"
  // kicker label on the Home marketing surface.
  brandAccent: {
    marginTop: 3,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  brandAccentDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLOR.accent,
  },
  brandAccentText: {
    fontSize: 7,
    color: COLOR.brandSoft,
    letterSpacing: 1.6,
    textTransform: "uppercase",
  },
  meta: { fontSize: 9, color: COLOR.inkSoft, textAlign: "right" },
  metaKey: { fontWeight: 700, color: COLOR.ink },
  filters: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginBottom: 14,
  },
  filterPill: {
    fontSize: 9,
    color: COLOR.brand,
    backgroundColor: "#f1f5f9",
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: COLOR.rule,
  },
  section: { marginTop: 14 },
  sectionDivider: {
    height: 1,
    backgroundColor: COLOR.rule,
    marginBottom: 8,
  },
  sectionTitle: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 8,
  },
  sectionTitleBar: {
    width: 3,
    height: 12,
    backgroundColor: COLOR.brand,
    borderRadius: 1,
  },
  sectionKicker: {
    fontSize: 7,
    fontWeight: 700,
    color: COLOR.brand,
    letterSpacing: 1.4,
    textTransform: "uppercase",
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: 700,
    color: COLOR.ink,
  },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  card: {
    width: "48%",
    borderRadius: 6,
    borderWidth: 1,
    borderColor: COLOR.rule,
    padding: 10,
    backgroundColor: COLOR.surface,
  },
  cardLabel: {
    fontSize: 8,
    color: COLOR.inkSoft,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  cardValue: {
    fontSize: 22,
    fontWeight: 700,
    color: COLOR.brand,
    marginTop: 4,
  },
  cardDetail: { fontSize: 8, color: COLOR.inkSoft, marginTop: 4 },
  cardAccent: { color: COLOR.danger, fontWeight: 700 },
  cardRule: {
    height: 1,
    backgroundColor: COLOR.rule,
    marginTop: 6,
  },
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
    borderWidth: 1,
    borderColor: COLOR.rule,
  },
  barFill: { height: 6, borderRadius: 999 },
  barCount: { width: 28, fontSize: 8, color: COLOR.ink, textAlign: "right" },
  // Hairline divider between chart blocks (added in the polish pass).
  chartDivider: {
    height: 1,
    backgroundColor: COLOR.rule,
    marginTop: 12,
    marginBottom: 12,
  },
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
  footerBrand: { color: COLOR.accent, fontWeight: 700, letterSpacing: 0.3 },
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

function fillForName(name: string, fallbackPalette: string): string {
  return SEVERITY_COLOR[name] ?? fallbackPalette;
}

function BarChart({
  data,
  maxCount,
}: {
  data: ChartPoint[];
  maxCount: number;
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
                    backgroundColor: fillForName(
                      item.name,
                      pickFallbackPalette(item.name),
                    ),
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
  accent,
}: {
  label: string;
  value: string;
  detail?: string;
  accent?: boolean;
}) {
  return (
    <View style={styles.card}>
      <Text style={styles.cardLabel}>{label}</Text>
      <Text
        style={
          accent
            ? [styles.cardValue, styles.cardAccent]
            : styles.cardValue
        }
      >
        {value}
      </Text>
      {detail ? <Text style={styles.cardDetail}>{detail}</Text> : null}
      <View style={styles.cardRule} />
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

function SectionTitle({ kicker, label }: { kicker: string; label: string }) {
  return (
    <View style={styles.sectionTitle}>
      <View style={styles.sectionTitleBar} />
      <Text style={styles.sectionKicker}>{kicker}</Text>
      <Text style={styles.sectionLabel}>{label}</Text>
      <View style={styles.sectionDivider} />
    </View>
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
          <View style={styles.brandLock}>
            <Text style={styles.brand}>LASU CMS · Maintenance Report</Text>
            <Text style={styles.brandSub}>
              Campus Maintenance Complaint Management System
            </Text>
            <View style={styles.brandAccent}>
              <View style={styles.brandAccentDot} />
              <Text style={styles.brandAccentText}>
                Lagos State University · Directorate of ICT
              </Text>
            </View>
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
          <SectionTitle kicker="Snapshot" label="At a glance" />
          <View style={styles.grid}>
            {card({
              label: "SLA breaches",
              value: String(totalBreaches),
              detail: `Ack overdue ${breachCount.acknowledgeOverdue} · Resolve overdue ${breachCount.resolveOverdue}`,
              accent: totalBreaches > 0,
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

        <View style={styles.chartDivider} />

        {/* ---------- Volume charts ---------- */}
        <View style={styles.section}>
          <SectionTitle kicker="By category" label="Volume by fault type" />
          <BarChart data={byCategory} maxCount={maxCat} />
        </View>

        <View style={styles.chartDivider} />

        <View style={styles.section}>
          <SectionTitle
            kicker="By location"
            label="Volume by location"
          />
          <BarChart data={byLocation} maxCount={maxLoc} />
        </View>

        <View style={styles.chartDivider} />

        <View style={styles.section}>
          <SectionTitle
            kicker="By severity"
            label="Volume by severity"
          />
          <BarChart data={bySeverity} maxCount={maxSev} />
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
