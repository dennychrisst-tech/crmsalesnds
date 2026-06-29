"use client";
import { useState, useEffect } from "react";
import { v4 as uuid } from "uuid";
import Modal, { Field, inputCls, selectCls, textareaCls, ModalActions } from "./ui/Modal";
import { Deal, Client } from "@/types";
import { STAGES } from "@/lib/utils";

interface Props {
  open: boolean;
  deal: Deal | null;
  clients: Client[];
  onSave: (d: Deal) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onClose: () => void;
}

export default function DealModal({ open, deal, clients, onSave, onDelete, onClose }: Props) {
  const isEdit = !!deal;
  const [form, setForm] = useState<Deal>({ id: "", name: "", client_id: "", value: 0, stage: "Lead", product: "", close_date: "", notes: "" });

  useEffect(() => {
    setForm(deal || { id: uuid(), name: "", client_id: clients[0]?.id || "", value: 0, stage: "Lead", product: "", close_date: "", notes: "" });
  }, [deal, clients, open]);

  const set = (k: keyof Deal, v: string | number) => setForm(f => ({ ...f, [k]: v }));

  async function handleSave() {
    if (!form.name.trim()) { alert("Nama deal wajib diisi."); return; }
    await onSave(form);
    onClose();
  }

  async function handleDelete() {
    if (!confirm("Hapus deal ini?")) return;
    await onDelete(form.id);
    onClose();
  }

  return (
    <Modal open={open} onClose={onClose} title={`${isEdit ? "Edit" : "Tambah"} Deal`}>
      <Field label="Nama deal">
        <input className={inputCls} value={form.name} onChange={e => set("name", e.target.value)} />
      </Field>
      <Field label="Client">
        <select className={selectCls} value={form.client_id} onChange={e => set("client_id", e.target.value)}>
          {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Stage">
          <select className={selectCls} value={form.stage} onChange={e => set("stage", e.target.value as Deal["stage"])}>
            {[...STAGES, "Lost"].map(s => <option key={s}>{s}</option>)}
          </select>
        </Field>
        <Field label="Nilai (Rp)">
          <input type="number" className={inputCls} value={form.value} onChange={e => set("value", +e.target.value)} />
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Produk / solusi">
          <input className={inputCls} value={form.product} onChange={e => set("product", e.target.value)} placeholder="IBM BAW, watsonx, QRadar…" />
        </Field>
        <Field label="Target closing">
          <input type="date" className={inputCls} value={form.close_date} onChange={e => set("close_date", e.target.value)} />
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
