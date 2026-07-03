"use client";
import { useEffect, useState } from "react";
import { v4 as uuid } from "uuid";
import Modal, { Field, inputCls, selectCls, textareaCls, ModalActions } from "./ui/Modal";
import { TalentRole } from "@/types";
import { TALENT_LEVELS, TALENT_ROLE_STATUS } from "@/lib/utils";

interface Props {
  open: boolean;
  role: TalentRole | null;
  projectId: string;
  team: string[];
  onSave: (r: TalentRole) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onClose: () => void;
}

function emptyRole(projectId: string): TalentRole {
  return {
    id: uuid(), project_id: projectId, role_name: "", level: "", ratecard: 0, pic: "",
    deadline: null, status: "Open", req_cv: 0, cv_submitted: 0, cv_reject: 0, cv_not_response: 0, po_issued: 0, notes: "",
  };
}

// Number input bound directly to a numeric field — the count columns
// (Req CV / CV Submitted / CV Reject / CV Not Response / PO Issued) are all
// small non-negative integers, so a plain number input is enough (unlike
// ratecard, which needs the Rupiah-formatted display treatment).
function CountField({ label, value, onChange }: { label: string; value: number; onChange: (n: number) => void }) {
  return (
    <Field label={label}>
      <input type="number" min={0} className={inputCls} value={value || ""}
        onChange={e => onChange(Math.max(0, parseInt(e.target.value, 10) || 0))} placeholder="0" />
    </Field>
  );
}

export default function TalentRoleModal({ open, role, projectId, team, onSave, onDelete, onClose }: Props) {
  const isEdit = !!role;
  const [form, setForm] = useState<TalentRole>(emptyRole(projectId));
  const [ratecardDisplay, setRatecardDisplay] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const base = role || emptyRole(projectId);
    setForm(base);
    setRatecardDisplay(base.ratecard ? base.ratecard.toLocaleString("id-ID") : "");
  // Re-init only when the modal opens or a different role is opened.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role?.id, open]);

  const set = (k: keyof TalentRole, v: string | number | null) => setForm(f => ({ ...f, [k]: v }));

  async function handleSave() {
    if (!form.role_name.trim()) { alert("Role wajib diisi."); return; }
    setSaving(true);
    try {
      await onSave(form);
      onClose();
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!confirm("Hapus batch requisition ini?")) return;
    await onDelete(form.id);
    onClose();
  }

  return (
    <Modal open={open} onClose={onClose} title={isEdit ? "Edit Requisition" : "Tambah Requisition"}>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Role">
          <input className={inputCls} value={form.role_name} onChange={e => set("role_name", e.target.value)} placeholder="Mis. Fullstack Developer" />
        </Field>
        <Field label="Status">
          <select className={selectCls} value={form.status} onChange={e => set("status", e.target.value)}>
            {TALENT_ROLE_STATUS.map(s => <option key={s}>{s}</option>)}
          </select>
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Level">
          <select className={selectCls} value={form.level} onChange={e => set("level", e.target.value)}>
            <option value="">— Pilih —</option>
            {TALENT_LEVELS.map(l => <option key={l}>{l}</option>)}
          </select>
        </Field>
        <Field label="PIC / Recruiter">
          <select className={selectCls} value={form.pic} onChange={e => set("pic", e.target.value)}>
            <option value="">— Pilih —</option>
            {team.map(t => <option key={t}>{t}</option>)}
          </select>
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Ratecard (per bulan)">
          <div style={{ position: "relative" }}>
            <span style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", fontSize: 12, color: "var(--ink-soft)", pointerEvents: "none" }}>IDR</span>
            <input
              className={inputCls}
              style={{ paddingLeft: 38 }}
              inputMode="numeric"
              value={ratecardDisplay}
              onChange={e => {
                const raw = e.target.value.replace(/\D/g, "");
                const num = parseInt(raw, 10) || 0;
                setRatecardDisplay(raw ? num.toLocaleString("id-ID") : "");
                setForm(f => ({ ...f, ratecard: num }));
              }}
              placeholder="0"
            />
          </div>
        </Field>
        <Field label="Deadline">
          <input type="date" className={inputCls} value={form.deadline || ""} onChange={e => set("deadline", e.target.value || null)} />
        </Field>
      </div>

      <div style={{ background: "var(--paper)", border: "1px solid var(--line)", borderRadius: 10, padding: 12, marginBottom: 12 }}>
        <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".06em", color: "var(--ink-soft)", marginBottom: 10 }}>
          Jumlah
        </div>
        <div className="grid grid-cols-2 gap-3">
          <CountField label="Req CV" value={form.req_cv} onChange={n => set("req_cv", n)} />
          <CountField label="CV Submitted" value={form.cv_submitted} onChange={n => set("cv_submitted", n)} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <CountField label="CV Reject" value={form.cv_reject} onChange={n => set("cv_reject", n)} />
          <CountField label="CV Not Response / Not Avail" value={form.cv_not_response} onChange={n => set("cv_not_response", n)} />
        </div>
        <CountField label="PO Issued" value={form.po_issued} onChange={n => set("po_issued", n)} />
      </div>

      <Field label="Note">
        <textarea className={textareaCls} value={form.notes} onChange={e => set("notes", e.target.value)}
          placeholder="Penjelasan hasil, nama kandidat yang PO Issued, dll." />
      </Field>
      <ModalActions>
        {isEdit && <button className="btn btn-danger" onClick={handleDelete} disabled={saving}>Hapus</button>}
        <button className="btn btn-ghost" onClick={onClose}>Batal</button>
        <button className="btn" onClick={handleSave} disabled={saving}>{saving ? "Menyimpan…" : "Simpan"}</button>
      </ModalActions>
    </Modal>
  );
}
