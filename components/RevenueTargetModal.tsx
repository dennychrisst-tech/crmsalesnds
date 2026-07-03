"use client";
import { useEffect, useState } from "react";
import { v4 as uuid } from "uuid";
import Modal, { Field, inputCls, ModalActions } from "./ui/Modal";
import { RevenueTarget } from "@/types";

interface Props {
  open: boolean;
  target: RevenueTarget | null;
  year: number;
  onSave: (t: RevenueTarget) => Promise<void>;
  onClose: () => void;
}

function emptyTarget(year: number): RevenueTarget {
  return { id: uuid(), year, target_revenue: 0, total_mandays: 0, mandays_per_year: 200, rate: 0, resource_count: 0 };
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

export default function RevenueTargetModal({ open, target, year, onSave, onClose }: Props) {
  const [form, setForm] = useState<RevenueTarget>(emptyTarget(year));
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setForm(target || emptyTarget(year));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target?.id, year, open]);

  async function handleSave() {
    setSaving(true);
    try {
      await onSave(form);
      onClose();
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={`Target Revenue ${year}`}>
      <MoneyField label="Target Revenue" value={form.target_revenue} onChange={n => setForm(f => ({ ...f, target_revenue: n }))} />
      <div className="grid grid-cols-2 gap-3">
        <Field label="Total Mandays">
          <input type="number" min={0} className={inputCls} value={form.total_mandays || ""}
            onChange={e => setForm(f => ({ ...f, total_mandays: Math.max(0, parseInt(e.target.value, 10) || 0) }))} />
        </Field>
        <Field label="Mandays / Tahun">
          <input type="number" min={0} className={inputCls} value={form.mandays_per_year || ""}
            onChange={e => setForm(f => ({ ...f, mandays_per_year: Math.max(0, parseInt(e.target.value, 10) || 0) }))} />
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <MoneyField label="Rate" value={form.rate} onChange={n => setForm(f => ({ ...f, rate: n }))} />
        <Field label="Jumlah Resource">
          <input type="number" min={0} className={inputCls} value={form.resource_count || ""}
            onChange={e => setForm(f => ({ ...f, resource_count: Math.max(0, parseInt(e.target.value, 10) || 0) }))} />
        </Field>
      </div>
      <ModalActions>
        <button className="btn btn-ghost" onClick={onClose}>Batal</button>
        <button className="btn" onClick={handleSave} disabled={saving}>{saving ? "Menyimpan…" : "Simpan"}</button>
      </ModalActions>
    </Modal>
  );
}
