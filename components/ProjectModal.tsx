"use client";
import { useState, useEffect } from "react";
import { v4 as uuid } from "uuid";
import Modal, { Field, inputCls, selectCls, textareaCls, ModalActions } from "./ui/Modal";
import SearchableSelect from "./ui/SearchableSelect";
import { Project, Client } from "@/types";
import { PROJ_STATUS } from "@/lib/utils";

interface Props {
  open: boolean;
  project: Project | null;
  clients: Client[];
  onSave: (p: Project) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onClose: () => void;
}

const PRODUCT_CATEGORIES = ["Solution", "Talent", "License", "Support", "IBM"] as const;
const IBM_PRODUCTS = ["IBM Filenet", "IBM MQ", "IBM BAW", "IBM BOB", "IBM Cloud Pak for Integration"] as const;

function parseProduct(product: string) {
  const ibmMatch = IBM_PRODUCTS.find(p => product === p);
  if (ibmMatch) return { category: "IBM", sub: ibmMatch };
  const cat = PRODUCT_CATEGORIES.find(c => c !== "IBM" && c === product);
  return { category: cat || "", sub: "" };
}

function fmtIDR(num: number): string {
  if (!num) return "";
  return num.toLocaleString("id-ID");
}

function emptyProject(): Project {
  return { id: uuid(), name: "", client_id: "", product: "", status: "Initiation", value: 0, golive: "", notes: "", partner: "" };
}

export default function ProjectModal({ open, project, clients, onSave, onDelete, onClose }: Props) {
  const isEdit = !!project;
  const [form, setForm] = useState<Project>(emptyProject());
  const [valueDisplay, setValueDisplay] = useState("");
  const [productCat, setProductCat] = useState("");
  const [ibmSub, setIbmSub] = useState("");

  useEffect(() => {
    const base = project || emptyProject();
    setForm(base);
    setValueDisplay(fmtIDR(base.value || 0));
    const { category, sub } = parseProduct(base.product || "");
    setProductCat(category);
    setIbmSub(sub);
  // Re-init only when the modal opens or a different project is opened — the
  // clients array is replaced by background polling and must not wipe edits.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project?.id, open]);

  const set = (k: keyof Project, v: string | number) => setForm(f => ({ ...f, [k]: v }));

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
    if (!form.name.trim()) { alert("Nama project wajib diisi."); return; }
    if (!form.client_id) { alert("Client wajib dipilih."); return; }
    await onSave(form);
    onClose();
  }

  async function handleDelete() {
    if (!confirm("Hapus project ini?")) return;
    await onDelete(form.id);
    onClose();
  }

  return (
    <Modal open={open} onClose={onClose} title={`${isEdit ? "Edit" : "Tambah"} Project`}>
      <Field label="Nama project">
        <input className={inputCls} value={form.name} onChange={e => set("name", e.target.value)} />
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
        <Field label="Status">
          <select className={selectCls} value={form.status} onChange={e => set("status", e.target.value as Project["status"])}>
            {PROJ_STATUS.map(s => <option key={s}>{s}</option>)}
          </select>
        </Field>
        <Field label="Nilai Project">
          <div style={{ position: "relative" }}>
            <span style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", fontSize: 12, color: "var(--ink-soft)", pointerEvents: "none" }}>IDR</span>
            <input
              className={inputCls}
              style={{ paddingLeft: 38 }}
              inputMode="numeric"
              value={valueDisplay}
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
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Produk / solusi">
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
        {form.status !== "Delivered" && (
          <Field label="Target go-live">
            <input type="date" className={inputCls} value={form.golive} onChange={e => set("golive", e.target.value)} />
          </Field>
        )}
      </div>
      <Field label="Partner (opsional)">
        <SearchableSelect
          options={clients.filter(c => c.id !== form.client_id).map(c => ({ value: c.name, label: c.name }))}
          value={form.partner || ""}
          onChange={v => set("partner", v)}
          placeholder="Cari partner…"
          clearLabel="— Tidak ada partner —"
        />
      </Field>
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
