"use client";
import { useState, useEffect } from "react";
import { v4 as uuid } from "uuid";
import Modal, { Field, inputCls, selectCls, textareaCls, ModalActions } from "./ui/Modal";
import { Product } from "@/types";
import { PRODUCT_CATEGORIES } from "@/lib/utils";

interface Props {
  open: boolean;
  product: Product | null;
  onSave: (p: Product) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onClose: () => void;
}

const empty = (): Product => ({ id: uuid(), name: "", category: "ECM / BPM", description: "" });

export default function ProductModal({ open, product, onSave, onDelete, onClose }: Props) {
  const isEdit = !!product;
  const [form, setForm] = useState<Product>(empty());

  useEffect(() => { setForm(product || empty()); }, [product, open]);

  const set = <K extends keyof Product>(k: K, v: Product[K]) => setForm(f => ({ ...f, [k]: v }));

  async function handleSave() {
    if (!form.name.trim()) { alert("Nama produk wajib diisi."); return; }
    await onSave(form);
    onClose();
  }

  async function handleDelete() {
    if (!confirm("Hapus produk ini dari catalog?")) return;
    await onDelete(form.id);
    onClose();
  }

  return (
    <Modal open={open} onClose={onClose} title={`${isEdit ? "Edit" : "Tambah"} Produk / Solusi`}>
      <Field label="Nama produk / solusi">
        <input className={inputCls} value={form.name} onChange={e => set("name", e.target.value)} placeholder="IBM BAW, watsonx, IBM FileNet…" />
      </Field>
      <Field label="Kategori">
        <select className={selectCls} value={form.category} onChange={e => set("category", e.target.value)}>
          {PRODUCT_CATEGORIES.map(c => <option key={c}>{c}</option>)}
        </select>
      </Field>
      <Field label="Deskripsi">
        <textarea className={textareaCls} value={form.description} onChange={e => set("description", e.target.value)} placeholder="Singkat tentang produk ini…" />
      </Field>
      <ModalActions>
        {isEdit && <button className="btn btn-danger" onClick={handleDelete}>Hapus</button>}
        <button className="btn btn-ghost" onClick={onClose}>Batal</button>
        <button className="btn" onClick={handleSave}>Simpan</button>
      </ModalActions>
    </Modal>
  );
}
