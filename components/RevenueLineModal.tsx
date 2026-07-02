"use client";
import { useEffect, useState } from "react";
import { v4 as uuid } from "uuid";
import Modal, { Field, inputCls, selectCls, textareaCls, ModalActions } from "./ui/Modal";
import { RevenueLine, RevenueMilestone } from "@/types";
import { REVENUE_LINE_CATEGORIES, REVENUE_MILESTONE_STATUS, fmtIDR } from "@/lib/utils";

interface Props {
  open: boolean;
  line: RevenueLine | null;
  year: number;
  team: string[];
  onSave: (l: RevenueLine) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onClose: () => void;
}

function emptyLine(year: number): RevenueLine {
  return { id: uuid(), year, category: "Project", project_name: "", pic: "", milestones: [], notes: "" };
}

function emptyMilestone(): RevenueMilestone {
  return { id: uuid(), label: "", percent: 0, amount: 0, target_month: null, status: "To be billed" };
}

export default function RevenueLineModal({ open, line, year, team, onSave, onDelete, onClose }: Props) {
  const isEdit = !!line;
  const [form, setForm] = useState<RevenueLine>(emptyLine(year));

  useEffect(() => {
    setForm(line || emptyLine(year));
  // Re-init only when the modal opens or a different line is opened.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [line?.id, open]);

  const set = (k: keyof RevenueLine, v: string) => setForm(f => ({ ...f, [k]: v }));

  function addMilestone() {
    setForm(f => ({ ...f, milestones: [...f.milestones, emptyMilestone()] }));
  }

  function updateMilestone(id: string, patch: Partial<RevenueMilestone>) {
    setForm(f => ({ ...f, milestones: f.milestones.map(m => m.id === id ? { ...m, ...patch } : m) }));
  }

  function removeMilestone(id: string) {
    setForm(f => ({ ...f, milestones: f.milestones.filter(m => m.id !== id) }));
  }

  const totalAmount = form.milestones.reduce((s, m) => s + (m.amount || 0), 0);

  async function handleSave() {
    if (!form.project_name.trim()) { alert("Nama project wajib diisi."); return; }
    await onSave(form);
    onClose();
  }

  async function handleDelete() {
    if (!confirm("Hapus kontrak ini beserta seluruh milestone-nya?")) return;
    await onDelete(form.id);
    onClose();
  }

  return (
    <Modal open={open} onClose={onClose} title={isEdit ? "Edit Kontrak" : "Tambah Kontrak"}>
      <Field label="Nama Project">
        <input className={inputCls} value={form.project_name} onChange={e => set("project_name", e.target.value)} placeholder="Mis. CIMB - MLPT BBS One API" />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Kategori">
          <select className={selectCls} value={form.category} onChange={e => set("category", e.target.value)}>
            {REVENUE_LINE_CATEGORIES.map(c => <option key={c}>{c}</option>)}
          </select>
        </Field>
        <Field label="PIC / PM">
          <select className={selectCls} value={form.pic} onChange={e => set("pic", e.target.value)}>
            <option value="">— Pilih —</option>
            {team.map(t => <option key={t}>{t}</option>)}
          </select>
        </Field>
      </div>

      <div style={{ background: "var(--paper)", border: "1px solid var(--line)", borderRadius: 10, padding: 12, marginBottom: 12 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".06em", color: "var(--ink-soft)" }}>
            Milestone Invoicing
          </div>
          <div style={{ fontSize: 12, fontWeight: 700, color: "var(--brand)" }}>{fmtIDR(totalAmount)}</div>
        </div>

        {form.milestones.length === 0 && (
          <div className="empty-state" style={{ padding: "10px 0", fontSize: 12.5 }}>Belum ada milestone.</div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {form.milestones.map(m => (
            <div key={m.id} style={{ background: "var(--card)", border: "1px solid var(--line)", borderRadius: 8, padding: 8 }}>
              <div style={{ display: "flex", gap: 6, marginBottom: 6 }}>
                <input className={inputCls} style={{ flex: 1 }} value={m.label} placeholder="Mis. I - PO"
                  onChange={e => updateMilestone(m.id, { label: e.target.value })} />
                <button type="button" className="btn btn-danger btn-sm" onClick={() => removeMilestone(m.id)}>×</button>
              </div>
              <div className="grid grid-cols-2 gap-2" style={{ marginBottom: 6 }}>
                <input type="number" min={0} max={100} className={inputCls} placeholder="% TOP" value={m.percent || ""}
                  onChange={e => updateMilestone(m.id, { percent: Math.max(0, parseInt(e.target.value, 10) || 0) })} />
                <input
                  className={inputCls} inputMode="numeric" placeholder="Nominal"
                  value={m.amount ? m.amount.toLocaleString("id-ID") : ""}
                  onChange={e => {
                    const raw = e.target.value.replace(/\D/g, "");
                    updateMilestone(m.id, { amount: parseInt(raw, 10) || 0 });
                  }}
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <input type="month" className={inputCls} value={m.target_month || ""}
                  onChange={e => updateMilestone(m.id, { target_month: e.target.value || null })} />
                <select className={selectCls} value={m.status} onChange={e => updateMilestone(m.id, { status: e.target.value as RevenueMilestone["status"] })}>
                  {REVENUE_MILESTONE_STATUS.map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
            </div>
          ))}
        </div>

        <button type="button" className="btn btn-ghost btn-sm" style={{ marginTop: 10, width: "100%", justifyContent: "center" }} onClick={addMilestone}>
          + Tambah Milestone
        </button>
      </div>

      <Field label="Catatan">
        <textarea className={textareaCls} value={form.notes} onChange={e => set("notes", e.target.value)} />
      </Field>
      <ModalActions>
        {isEdit && <button className="btn btn-danger" onClick={handleDelete}>Hapus</button>}
        <button className="btn btn-ghost" onClick={onClose}>Batal</button>
        <button className="btn" onClick={handleSave}>Simpan</button>
      </ModalActions>
    </Modal>
  );
}
