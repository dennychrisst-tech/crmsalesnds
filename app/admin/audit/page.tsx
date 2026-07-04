"use client";
import { useEffect, useState, useCallback } from "react";

interface ActivityRow {
  id: string; type: string; description: string; created_by: string;
  created_at: string; client_name: string | null; deal_name: string | null;
}

interface AuditResponse {
  activities: ActivityRow[]; total: number; page: number; pages: number;
}

interface AdminLogRow {
  id: string; action: string; target: string; actor_name: string; actor_email: string;
  details: Record<string, unknown>; ip: string; created_at: string;
}

interface AdminLogResponse {
  logs: AdminLogRow[]; total: number; page: number; pages: number;
}

const TYPE_COLOR: Record<string, string> = {
  Note: "#64748b", Call: "#3b82f6", Email: "#0ea5e9", Meeting: "#8b5cf6",
  Demo: "#f59e0b", Follow_Up: "#f97316", "Follow Up": "#f97316",
};

const ACTION_LABEL: Record<string, string> = {
  "user.create": "Buat User",
  "user.update_role": "Ubah Role",
  "user.reset_password": "Reset Password",
  "user.delete": "Hapus User",
  "settings.update": "Ubah Pengaturan",
  "data.export": "Export Data",
  "login.failed": "Login Gagal",
};

const ACTION_COLOR: Record<string, string> = {
  "user.create": "#16a34a",
  "user.update_role": "#3b82f6",
  "user.reset_password": "#f59e0b",
  "user.delete": "#dc2626",
  "settings.update": "#8b5cf6",
  "data.export": "#0ea5e9",
  "login.failed": "#dc2626",
};

function formatDetails(action: string, details: Record<string, unknown>): string {
  if (!details || Object.keys(details).length === 0) return "—";
  if (action === "user.update_role") return `${details.from} → ${details.to}`;
  if (action === "user.create") return `role: ${details.role}`;
  if (action === "data.export") return `${details.rows} baris`;
  if (action === "settings.update") return Object.keys(details).join(", ");
  return JSON.stringify(details);
}

const th: React.CSSProperties = {
  padding: "11px 14px", textAlign: "left", fontSize: "11px",
  fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: ".08em", color: "var(--ink-soft)",
};
const td: React.CSSProperties = { padding: "11px 14px", fontSize: "13px", verticalAlign: "top" };

function Pager({ page, pages, onChange }: { page: number; pages: number; onChange: (p: number) => void }) {
  if (pages <= 1) return null;
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", padding: "14px", borderTop: "1px solid var(--line)" }}>
      <button onClick={() => onChange(Math.max(1, page - 1))} disabled={page === 1}
        style={{ padding: "6px 14px", borderRadius: "7px", border: "1px solid var(--line)", background: "transparent", cursor: page === 1 ? "not-allowed" : "pointer", fontSize: "12px", opacity: page === 1 ? 0.4 : 1 }}>
        ← Prev
      </button>
      <span style={{ fontSize: "12px", color: "var(--ink-soft)" }}>Hal {page} / {pages}</span>
      <button onClick={() => onChange(Math.min(pages, page + 1))} disabled={page === pages}
        style={{ padding: "6px 14px", borderRadius: "7px", border: "1px solid var(--line)", background: "transparent", cursor: page === pages ? "not-allowed" : "pointer", fontSize: "12px", opacity: page === pages ? 0.4 : 1 }}>
        Next →
      </button>
    </div>
  );
}

function SalesActivityTab() {
  const [data, setData] = useState<AuditResponse | null>(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  const load = useCallback((p: number) => {
    setLoading(true);
    fetch(`/api/admin/audit?page=${p}`).then(r => r.json()).then(setData).finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(page); }, [load, page]);

  return (
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
                {["Waktu", "Tipe", "Deskripsi", "Oleh", "Client / Project"].map(h => <th key={h} style={th}>{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {data.activities.map((a, i) => (
                <tr key={a.id} style={{ borderBottom: i < data.activities.length - 1 ? "1px solid var(--line)" : "none" }}>
                  <td style={{ ...td, fontSize: "11px", color: "var(--ink-soft)", whiteSpace: "nowrap" }}>
                    {new Date(a.created_at).toLocaleString("id-ID", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                  </td>
                  <td style={td}>
                    <span style={{ display: "inline-block", padding: "2px 8px", borderRadius: "20px", fontSize: "11px", fontWeight: 700, background: `${TYPE_COLOR[a.type] ?? "#64748b"}20`, color: TYPE_COLOR[a.type] ?? "#64748b" }}>
                      {a.type}
                    </span>
                  </td>
                  <td style={{ ...td, maxWidth: "260px", color: "var(--ink)" }}>{a.description || "—"}</td>
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
          <Pager page={data.page} pages={data.pages} onChange={setPage} />
        </>
      )}
    </div>
  );
}

function AdminLogTab() {
  const [data, setData] = useState<AdminLogResponse | null>(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  const load = useCallback((p: number) => {
    setLoading(true);
    fetch(`/api/admin/audit-logs?page=${p}`).then(r => r.json()).then(setData).finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(page); }, [load, page]);

  return (
    <div style={{ background: "var(--card)", border: "1px solid var(--line)", borderRadius: "12px", overflow: "hidden" }}>
      {loading ? (
        <div style={{ padding: "32px", textAlign: "center", color: "var(--ink-soft)", fontSize: "13px" }}>Memuat data…</div>
      ) : !data || data.logs.length === 0 ? (
        <div style={{ padding: "32px", textAlign: "center", color: "var(--ink-soft)", fontSize: "13px" }}>Belum ada log admin.</div>
      ) : (
        <>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--line)" }}>
                {["Waktu", "Aksi", "Target", "Detail", "Oleh", "IP"].map(h => <th key={h} style={th}>{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {data.logs.map((l, i) => (
                <tr key={l.id} style={{ borderBottom: i < data.logs.length - 1 ? "1px solid var(--line)" : "none" }}>
                  <td style={{ ...td, fontSize: "11px", color: "var(--ink-soft)", whiteSpace: "nowrap" }}>
                    {new Date(l.created_at).toLocaleString("id-ID", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                  </td>
                  <td style={td}>
                    <span style={{ display: "inline-block", padding: "2px 8px", borderRadius: "20px", fontSize: "11px", fontWeight: 700, background: `${ACTION_COLOR[l.action] ?? "#64748b"}20`, color: ACTION_COLOR[l.action] ?? "#64748b" }}>
                      {ACTION_LABEL[l.action] ?? l.action}
                    </span>
                  </td>
                  <td style={{ ...td, color: "var(--ink)" }}>{l.target || "—"}</td>
                  <td style={{ ...td, fontSize: "12px", color: "var(--ink-soft)" }}>{formatDetails(l.action, l.details)}</td>
                  <td style={{ ...td, color: "var(--ink-soft)", whiteSpace: "nowrap" }}>{l.actor_name || l.actor_email || "—"}</td>
                  <td style={{ ...td, fontSize: "11px", color: "var(--ink-soft)", whiteSpace: "nowrap" }}>{l.ip || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <Pager page={data.page} pages={data.pages} onChange={setPage} />
        </>
      )}
    </div>
  );
}

export default function AdminAudit() {
  const [tab, setTab] = useState<"sales" | "admin">("sales");

  const tabBtn = (active: boolean): React.CSSProperties => ({
    padding: "8px 16px", borderRadius: "7px", border: "1px solid var(--line)",
    background: active ? "var(--ink)" : "transparent", color: active ? "#fff" : "var(--ink)",
    fontWeight: 700, fontSize: "13px", cursor: "pointer",
  });

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "18px", flexWrap: "wrap", gap: "12px" }}>
        <div>
          <h1 style={{ fontSize: "20px", fontWeight: 800, color: "var(--ink)", margin: 0 }}>Audit Log</h1>
          <p style={{ fontSize: "13px", color: "var(--ink-soft)", marginTop: "4px" }}>
            {tab === "sales" ? "Riwayat aktivitas sales ke client" : "Riwayat aksi sensitif admin (user, pengaturan, export, login gagal)"}
          </p>
        </div>
        <div style={{ display: "flex", gap: "8px" }}>
          <button style={tabBtn(tab === "sales")} onClick={() => setTab("sales")}>Aktivitas Sales</button>
          <button style={tabBtn(tab === "admin")} onClick={() => setTab("admin")}>Log Admin</button>
        </div>
      </div>

      {tab === "sales" ? <SalesActivityTab /> : <AdminLogTab />}
    </div>
  );
}
