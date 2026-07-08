// "vs previous period" hint under a KPI number — e.g. "+3 dari minggu lalu".
// Shared by Weekly Report and Summary Activity so a bare current-period total
// isn't the only signal; a manager scanning the page can tell at a glance
// whether things are trending up or down without opening last period's report.
export function PeriodDelta({ current, previous, label }: { current: number; previous: number; label: string }) {
  const diff = current - previous;
  if (diff === 0) {
    return <div className="kpi-sub" style={{ color: "var(--ink-soft)" }}>sama seperti {label}</div>;
  }
  const positive = diff > 0;
  return (
    <div className="kpi-sub" style={{ color: positive ? "var(--brand)" : "var(--danger)", fontWeight: 700 }}>
      {positive ? "+" : ""}{diff} dari {label}
    </div>
  );
}
