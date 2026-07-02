"use client";
import { useEffect, useState } from "react";
import { v4 as uuid } from "uuid";
import Modal, { Field, inputCls, selectCls, textareaCls, ModalActions } from "./ui/Modal";
import { RevenueOpportunity } from "@/types";
import { REVENUE_OPP_CATEGORIES, REVENUE_OPP_STATUS } from "@/lib/utils";

interface Props {
  open: boolean;
  opportunity: RevenueOpportunity | null;
  year: number;
  team: string[];
  onSave: (o: RevenueOpportunity) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onClose: () => void;
}

function emptyOpp(year: number): RevenueOpportunity {
  return {
    id: uuid(), year, project_name: "", pic: "", category: "L", amount: 0, target_closing_date: null,
    team: "", pmo: "", plan: "", product: "", potentially_billed_amount: 0, potentially_billed_percent: 0,
    presales: "", sales: "", status: "Active", reason: "", notes: "",
  };
}

export default function RevenueOpportunityModal({ open, opportunity, year, team, onSave, onDelete, onClose }: Props) {
  const isEdit = !!opportunity;
  const [form, setForm] = useState<RevenueOpportunity>(emptyOpp(year));
  const [amountDisplay, setAmountDisplay] = useState("");
  const [billedDisplay, setBilledDisplay] = useState("");

  useEffect(() => {
    const base = opportunity || emptyOpp(year);
    setForm(base);
    setAmountDisplay(base.amount ? base.amount.toLocaleString("id-ID") : "");
    setBilledDisplay(base.potentially_billed_amount ? base.potentially_billed_amount.toLocaleString("id-ID") : "");
  // Re-init only when the modal opens or a different opportunity is opened.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [opportunity?.id, open]);

  const set = (k: keyof RevenueOpportunity, v: string | number | null) => setForm(f => ({ ...f, [k]: v }));

  async function handleSave() {
    if (!form.project_name.trim()) { alert("Nama project wajib diisi."); return; }
    await onSave(form);
    onClose();
  }

  async function handleDelete() {
    if (!confirm("Hapus opportunity ini?")) return;
    await onDelete(form.id);
    onClose();
  }

  return (
    <Modal open={open} onClose={onClose} title={isEdit ? "Edit Opportunity" : "Tambah Opportunity"}>
      <Field label="Nama Project">
        <input className={inputCls} value={form.project_name} onChange={e => set("project_name", e.target.value)} placeholder="Mis. SMBCI - IBM MQ Annual Support" />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Kategori (H/M/L)">
          <select className={selectCls} value={form.category} onChange={e => set("category", e.target.value)}>
            {REVENUE_OPP_CATEGORIES.map(c => <option key={c}>{c}</option>)}
          </select>
        </Field>
        <Field label="Status">
          <select className={selectCls} value={form.status} onChange={e => set("status", e.target.value)}>
            {REVENUE_OPP_STATUS.map(s => <option key={s}>{s}</option>)}
          </select>
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Nilai Project">
          <div style={{ position: "relative" }}>
            <span style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", fontSize: 12, color: "var(--ink-soft)", pointerEvents: "none" }}>IDR</span>
            <input
              className={inputCls} style={{ paddingLeft: 38 }} inputMode="numeric" value={amountDisplay}
              onChange={e => {
                const raw = e.target.value.replace(/\D/g, "");
                const num = parseInt(raw, 10) || 0;
                setAmountDisplay(raw ? num.toLocaleString("id-ID") : "");
                setForm(f => ({ ...f, amount: num }));
              }}
              placeholder="0"
            />
          </div>
        </Field>
        <Field label="Target Closing">
          <input type="date" className={inputCls} value={form.target_closing_date || ""} onChange={e => set("target_closing_date", e.target.value || null)} />
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="PIC">
          <select className={selectCls} value={form.pic} onChange={e => set("pic", e.target.value)}>
            <option value="">— Pilih —</option>
            {team.map(t => <option key={t}>{t}</option>)}
          </select>
        </Field>
        <Field label="Product">
          <input className={inputCls} value={form.product} onChange={e => set("product", e.target.value)} placeholder="Mis. IBM, Custom" />
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Team">
          <input className={inputCls} value={form.team} onChange={e => set("team", e.target.value)} />
        </Field>
        <Field label="PMO">
          <input className={inputCls} value={form.pmo} onChange={e => set("pmo", e.target.value)} />
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Presales">
          <select className={selectCls} value={form.presales} onChange={e => set("presales", e.target.value)}>
            <option value="">— Pilih —</option>
            {team.map(t => <option key={t}>{t}</option>)}
          </select>
        </Field>
        <Field label="Sales">
          <select className={selectCls} value={form.sales} onChange={e => set("sales", e.target.value)}>
            <option value="">— Pilih —</option>
            {team.map(t => <option key={t}>{t}</option>)}
          </select>
        </Field>
      </div>
      <Field label="Plan">
        <input className={inputCls} value={form.plan} onChange={e => set("plan", e.target.value)} />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Potentially Billed Amount">
          <div style={{ position: "relative" }}>
            <span style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", fontSize: 12, color: "var(--ink-soft)", pointerEvents: "none" }}>IDR</span>
            <input
              className={inputCls} style={{ paddingLeft: 38 }} inputMode="numeric" value={billedDisplay}
              onChange={e => {
                const raw = e.target.value.replace(/\D/g, "");
                const num = parseInt(raw, 10) || 0;
                setBilledDisplay(raw ? num.toLocaleString("id-ID") : "");
                setForm(f => ({ ...f, potentially_billed_amount: num }));
              }}
              placeholder="0"
            />
          </div>
        </Field>
        <Field label="Potentially Billed %">
          <input type="number" min={0} max={100} className={inputCls} value={form.potentially_billed_percent || ""}
            onChange={e => set("potentially_billed_percent", Math.max(0, Math.min(100, parseInt(e.target.value, 10) || 0)))} />
        </Field>
      </div>

      {form.status !== "Active" && (
        <Field label={`Alasan ${form.status}`}>
          <textarea className={textareaCls} value={form.reason} onChange={e => set("reason", e.target.value)}
            placeholder="Mis. Tidak ada budget, kalah harga, dll." />
        </Field>
      )}

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
