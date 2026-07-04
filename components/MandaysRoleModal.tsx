"use client";
import { useEffect, useState } from "react";
import { v4 as uuid } from "uuid";
import Modal, { Field, inputCls, ModalActions } from "./ui/Modal";
import { toast } from "./ui/Toast";
import { MandaysRole } from "@/types";

interface Props {
  open: boolean;
  role: MandaysRole | null;
  onSave: (r: MandaysRole) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onClose: () => void;
}

function emptyRole(): MandaysRole {
  return { id: uuid(), role_name: "", cogs: 0, low_rate: 0, med_rate: 0, max_price: 0 };
}

function MoneyField({ label, value, onChange }: { label: string; value: number; onChange: (n: number) => void }) {
  const [display, setDisplay] = useState(value ? value.toLocaleString("id-ID") : "");
  useEffect(() => { setDisplay(value ? value.toLocaleString("id-ID") : ""); }, [value]);
  return (
    <Field label={label}>
      <div style={{ position: "relative" }}>
        <span style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", fontSize: 12, color: "var(--ink-soft)", pointerEvents: "none" }}>IDR</span>
        <input
          className={inputCls} style={{ paddingLeft: 38 }} inputMode="numeric" value={display}
          onChange={e => {
            const raw = e.target.value.replace(/\D/g, "");
            const num = parseInt(raw, 10) || 0;
            setDisplay(raw ? num.toLocaleString("id-ID") : "");
            onChange(num);
          }}
          placeholder="0"
        />
      </div>
    </Field>
  );
}

export default function MandaysRoleModal({ open, role, onSave, onDelete, onClose }: Props) {
  const isEdit = !!role;
  const [form, setForm] = useState<MandaysRole>(emptyRole());
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setForm(role || emptyRole());
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role?.id, open]);

  async function handleSave() {
    if (!form.role_name.trim()) { toast("Nama role wajib diisi.", { type: "error" }); return; }
    setSaving(true);
    try {
      await onSave(form);
      onClose();
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!confirm("Hapus role ini beserta semua rate client di dalamnya?")) return;
    await onDelete(form.id);
    onClose();
  }

  return (
    <Modal open={open} onClose={onClose} title={isEdit ? "Edit Rate Card Role" : "Tambah Rate Card Role"}>
      <Field label="Nama Role">
        <input className={inputCls} value={form.role_name} onChange={e => setForm(f => ({ ...f, role_name: e.target.value }))} placeholder="Mis. PM, SA, TL" />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <MoneyField label="COGS" value={form.cogs} onChange={n => setForm(f => ({ ...f, cogs: n }))} />
        <MoneyField label="Low Rate" value={form.low_rate} onChange={n => setForm(f => ({ ...f, low_rate: n }))} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <MoneyField label="Med Rate" value={form.med_rate} onChange={n => setForm(f => ({ ...f, med_rate: n }))} />
        <MoneyField label="Max Price" value={form.max_price} onChange={n => setForm(f => ({ ...f, max_price: n }))} />
      </div>
      <ModalActions>
        {isEdit && <button className="btn btn-danger" onClick={handleDelete} disabled={saving}>Hapus</button>}
        <button className="btn btn-ghost" onClick={onClose}>Batal</button>
        <button className="btn" onClick={handleSave} disabled={saving}>{saving && <span className="btn-spinner" />}{saving ? "Menyimpan…" : "Simpan"}</button>
      </ModalActions>
    </Modal>
  );
}
