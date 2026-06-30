"use client";
import { useEffect, useState, useCallback } from "react";

interface ActivityRow {
  id: string; type: string; description: string; created_by: string;
  created_at: string; client_name: string | null; deal_name: string | null;
}

interface AuditResponse {
  activities: ActivityRow[]; total: number; page: number; pages: number;
}

const TYPE_COLOR: Record<string, string> = {
  Note: "#64748b", Call: "#3b82f6", Email: "#0ea5e9", Meeting: "#8b5cf6",
  Demo: "#f59e0b", Follow_Up: "#f97316", "Follow Up": "#f97316",
};

export default function AdminAudit() {
  const [data, setData] = useState<AuditResponse | null>(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  const load = useCallback((p: number) => {
    setLoading(true);
    fetch(`/api/admin/audit?page=${p}`)
      .then(r => r.json())
      .then(setData)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(page); }, [load, page]);

  const th: React.CSSProperties = {
    padding: "11px 14px", textAlign: "left", fontSize: "11px",
    fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: ".08em", color: "var(--ink-soft)",
  };
  const td: React.CSSProperties = { padding: "11px 14px", fontSize: "13px", verticalAlign: "top" };

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "24px" }}>
        <div>
          <h1 style={{ fontSize: "20px", fontWeight: 800, color: "var(--ink)", margin: 0 }}>Audit Log</h1>
          <p style={{ fontSize: "13px", color: "var(--ink-soft)", marginTop: "4px" }}>
            Riwayat aktivitas CRM{data ? ` · ${data.total} total entri` : ""}
          </p>
        </div>
      </div>

      <div style={{ background: "var(--card)", border: "1px solid var(--line)", borderRadius: "12px", overflow: "hidden" }}>
        {loading ? (
          <div style={{ padding: "32px", textAlign: "center", color: "var(--ink-soft)", fontSize: "13px" }}>Memuat data…</div>
        ) : !data || data.activities.length === 0 ? (
          <div style={{ padding: "32px", textAlign: "center", color: "var(--ink-soft)", fontSize: "13px" }}>Belum ada aktivitas.</div>
        ) : (
          <>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--line)" }}>
                  {["Waktu", "Tipe", "Deskripsi", "Oleh", "Client / Deal"].map(h => (
                    <th key={h} style={th}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.activities.map((a, i) => (
                  <tr key={a.id} style={{ borderBottom: i < data.activities.length - 1 ? "1px solid var(--line)" : "none" }}>
                    <td style={{ ...td, fontSize: "11px", color: "var(--ink-soft)", whiteSpace: "nowrap" }}>
                      {new Date(a.created_at).toLocaleString("id-ID", {
                        day: "2-digit", month: "short", year: "numeric",
                        hour: "2-digit", minute: "2-digit",
                      })}
                    </td>
                    <td style={td}>
                      <span style={{
                        display: "inline-block", padding: "2px 8px", borderRadius: "20px",
                        fontSize: "11px", fontWeight: 700,
                        background: `${TYPE_COLOR[a.type] ?? "#64748b"}20`,
                        color: TYPE_COLOR[a.type] ?? "#64748b",
                      }}>
                        {a.type}
                      </span>
                    </td>
                    <td style={{ ...td, maxWidth: "260px", color: "var(--ink)" }}>
                      {a.description || "—"}
                    </td>
                    <td style={{ ...td, color: "var(--ink-soft)", whiteSpace: "nowrap" }}>{a.created_by || "—"}</td>
                    <td style={{ ...td, fontSize: "12px", color: "var(--ink-soft)" }}>
                      {a.client_name && <div>{a.client_name}</div>}
                      {a.deal_name && <div style={{ color: "#8b5cf6" }}>{a.deal_name}</div>}
                      {!a.client_name && !a.deal_name && "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {data.pages > 1 && (
              <div style={{
                display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
                padding: "14px", borderTop: "1px solid var(--line)",
              }}>
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  style={{ padding: "6px 14px", borderRadius: "7px", border: "1px solid var(--line)", background: "transparent", cursor: page === 1 ? "not-allowed" : "pointer", fontSize: "12px", opacity: page === 1 ? 0.4 : 1 }}
                >
                  ← Prev
                </button>
                <span style={{ fontSize: "12px", color: "var(--ink-soft)" }}>
                  Hal {page} / {data.pages}
                </span>
                <button
                  onClick={() => setPage(p => Math.min(data.pages, p + 1))}
                  disabled={page === data.pages}
                  style={{ padding: "6px 14px", borderRadius: "7px", border: "1px solid var(--line)", background: "transparent", cursor: page === data.pages ? "not-allowed" : "pointer", fontSize: "12px", opacity: page === data.pages ? 0.4 : 1 }}
                >
                  Next →
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
