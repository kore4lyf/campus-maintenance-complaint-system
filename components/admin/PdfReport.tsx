"use client";

import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";

const styles = StyleSheet.create({
  page: { padding: 30, fontSize: 10, fontFamily: "Helvetica" },
  title: { fontSize: 18, fontWeight: "bold", marginBottom: 10 },
  subtitle: { fontSize: 12, marginBottom: 5, color: "#666" },
  section: { marginTop: 15, marginBottom: 10 },
  sectionTitle: { fontSize: 12, fontWeight: "bold", marginBottom: 8 },
  row: { flexDirection: "row", justifyContent: "space-between", marginBottom: 4 },
  label: { fontSize: 10 },
  value: { fontSize: 10, fontWeight: "bold" },
  filterRow: { flexDirection: "row", gap: 10, marginBottom: 5 },
  filterLabel: { fontSize: 9, color: "#888" },
  chartRow: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 10 },
  chartBox: { width: "48%", border: "1 solid #ddd", padding: 8, borderRadius: 4 },
  chartTitle: { fontSize: 9, fontWeight: "bold", marginBottom: 5 },
  barRow: { flexDirection: "row", alignItems: "center", marginBottom: 3 },
  barLabel: { width: 100, fontSize: 8 },
  bar: { height: 8, backgroundColor: "#3b82f6", marginLeft: 5 },
  barCount: { fontSize: 8, marginLeft: 5 },
  card: { border: "1 solid #ddd", padding: 10, borderRadius: 4, width: "48%", marginTop: 10 },
  cardLabel: { fontSize: 9, color: "#666" },
  cardValue: { fontSize: 18, fontWeight: "bold", marginTop: 4 },
  notes: { marginTop: 20, padding: 10, border: "1 solid #ddd", borderRadius: 4 },
  notesTitle: { fontSize: 10, fontWeight: "bold", marginBottom: 5 },
  notesText: { fontSize: 9, color: "#666" },
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

function BarChart({ data, maxCount }: { data: ChartPoint[]; maxCount: number }) {
  return (
    <View>
      {data.slice(0, 8).map((item, i) => (
        <View key={i} style={styles.barRow}>
          <Text style={styles.barLabel}>{item.name}</Text>
          <View
            style={[
              styles.bar,
              { width: maxCount > 0 ? `${(item.count / maxCount) * 100}%` : "0%" },
            ]}
          />
          <Text style={styles.barCount}>{item.count}</Text>
        </View>
      ))}
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
  const maxCat = Math.max(...byCategory.map((d) => d.count), 1);
  const maxLoc = Math.max(...byLocation.map((d) => d.count), 1);
  const maxSev = Math.max(...bySeverity.map((d) => d.count), 1);
  const avgMinutes = avgResolutionMs !== null ? Math.round(avgResolutionMs / 60000) : null;

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>LASU Complaint Report</Text>
        <Text style={styles.subtitle}>Generated: {new Date(generatedAt).toLocaleString()}</Text>

        <View style={styles.filterRow}>
          <Text style={styles.filterLabel}>Time: {filters.time}</Text>
          <Text style={styles.filterLabel}>Severity: {filters.severity}</Text>
          <Text style={styles.filterLabel}>Location: {filters.location}</Text>
          <Text style={styles.filterLabel}>Status: {filters.status}</Text>
        </View>

        <View style={styles.chartRow}>
          <View style={styles.chartBox}>
            <Text style={styles.chartTitle}>By Category</Text>
            <BarChart data={byCategory} maxCount={maxCat} />
          </View>
          <View style={styles.chartBox}>
            <Text style={styles.chartTitle}>By Location</Text>
            <BarChart data={byLocation} maxCount={maxLoc} />
          </View>
        </View>

        <View style={styles.chartRow}>
          <View style={styles.chartBox}>
            <Text style={styles.chartTitle}>By Severity</Text>
            <BarChart data={bySeverity} maxCount={maxSev} />
          </View>
          <View style={styles.card}>
            <Text style={styles.cardLabel}>SLA Breaches</Text>
            <Text style={styles.cardValue}>
              {breachCount.acknowledgeOverdue + breachCount.resolveOverdue}
            </Text>
            <Text style={{ fontSize: 8, color: "#666", marginTop: 2 }}>
              Acknowledge overdue: {breachCount.acknowledgeOverdue}
            </Text>
            <Text style={{ fontSize: 8, color: "#666" }}>
              Resolve overdue: {breachCount.resolveOverdue}
            </Text>
          </View>
        </View>

        <View style={styles.chartRow}>
          <View style={styles.card}>
            <Text style={styles.cardLabel}>Avg Resolution Time</Text>
            <Text style={styles.cardValue}>
              {avgMinutes !== null ? `${avgMinutes} min` : "N/A"}
            </Text>
          </View>
          <View style={styles.card}>
            <Text style={styles.cardLabel}>Backlog (older than 7 days)</Text>
            <Text style={styles.cardValue}>{backlog}</Text>
          </View>
        </View>

        <View style={styles.notes}>
          <Text style={styles.notesTitle}>Notes</Text>
          <Text style={styles.notesText}>
            This report was generated from the Campus Maintenance Complaint Management System. All data reflects the active filter state at the time of generation.
          </Text>
        </View>
      </Page>
    </Document>
  );
}
