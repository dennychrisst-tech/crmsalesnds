"use client";
import { useEffect, useState } from "react";
import { v4 as uuid } from "uuid";
import Modal, { Field, inputCls, selectCls, textareaCls, ModalActions } from "./ui/Modal";
import { TalentRole, TalentCV } from "@/types";
import { TALENT_CV_STATUS, TALENT_CV_STATUS_COLOR, fmtDate, todayStr } from "@/lib/utils";

interface Props {
  open: boolean;
  role: TalentRole | null;
  cvs: TalentCV[];
  onSave: (cv: TalentCV) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onClose: () => void;
}

function emptyCV(roleId: string): TalentCV {
  return {
    id: uuid(), role_id: roleId, candidate_name: "", submit_date: todayStr(), status: "Submitted",
    interview_date: null, hired_date: null, po_date: null, notes: "",
  };
}

function CVStatusBadge({ status }: { status: string }) {
  const c = TALENT_CV_STATUS_COLOR[status] || { bg: "#EAE6DA", fg: "#5C5440" };
  return (
    <span style={{ display: "inline-block", padding: "2px 9px", borderRadius: 999, fontSize: 11, fontWeight: 700, background: c.bg, color: c.fg }}>
      {status}
    </span>
  );
}

export default function TalentCVModal({ open, role, cvs, onSave, onDelete, onClose }: Props) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<TalentCV>(emptyCV(""));
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    setShowForm(false);
    setEditingId(null);
    if (role) setForm(emptyCV(role.id));
  }, [role?.id, open]);

  if (!role) return null;

  const set = (k: keyof TalentCV, v: string | null) => setForm(f => ({ ...f, [k]: v }));

  function openNew() {
    setForm(emptyCV(role!.id));
    setEditingId(null);
    setShowForm(true);
  }

  function openEdit(cv: TalentCV) {
    setForm(cv);
    setEditingId(cv.id);
    setShowForm(true);
  }

  async function handleSaveCV() {
    if (!form.candidate_name.trim()) { alert("Nama kandidat wajib diisi."); return; }
    await onSave(form);
    setShowForm(false);
    setEditingId(null);
  }

  async function handleDeleteCV(id: string) {
    if (!confirm("Hapus CV ini?")) return;
    await onDelete(id);
    if (editingId === id) { setShowForm(false); setEditingId(null); }
  }

  const counts = TALENT_CV_STATUS.reduce<Record<string, number>>((acc, s) => ({ ...acc, [s]: cvs.filter(cv => cv.status === s).length }), {});

  return (
    <Modal open={open} onClose={onClose} title={`CV: ${role.role_name}`}>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
        {TALENT_CV_STATUS.map(s => (
          <div key={s} style={{ background: "var(--paper)", border: "1px solid var(--line)", borderRadius: 8, padding: "6px 12px", minWidth: 76 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: "var(--ink-soft)", textTransform: "uppercase", letterSpacing: ".04em" }}>{s}</div>
            <div style={{ fontSize: 18, fontWeight: 800, color: "var(--ink)" }}>{counts[s] || 0}</div>
          </div>
        ))}
      </div>

      {!cvs.length ? (
        <div className="empty-state" style={{ marginBottom: 14 }}>Belum ada CV disubmit untuk role ini.</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 14 }}>
          {cvs.map(cv => (
            <div key={cv.id} style={{ background: "var(--card)", border: "1px solid var(--line)", borderRadius: 10, padding: "10px 12px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 13.5 }}>{cv.candidate_name}</div>
                  <div style={{ fontSize: 11.5, color: "var(--ink-soft)", marginTop: 2 }}>
                    Submit: {fmtDate(cv.submit_date)}
                    {cv.interview_date && ` · Interview: ${fmtDate(cv.interview_date)}`}
                    {cv.hired_date && ` · Hired: ${fmtDate(cv.hired_date)}`}
                    {cv.po_date && ` · PO: ${fmtDate(cv.po_date)}`}
                  </div>
                </div>
                <CVStatusBadge status={cv.status} />
              </div>
              <div style={{ display: "flex", gap: 8, marginTop: 8, justifyContent: "flex-end" }}>
                <button className="btn btn-ghost btn-sm" onClick={() => openEdit(cv)}>Edit</button>
                <button className="btn btn-danger btn-sm" onClick={() => handleDeleteCV(cv.id)}>Hapus</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {!showForm ? (
        <button className="btn" onClick={openNew}>+ Tambah CV</button>
      ) : (
        <div style={{ background: "var(--paper)", border: "1px solid var(--line)", borderRadius: 10, padding: 12 }}>
          <Field label="Nama Kandidat">
            <input className={inputCls} value={form.candidate_name} onChange={e => set("candidate_name", e.target.value)} placeholder="Nama lengkap kandidat" />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Tgl Submit CV">
              <input type="date" className={inputCls} value={form.submit_date} onChange={e => set("submit_date", e.target.value)} />
            </Field>
            <Field label="Status">
              <select className={selectCls} value={form.status} onChange={e => set("status", e.target.value)}>
                {TALENT_CV_STATUS.map(s => <option key={s}>{s}</option>)}
              </select>
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Tgl Interview">
              <input type="date" className={inputCls} value={form.interview_date || ""} onChange={e => set("interview_date", e.target.value || null)} />
            </Field>
            <Field label="Tgl Hired">
              <input type="date" className={inputCls} value={form.hired_date || ""} onChange={e => set("hired_date", e.target.value || null)} />
            </Field>
          </div>
          <Field label="Tgl PO Release">
            <input type="date" className={inputCls} value={form.po_date || ""} onChange={e => set("po_date", e.target.value || null)} />
          </Field>
          <Field label="Catatan (opsional)">
            <textarea className={textareaCls} value={form.notes} onChange={e => set("notes", e.target.value)} />
          </Field>
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <button className="btn btn-ghost" onClick={() => { setShowForm(false); setEditingId(null); }}>Batal</button>
            <button className="btn" onClick={handleSaveCV}>{editingId ? "Simpan" : "Tambah"}</button>
          </div>
        </div>
      )}

      <ModalActions>
        <button className="btn btn-ghost" onClick={onClose}>Tutup</button>
      </ModalActions>
    </Modal>
  );
}
