// Small SVG trend line for a KPI card — originally local to Dashboard, now
// shared so other report pages (Summary Activity, Laporan Mingguan) can show
// the same trailing-weeks trend instead of a bare static number.
export function Sparkline({ data, color = "var(--brand)", warn = false }: { data: number[]; color?: string; warn?: boolean }) {
  if (!data.length) return null;
  const max = Math.max(...data, 1);
  const min = Math.min(...data);
  const W = 72, H = 28, pad = 2;
  const step = (W - pad * 2) / Math.max(data.length - 1, 1);
  const pts = data.map((v, i) => {
    const x = pad + i * step;
    const y = H - pad - ((v - min) / (max - min || 1)) * (H - pad * 2);
    return [x, y] as [number, number];
  });
  const line = pts.map(([x, y]) => `${x},${y}`).join(" ");
  const area = `${pts[0][0]},${H} ` + line + ` ${pts[pts.length - 1][0]},${H}`;
  const last = data[data.length - 1];
  const prev = data[data.length - 2] ?? last;
  const trend = last > prev ? "↑" : last < prev ? "↓" : "→";
  const trendColor = warn ? (last > prev ? "#DC2626" : "#16A34A") : (last >= prev ? "#0A6E5C" : "#94A3B8");
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 6 }}>
      <svg width={W} height={H} style={{ display: "block", flexShrink: 0 }}>
        <polyline points={area} fill={color} fillOpacity={0.08} stroke="none" />
        <polyline points={line} fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
        <circle cx={pts[pts.length - 1][0]} cy={pts[pts.length - 1][1]} r={2.5} fill={color} />
      </svg>
      <span style={{ fontSize: 11, fontWeight: 700, color: trendColor, lineHeight: 1 }}>{trend}</span>
    </div>
  );
}
