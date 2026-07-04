"use client";
import { useState } from "react";
import { v4 as uuid } from "uuid";
import { CRMDocument } from "@/types";
import { DOC_TYPES, DOC_STATUSES, fmtDate, todayStr } from "@/lib/utils";
import { inputCls, selectCls } from "./ui/Modal";
import { toast } from "./ui/Toast";

interface Props {
  dealId: string;
  documents: CRMDocument[];
  onAdd: (d: CRMDocument) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

const emptyDoc = (dealId: string): Partial<CRMDocument> => ({
  deal_id: dealId, name: "", type: "Proposal Teknis", status: "Draft", date: todayStr(), notes: "",
});

function docStatusClass(status: string) {
  const map: Record<string, string> = {
    Draft: "badge badge-lead", Sent: "badge badge-proposal",
    Received: "badge badge-discovery", Approved: "badge badge-won", Rejected: "badge badge-lost",
  };
  return map[status] || "badge badge-lead";
}

export default function DocumentTracker({ dealId, documents, onAdd, onDelete }: Props) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<Partial<CRMDocument>>(emptyDoc(dealId));
  const [saving, setSaving] = useState(false);

  const set = <K extends keyof CRMDocument>(k: K, v: CRMDocument[K]) => setForm(f => ({ ...f, [k]: v }));

  async function handleAdd() {
    if (!form.name?.trim()) { toast("Nama dokumen wajib diisi.", { type: "error" }); return; }
    setSaving(true);
    try {
      await onAdd({ id: uuid(), deal_id: dealId, name: form.name!, type: form.type!, status: form.status!, date: form.date || "", notes: form.notes || "" });
      setForm(emptyDoc(dealId));
      setShowForm(false);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="doc-tracker">
      {!documents.length && !showForm && (
        <div className="empty-state" style={{ padding: "20px 0" }}>Belum ada dokumen tercatat.</div>
      )}
      {documents.length > 0 && (
        <table style={{ marginBottom: 12 }}>
          <thead>
            <tr>
              <th>Nama Dokumen</th>
              <th>Tipe</th>
              <th>Status</th>
              <th>Tanggal</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {documents.map(d => (
              <tr key={d.id}>
                <td style={{ fontWeight: 600 }}>{d.name}{d.notes && <div style={{ fontWeight: 400, fontSize: 11, color: "var(--ink-soft)" }}>{d.notes}</div>}</td>
                <td>{d.type}</td>
                <td><span className={docStatusClass(d.status)}>{d.status}</span></td>
                <td>{d.date ? fmtDate(d.date) : "—"}</td>
                <td>
                  <button className="btn btn-danger btn-sm" onClick={() => { if (confirm("Hapus dokumen ini?")) onDelete(d.id); }}>×</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {showForm ? (
        <div className="doc-form">
          <div className="grid grid-cols-2 gap-2 mb-2">
            <input className={inputCls} placeholder="Nama dokumen" value={form.name || ""} onChange={e => set("name", e.target.value)} />
            <input type="date" className={inputCls} value={form.date || ""} onChange={e => set("date", e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-2 mb-2">
            <select className={selectCls} value={form.type || "Proposal Teknis"} onChange={e => set("type", e.target.value)}>
              {DOC_TYPES.map(t => <option key={t}>{t}</option>)}
            </select>
            <select className={selectCls} value={form.status || "Draft"} onChange={e => set("status", e.target.value)}>
              {DOC_STATUSES.map(s => <option key={s}>{s}</option>)}
            </select>
          </div>
          <input className={inputCls + " mb-2"} placeholder="Catatan (opsional)" value={form.notes || ""} onChange={e => set("notes", e.target.value)} />
          <div className="flex gap-2">
            <button className="btn" onClick={handleAdd} disabled={saving}>{saving && <span className="btn-spinner" />}{saving ? "Menyimpan…" : "Simpan"}</button>
            <button className="btn btn-ghost" onClick={() => setShowForm(false)}>Batal</button>
          </div>
        </div>
      ) : (
        <button className="btn btn-ghost btn-sm" onClick={() => setShowForm(true)}>+ Tambah Dokumen</button>
      )}
    </div>
  );
}
