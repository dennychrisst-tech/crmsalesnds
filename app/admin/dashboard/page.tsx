"use client";
import { useEffect, useState } from "react";
import Link from "next/link";

interface Stats {
  counts: {
    userCount: number; clientCount: number; contactCount: number; visitCount: number;
    dealCount: number; projectCount: number; taskCount: number; activityCount: number;
  };
  dealsByStage: { stage: string; count: number }[];
  totalDealValue: number;
  recentActivities: { id: string; type: string; description: string; created_by: string; created_at: string }[];
}

const STAGE_ORDER = [
  "Approching", "Present Solution", "RFI", "RFP/BRD", "Clarification/Requirement",
  "Proposal Teknis", "Presentasi Proposal", "POC/Demo", "Offering Letter",
  "Proposal Clarification", "Negotiation", "Dealed", "PO", "Kontrak", "On Hold", "Dropped",
];
const STAGE_COLOR: Record<string, string> = {
  Approching: "#94A3B8", "Present Solution": "#60A5FA", RFI: "#38BDF8", "RFP/BRD": "#6366F1",
  "Clarification/Requirement": "#378ADD", "Proposal Teknis": "#8B5CF6", "Presentasi Proposal": "#C026D3",
  "POC/Demo": "#E11D48", "Offering Letter": "#0D9488", "Proposal Clarification": "#F59E0B",
  Negotiation: "#DB2777", Dealed: "#16A34A", PO: "#CA8A04", Kontrak: "#D97706",
  "On Hold": "#78716C", Dropped: "#DC2626",
};

function formatIDR(n: number) {
  if (n >= 1_000_000_000) return `Rp ${(n / 1_000_000_000).toFixed(1)}M`;
  if (n >= 1_000_000) return `Rp ${(n / 1_000_000).toFixed(0)}jt`;
  return `Rp ${n.toLocaleString("id-ID")}`;
}

const card: React.CSSProperties = {
  background: "var(--card)", border: "1px solid var(--line)", borderRadius: "12px", padding: "20px",
};

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/stats").then(r => r.json()).then(setStats).finally(() => setLoading(false));
  }, []);

  if (loading) return <div style={{ color: "var(--ink-soft)", fontSize: "13px" }}>Memuat data…</div>;
  if (!stats) return <div style={{ color: "var(--danger)", fontSize: "13px" }}>Gagal memuat data.</div>;

  const { counts, dealsByStage, totalDealValue, recentActivities } = stats;

  const statCards = [
    { label: "User", value: counts.userCount, color: "#6366f1" },
    { label: "Client", value: counts.clientCount, color: "#0ea5e9" },
    { label: "Kontak", value: counts.contactCount, color: "#14b8a6" },
    { label: "Kunjungan", value: counts.visitCount, color: "#f59e0b" },
    { label: "Deal", value: counts.dealCount, color: "#8b5cf6" },
    { label: "Proyek", value: counts.projectCount, color: "#10b981" },
    { label: "Task", value: counts.taskCount, color: "#f97316" },
    { label: "Aktivitas", value: counts.activityCount, color: "#ec4899" },
  ];

  const stageMap = Object.fromEntries(dealsByStage.map(d => [d.stage, d.count]));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "28px" }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "16px", flexWrap: "wrap" }}>
        <div>
          <h1 style={{ fontSize: "20px", fontWeight: 800, color: "var(--ink)", margin: 0 }}>Dashboard Admin</h1>
          <p style={{ fontSize: "13px", color: "var(--ink-soft)", marginTop: "4px" }}>Ringkasan data seluruh sistem — untuk performa per sales, lihat Summary Activity</p>
        </div>
        <Link href="/?view=summary" style={{
          display: "inline-flex", alignItems: "center", gap: "6px", padding: "9px 16px",
          borderRadius: "8px", background: "var(--ink)", color: "#fff", fontWeight: 700,
          fontSize: "13px", textDecoration: "none", whiteSpace: "nowrap",
        }}>
          Lihat Performa per Sales →
        </Link>
      </div>

      {/* Stat cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: "14px" }}>
        {statCards.map(s => (
          <div key={s.label} style={{ ...card, display: "flex", flexDirection: "column", gap: "6px" }}>
            <div style={{ fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".08em", color: "var(--ink-soft)" }}>{s.label}</div>
            <div style={{ fontSize: "28px", fontWeight: 800, color: s.color, lineHeight: 1 }}>{s.value}</div>
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
        {/* Total deal value */}
        <div style={card}>
          <div style={{ fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".08em", color: "var(--ink-soft)", marginBottom: "8px" }}>Total Nilai Pipeline</div>
          <div style={{ fontSize: "32px", fontWeight: 800, color: "#10b981" }}>{formatIDR(totalDealValue)}</div>
        </div>

        {/* Deals by stage */}
        <div style={card}>
          <div style={{ fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".08em", color: "var(--ink-soft)", marginBottom: "12px" }}>Project per Stage</div>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {STAGE_ORDER.filter(s => stageMap[s]).map(stage => (
              <div key={stage} style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <div style={{ width: "10px", height: "10px", borderRadius: "3px", background: STAGE_COLOR[stage], flexShrink: 0 }} />
                <div style={{ fontSize: "12px", flex: 1, color: "var(--ink)" }}>{stage}</div>
                <div className="stage-text" style={{ fontSize: "13px", fontWeight: 700, color: STAGE_COLOR[stage] }}>{stageMap[stage]}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent activities */}
      <div style={card}>
        <div style={{ fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".08em", color: "var(--ink-soft)", marginBottom: "14px" }}>Aktivitas Terbaru</div>
        {recentActivities.length === 0 ? (
          <div style={{ fontSize: "13px", color: "var(--ink-soft)" }}>Belum ada aktivitas.</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "0" }}>
            {recentActivities.map((a, i) => (
              <div key={a.id} style={{
                display: "flex", gap: "12px", padding: "10px 0",
                borderBottom: i < recentActivities.length - 1 ? "1px solid var(--line)" : "none",
              }}>
                <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#00AFA0", marginTop: "6px", flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: "13px", color: "var(--ink)" }}>
                    <span style={{ fontWeight: 600 }}>{a.type}</span>
                    {a.description && <span style={{ color: "var(--ink-soft)" }}> — {a.description.slice(0, 80)}{a.description.length > 80 ? "…" : ""}</span>}
                  </div>
                  <div style={{ fontSize: "11px", color: "var(--ink-soft)", marginTop: "2px" }}>
                    {a.created_by || "—"} · {new Date(a.created_at).toLocaleString("id-ID", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
