"use client";
import { useEffect, useState } from "react";
import { v4 as uuid } from "uuid";
import Modal, { Field, inputCls, selectCls, textareaCls, ModalActions } from "./ui/Modal";
import { MandaysRole, MandaysClientRate } from "@/types";

const CLASSIFICATIONS = ["< Low", "Low", "< Medium", "Medium", "< Max", "> Max"];

interface Props {
  open: boolean;
  rate: MandaysClientRate | null;
  roles: MandaysRole[];
  defaultRoleId?: string;
  onSave: (r: MandaysClientRate) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onClose: () => void;
}

function emptyRate(roleId: string): MandaysClientRate {
  return { id: uuid(), role_id: roleId, client_label: "", rate_label: "", rate_value: 0, classification: "Low", notes: "" };
}

export default function MandaysClientRateModal({ open, rate, roles, defaultRoleId, onSave, onDelete, onClose }: Props) {
  const isEdit = !!rate;
  const [form, setForm] = useState<MandaysClientRate>(emptyRate(defaultRoleId || roles[0]?.id || ""));
  const [display, setDisplay] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const base = rate || emptyRate(defaultRoleId || roles[0]?.id || "");
    setForm(base);
    setDisplay(base.rate_value ? base.rate_value.toLocaleString("id-ID") : "");
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rate?.id, open, defaultRoleId]);

  async function handleSave() {
    if (!form.client_label.trim()) { alert("Nama client wajib diisi."); return; }
    if (!form.rate_label.trim()) { alert("Label rate/periode wajib diisi."); return; }
    if (!form.role_id) { alert("Role wajib dipilih."); return; }
    setSaving(true);
    try {
      await onSave(form);
      onClose();
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!confirm("Hapus rate ini?")) return;
    await onDelete(form.id);
    onClose();
  }

  return (
    <Modal open={open} onClose={onClose} title={isEdit ? "Edit Rate Client" : "Tambah Rate Client"}>
      <Field label="Role">
        <select className={selectCls} value={form.role_id} onChange={e => setForm(f => ({ ...f, role_id: e.target.value }))}>
          {roles.map(r => <option key={r.id} value={r.id}>{r.role_name}</option>)}
        </select>
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Client">
          <input className={inputCls} value={form.client_label} onChange={e => setForm(f => ({ ...f, client_label: e.target.value }))} placeholder="Mis. DBS" />
        </Field>
        <Field label="Label Rate / Periode">
          <input className={inputCls} value={form.rate_label} onChange={e => setForm(f => ({ ...f, rate_label: e.target.value }))} placeholder="Mis. DBS OBID Propose Rate 2025" />
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Rate">
          <div style={{ position: "relative" }}>
            <span style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", fontSize: 12, color: "var(--ink-soft)", pointerEvents: "none" }}>IDR</span>
            <input
              className={inputCls} style={{ paddingLeft: 38 }} inputMode="numeric" value={display}
              onChange={e => {
                const raw = e.target.value.replace(/\D/g, "");
                const num = parseInt(raw, 10) || 0;
                setDisplay(raw ? num.toLocaleString("id-ID") : "");
                setForm(f => ({ ...f, rate_value: num }));
              }}
              placeholder="0"
            />
          </div>
        </Field>
        <Field label="Klasifikasi">
          <select className={selectCls} value={form.classification} onChange={e => setForm(f => ({ ...f, classification: e.target.value }))}>
            {CLASSIFICATIONS.map(c => <option key={c}>{c}</option>)}
          </select>
        </Field>
      </div>
      <Field label="Catatan">
        <textarea className={textareaCls} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
      </Field>
      <ModalActions>
        {isEdit && <button className="btn btn-danger" onClick={handleDelete} disabled={saving}>Hapus</button>}
        <button className="btn btn-ghost" onClick={onClose}>Batal</button>
        <button className="btn" onClick={handleSave} disabled={saving}>{saving ? "Menyimpan…" : "Simpan"}</button>
      </ModalActions>
    </Modal>
  );
}
