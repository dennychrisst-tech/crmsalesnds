"use client";
import { useState } from "react";
import { todayStr } from "@/lib/utils";

const TABLES = [
  { key: "clients", label: "Client", desc: "Nama, sektor, status, kontak, alamat" },
  { key: "contacts", label: "Kontak", desc: "PIC per client — nama, jabatan, email, telp" },
  { key: "visits", label: "Kunjungan", desc: "Riwayat kunjungan ke client" },
  { key: "deals", label: "Deal / Pipeline", desc: "Semua deal beserta nilai dan stage" },
  { key: "projects", label: "Proyek", desc: "Proyek aktif dan selesai" },
  { key: "tasks", label: "Task", desc: "Daftar tugas tim" },
  { key: "products", label: "Produk", desc: "Katalog produk dan layanan" },
  { key: "activities", label: "Aktivitas", desc: "Log aktivitas (call, email, meeting, dll)" },
  { key: "events", label: "Event", desc: "Jadwal event dan meeting" },
] as const;

type TableKey = typeof TABLES[number]["key"];

export default function AdminExport() {
  const [downloading, setDownloading] = useState<TableKey | null>(null);

  async function handleExport(table: TableKey) {
    setDownloading(table);
    try {
      const res = await fetch(`/api/admin/export?table=${table}`);
      if (!res.ok) { alert("Gagal mengekspor data."); return; }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${table}_${todayStr()}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setDownloading(null);
    }
  }

  return (
    <div>
      <div style={{ marginBottom: "24px" }}>
        <h1 style={{ fontSize: "20px", fontWeight: 800, color: "var(--ink)", margin: 0 }}>Export Data</h1>
        <p style={{ fontSize: "13px", color: "var(--ink-soft)", marginTop: "4px" }}>
          Unduh data CRM dalam format CSV. File dapat dibuka di Excel atau Google Sheets.
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "14px" }}>
        {TABLES.map(t => (
          <div key={t.key} style={{
            background: "var(--card)", border: "1px solid var(--line)",
            borderRadius: "12px", padding: "18px 20px",
            display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px",
          }}>
            <div>
              <div style={{ fontSize: "14px", fontWeight: 700, color: "var(--ink)" }}>{t.label}</div>
              <div style={{ fontSize: "12px", color: "var(--ink-soft)", marginTop: "3px" }}>{t.desc}</div>
            </div>
            <button
              onClick={() => handleExport(t.key)}
              disabled={downloading === t.key}
              style={{
                flexShrink: 0, padding: "8px 14px", borderRadius: "8px",
                background: downloading === t.key ? "#94a3b8" : "var(--ink)",
                color: "#fff", border: "none", fontSize: "12px", fontWeight: 700,
                cursor: downloading === t.key ? "not-allowed" : "pointer",
                whiteSpace: "nowrap",
              }}
            >
              {downloading === t.key ? "…" : "↓ CSV"}
            </button>
          </div>
        ))}
      </div>

      <div style={{
        marginTop: "24px", padding: "14px 18px", borderRadius: "10px",
        background: "#f8fafc", border: "1px solid var(--line)", fontSize: "12px", color: "var(--ink-soft)",
      }}>
        <strong>Catatan:</strong> Export mencakup semua data tanpa filter. Gunakan Excel/Google Sheets untuk filtering dan analisis lanjutan.
      </div>
    </div>
  );
}
