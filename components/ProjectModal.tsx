"use client";
import { useState, useEffect } from "react";
import { v4 as uuid } from "uuid";
import Modal, { Field, inputCls, selectCls, textareaCls, ModalActions } from "./ui/Modal";
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

const PRODUCT_CATEGORIES = ["Solution", "Talent", "License", "IBM"] as const;
const IBM_PRODUCTS = ["IBM Filenet", "IBM MQ", "IBM BAW", "IBM BOB"] as const;

function parseProduct(product: string) {
  const ibmMatch = IBM_PRODUCTS.find(p => product === p);
  if (ibmMatch) return { category: "IBM", sub: ibmMatch };
  const cat = PRODUCT_CATEGORIES.find(c => c !== "IBM" && c === product);
  return { category: cat || "", sub: "" };
}

export default function ProjectModal({ open, project, clients, onSave, onDelete, onClose }: Props) {
  const isEdit = !!project;
  const [form, setForm] = useState<Project>({ id: "", name: "", client_id: "", product: "", status: "Initiation", value: 0, golive: "", notes: "" });
  const [productCat, setProductCat] = useState("");
  const [ibmSub, setIbmSub] = useState("");

  useEffect(() => {
    const base = project || { id: uuid(), name: "", client_id: clients[0]?.id || "", product: "", status: "Initiation", value: 0, golive: "", notes: "" };
    setForm(base);
    const { category, sub } = parseProduct(base.product || "");
    setProductCat(category);
    setIbmSub(sub);
  }, [project, clients, open]);

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
        <select className={selectCls} value={form.client_id} onChange={e => set("client_id", e.target.value)}>
          {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Status">
          <select className={selectCls} value={form.status} onChange={e => set("status", e.target.value as Project["status"])}>
            {PROJ_STATUS.map(s => <option key={s}>{s}</option>)}
          </select>
        </Field>
        <Field label="Nilai (Rp)">
          <input type="number" className={inputCls} value={form.value} onChange={e => set("value", +e.target.value)} />
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
        <Field label="Target go-live">
          <input type="date" className={inputCls} value={form.golive} onChange={e => set("golive", e.target.value)} />
        </Field>
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
