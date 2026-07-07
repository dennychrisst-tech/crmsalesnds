"use client";
import { useEffect, useState } from "react";
import Link from "next/link";

interface TeamMember {
  id: string; name: string; email: string; role: string; created_at: string;
}

const ROLE_LABEL: Record<string, string> = {
  viewer: "Viewer", employee: "Employee", admin: "Admin", super_admin: "Super Admin",
};
const ROLE_COLOR: Record<string, string> = {
  viewer: "#94a3b8", employee: "#64748b", admin: "#3b82f6", super_admin: "#8b5cf6",
};

export default function AdminTeam() {
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/team").then(r => r.json()).then(setTeam).finally(() => setLoading(false));
  }, []);

  const th: React.CSSProperties = {
    padding: "11px 16px", textAlign: "left", fontSize: "11px",
    fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: ".08em", color: "var(--ink-soft)",
  };
  const td: React.CSSProperties = { padding: "13px 16px", fontSize: "13px" };

  return (
    <div>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "16px", marginBottom: "24px", flexWrap: "wrap" }}>
        <div>
          <h1 style={{ fontSize: "20px", fontWeight: 800, color: "var(--ink)", margin: 0 }}>Manajemen Tim</h1>
          <p style={{ fontSize: "13px", color: "var(--ink-soft)", marginTop: "4px" }}>Daftar anggota tim dan role mereka</p>
        </div>
        <Link href="/summary" style={{
          display: "inline-flex", alignItems: "center", gap: "6px", padding: "9px 16px",
          borderRadius: "8px", background: "var(--surface-strong)", color: "#fff", fontWeight: 700,
          fontSize: "13px", textDecoration: "none", whiteSpace: "nowrap",
        }}>
          Lihat Performa per Sales →
        </Link>
      </div>

      <p style={{ fontSize: "12px", color: "var(--ink-soft)", marginTop: "-14px", marginBottom: "18px" }}>
        📌 Angka performa (jumlah client, deal, kunjungan, aktivitas) dipindahkan ke <strong>Summary Activity</strong> di menu utama — sudah ada filter periode (mingguan/bulanan) di sana, jadi tidak ada dua tabel dengan angka yang beda cakupan untuk pertanyaan yang sama.
      </p>

      <div style={{ background: "var(--card)", border: "1px solid var(--line)", borderRadius: "12px", overflow: "hidden" }}>
        {loading ? (
          <div style={{ padding: "32px", textAlign: "center", color: "var(--ink-soft)", fontSize: "13px" }}>Memuat data…</div>
        ) : team.length === 0 ? (
          <div style={{ padding: "32px", textAlign: "center", color: "var(--ink-soft)", fontSize: "13px" }}>Belum ada anggota tim.</div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--line)" }}>
                {["Nama", "Email", "Role", "Bergabung"].map(h => <th key={h} style={th}>{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {team.map((m, i) => (
                <tr key={m.id} style={{ borderBottom: i < team.length - 1 ? "1px solid var(--line)" : "none" }}>
                  <td style={{ ...td, fontWeight: 600 }}>{m.name || "—"}</td>
                  <td style={{ ...td, color: "var(--ink-soft)" }}>{m.email}</td>
                  <td style={td}>
                    <span style={{
                      display: "inline-block", padding: "3px 8px", borderRadius: "20px",
                      fontSize: "11px", fontWeight: 700,
                      background: `${ROLE_COLOR[m.role] ?? "#64748b"}20`, color: ROLE_COLOR[m.role] ?? "#64748b",
                    }}>
                      {ROLE_LABEL[m.role] ?? m.role}
                    </span>
                  </td>
                  <td style={{ ...td, color: "var(--ink-soft)", fontSize: "12px" }}>
                    {new Date(m.created_at).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
