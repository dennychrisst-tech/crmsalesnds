"use client";
import { useEffect, useState } from "react";
import { v4 as uuid } from "uuid";
import Modal, { Field, inputCls, selectCls, textareaCls, ModalActions } from "./ui/Modal";
import { Deal, Client } from "@/types";
import { STAGES, REVENUE_OPP_CATEGORIES } from "@/lib/utils";
import SearchableSelect from "./ui/SearchableSelect";
import { toast } from "./ui/Toast";

interface Props {
  open: boolean;
  deal: Deal | null;
  year: number;
  team: string[];
  clients: Client[];
  onSave: (d: Deal) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onClose: () => void;
}

// Opportunities live pre-Kontrak — once a deal is formalized as a signed
// contract it belongs in the "Kontrak" section (sourced from RevenueLine),
// not here, so Kontrak is deliberately excluded from this stage picker.
const OPP_STAGES = [...STAGES, "On Hold", "Dropped"];

const PRODUCT_CATEGORIES = ["Solution", "Talent", "License", "Support", "IBM"] as const;
const IBM_PRODUCTS = ["IBM Filenet", "IBM MQ", "IBM BAW", "IBM BOB", "IBM Cloud Pak for Integration"] as const;

function parseProduct(product: string) {
  const ibmMatch = IBM_PRODUCTS.find(p => product === p);
  if (ibmMatch) return { category: "IBM", sub: ibmMatch };
  const cat = PRODUCT_CATEGORIES.find(c => c !== "IBM" && c === product);
  return { category: cat || "", sub: "" };
}

function emptyOpp(year: number, clientId: string): Deal {
  return {
    id: uuid(), name: "", client_id: clientId, value: 0, stage: "Approching",
    deal_type: "", product: "", close_date: "", notes: "", owner: "",
    win_loss_reason: "", competitor: "",
    year, category: "L", potentially_billed_amount: 0, potentially_billed_percent: 0,
    team: "", pmo: "", plan: "", presales: "", sales: "", archived: false,
  };
}

export default function DealOpportunityModal({ open, deal, year, team, clients, onSave, onDelete, onClose }: Props) {
  const isEdit = !!deal;
  const [form, setForm] = useState<Deal>(emptyOpp(year, ""));
  const [valueDisplay, setValueDisplay] = useState("");
  const [billedDisplay, setBilledDisplay] = useState("");
  const [productCat, setProductCat] = useState("");
  const [ibmSub, setIbmSub] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const base = deal || emptyOpp(year, "");
    setForm(base);
    setValueDisplay(base.value ? base.value.toLocaleString("id-ID") : "");
    setBilledDisplay(base.potentially_billed_amount ? base.potentially_billed_amount.toLocaleString("id-ID") : "");
    const { category, sub } = parseProduct(base.product || "");
    setProductCat(category);
    setIbmSub(sub);
  // Re-init only when the modal opens or a different deal is opened.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deal?.id, open]);

  const set = <K extends keyof Deal>(k: K, v: Deal[K]) => setForm(f => ({ ...f, [k]: v }));

  function handleProductCatChange(cat: string) {
    setProductCat(cat);
    setIbmSub("");
    setForm(f => ({ ...f, product: cat === "IBM" ? "" : cat }));
  }

  function handleIbmSubChange(sub: string) {
    setIbmSub(sub);
    setForm(f => ({ ...f, product: sub }));
  }

  async function handleSave() {
    if (!form.name.trim()) { toast("Nama project wajib diisi.", { type: "error" }); return; }
    if (!form.client_id) { toast("Client wajib dipilih.", { type: "error" }); return; }
    setSaving(true);
    try {
      await onSave(form);
      onClose();
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!confirm("Hapus opportunity ini?")) return;
    await onDelete(form.id);
    onClose();
  }

  const needsReason = form.stage === "Dropped" || form.stage === "On Hold";

  return (
    <Modal open={open} onClose={onClose} title={isEdit ? "Edit Opportunity" : "Tambah Opportunity"}>
      <Field label="Nama Project">
        <input className={inputCls} value={form.name} onChange={e => set("name", e.target.value)} placeholder="Mis. SMBCI - IBM MQ Annual Support" />
      </Field>
      <Field label="Client">
        <SearchableSelect
          options={clients.map(c => ({ value: c.id, label: c.name }))}
          value={form.client_id}
          onChange={v => set("client_id", v)}
          placeholder="Cari client…"
        />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Kategori (H/M/L)">
          <select className={selectCls} value={form.category} onChange={e => set("category", e.target.value)}>
            {REVENUE_OPP_CATEGORIES.map(c => <option key={c}>{c}</option>)}
          </select>
        </Field>
        <Field label="Stage">
          <select className={selectCls} value={form.stage} onChange={e => set("stage", e.target.value as Deal["stage"])}>
            {OPP_STAGES.map(s => <option key={s}>{s}</option>)}
          </select>
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Nilai Project">
          <div style={{ position: "relative" }}>
            <span style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", fontSize: 12, color: "var(--ink-soft)", pointerEvents: "none" }}>IDR</span>
            <input
              className={inputCls} style={{ paddingLeft: 38 }} inputMode="numeric" value={valueDisplay}
              onChange={e => {
                const raw = e.target.value.replace(/\D/g, "");
                const num = parseInt(raw, 10) || 0;
                setValueDisplay(raw ? num.toLocaleString("id-ID") : "");
                setForm(f => ({ ...f, value: num }));
              }}
              placeholder="0"
            />
          </div>
        </Field>
        <Field label="Target Closing">
          <input type="date" className={inputCls} value={form.close_date || ""} onChange={e => set("close_date", e.target.value)} />
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Owner (Sales)">
          <select className={selectCls} value={form.owner} onChange={e => set("owner", e.target.value)}>
            <option value="">— Pilih —</option>
            {team.map(t => <option key={t}>{t}</option>)}
          </select>
        </Field>
        <Field label="Product">
          <select className={selectCls} value={productCat} onChange={e => handleProductCatChange(e.target.value)}>
            <option value="">— Pilih —</option>
            {PRODUCT_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          {productCat === "IBM" && (
            <select className={selectCls} style={{ marginTop: 6 }} value={ibmSub} onChange={e => handleIbmSubChange(e.target.value)}>
              <option value="">— Pilih Produk IBM —</option>
              {IBM_PRODUCTS.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          )}
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

      {needsReason && (
        <Field label={`Alasan ${form.stage}`}>
          <textarea className={textareaCls} value={form.win_loss_reason} onChange={e => set("win_loss_reason", e.target.value)}
            placeholder="Mis. Tidak ada budget, kalah harga, dll." />
        </Field>
      )}

      <Field label="Catatan">
        <textarea className={textareaCls} value={form.notes} onChange={e => set("notes", e.target.value)} />
      </Field>

      {isEdit && (
        <Field label="Arsip">
          <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, cursor: "pointer" }}>
            <input type="checkbox" checked={!!form.archived} onChange={e => set("archived", e.target.checked)} />
            Kecualikan dari Win Rate / Pipeline Aktif di Dashboard (data historis)
          </label>
        </Field>
      )}

      <ModalActions>
        {isEdit && <button className="btn btn-danger" onClick={handleDelete} disabled={saving}>Hapus</button>}
        <button className="btn btn-ghost" onClick={onClose}>Batal</button>
        <button className="btn" onClick={handleSave} disabled={saving}>{saving && <span className="btn-spinner" />}{saving ? "Menyimpan…" : "Simpan"}</button>
      </ModalActions>
    </Modal>
  );
}
