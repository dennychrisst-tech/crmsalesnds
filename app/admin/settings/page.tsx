"use client";
import { useEffect, useState } from "react";

interface Settings {
  company_name?: string;
  currency?: string;
  fiscal_year_start?: string;
  support_email?: string;
}

const DEFAULTS: Settings = {
  company_name: "PT Nusantara Duta Solusindo",
  currency: "IDR",
  fiscal_year_start: "01",
  support_email: "",
};

const MONTHS = [
  ["01", "Januari"], ["02", "Februari"], ["03", "Maret"], ["04", "April"],
  ["05", "Mei"], ["06", "Juni"], ["07", "Juli"], ["08", "Agustus"],
  ["09", "September"], ["10", "Oktober"], ["11", "November"], ["12", "Desember"],
];

export default function AdminSettings() {
  const [settings, setSettings] = useState<Settings>(DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  useEffect(() => {
    fetch("/api/admin/settings")
      .then(r => r.json())
      .then(data => setSettings({ ...DEFAULTS, ...data }))
      .finally(() => setLoading(false));
  }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMsg(null);
    const res = await fetch("/api/admin/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(settings),
    });
    if (res.ok) setMsg({ type: "ok", text: "Pengaturan berhasil disimpan." });
    else setMsg({ type: "err", text: "Gagal menyimpan pengaturan." });
    setSaving(false);
  }

  const inputStyle: React.CSSProperties = {
    width: "100%", padding: "9px 12px", border: "1px solid var(--line)",
    borderRadius: "7px", fontSize: "13px", background: "var(--paper)", color: "var(--ink)",
    boxSizing: "border-box",
  };
  const labelStyle: React.CSSProperties = {
    display: "block", fontSize: "11px", fontWeight: 700, color: "var(--ink-soft)",
    marginBottom: "5px", textTransform: "uppercase", letterSpacing: ".08em",
  };

  return (
    <div style={{ maxWidth: "560px" }}>
      <div style={{ marginBottom: "24px" }}>
        <h1 style={{ fontSize: "20px", fontWeight: 800, color: "var(--ink)", margin: 0 }}>Pengaturan Aplikasi</h1>
        <p style={{ fontSize: "13px", color: "var(--ink-soft)", marginTop: "4px" }}>Konfigurasi umum sistem CRM</p>
      </div>

      {loading ? (
        <div style={{ fontSize: "13px", color: "var(--ink-soft)" }}>Memuat pengaturan…</div>
      ) : (
        <form onSubmit={handleSave}>
          <div style={{
            background: "var(--card)", border: "1px solid var(--line)",
            borderRadius: "12px", padding: "24px", display: "flex", flexDirection: "column", gap: "20px",
          }}>
            <div>
              <label style={labelStyle}>Nama Perusahaan</label>
              <input
                style={inputStyle}
                value={settings.company_name ?? ""}
                onChange={e => setSettings(s => ({ ...s, company_name: e.target.value }))}
                placeholder="PT Nusantara Duta Solusindo"
              />
            </div>
            <div>
              <label style={labelStyle}>Mata Uang</label>
              <select
                style={inputStyle}
                value={settings.currency ?? "IDR"}
                onChange={e => setSettings(s => ({ ...s, currency: e.target.value }))}
              >
                <option value="IDR">IDR — Rupiah</option>
                <option value="USD">USD — Dollar</option>
                <option value="SGD">SGD — Dolar Singapura</option>
              </select>
            </div>
            <div>
              <label style={labelStyle}>Awal Tahun Fiskal</label>
              <select
                style={inputStyle}
                value={settings.fiscal_year_start ?? "01"}
                onChange={e => setSettings(s => ({ ...s, fiscal_year_start: e.target.value }))}
              >
                {MONTHS.map(([val, label]) => (
                  <option key={val} value={val}>{label}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Email Support</label>
              <input
                type="email"
                style={inputStyle}
                value={settings.support_email ?? ""}
                onChange={e => setSettings(s => ({ ...s, support_email: e.target.value }))}
                placeholder="support@nds.co.id"
              />
            </div>

            {msg && (
              <div style={{
                padding: "10px 14px", borderRadius: "7px", fontSize: "13px",
                background: msg.type === "ok" ? "#f0fdf4" : "#fef2f2",
                border: `1px solid ${msg.type === "ok" ? "#bbf7d0" : "#fecaca"}`,
                color: msg.type === "ok" ? "#15803d" : "var(--danger)",
              }}>
                {msg.text}
              </div>
            )}

            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <button
                type="submit"
                disabled={saving}
                style={{
                  background: "var(--surface-strong)", color: "#fff", border: "none", padding: "10px 22px",
                  borderRadius: "8px", fontWeight: 700, fontSize: "13px",
                  cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.7 : 1,
                }}
              >
                {saving ? "Menyimpan…" : "Simpan Pengaturan"}
              </button>
            </div>
          </div>
        </form>
      )}
    </div>
  );
}
