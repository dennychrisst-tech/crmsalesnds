"use client";
import { useState, useEffect } from "react";
import { v4 as uuid } from "uuid";
import Modal, { Field, inputCls, selectCls, textareaCls, ModalActions } from "./ui/Modal";
import { Client } from "@/types";
import { SECTORS } from "@/lib/utils";

interface Props {
  open: boolean;
  client: Client | null;
  onSave: (c: Client) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onClose: () => void;
}

export default function ClientModal({ open, client, onSave, onDelete, onClose }: Props) {
  const isEdit = !!client;
  const [form, setForm] = useState<Client>({ id: "", name: "", sector: "Banking", pic: "", contact: "", status: "Prospect", notes: "" });

  useEffect(() => {
    setForm(client || { id: uuid(), name: "", sector: "Banking", pic: "", contact: "", status: "Prospect", notes: "" });
  }, [client, open]);

  const set = (k: keyof Client, v: string) => setForm(f => ({ ...f, [k]: v }));

  async function handleSave() {
    if (!form.name.trim()) { alert("Nama client wajib diisi."); return; }
    await onSave(form);
    onClose();
  }

  async function handleDelete() {
    if (!confirm("Hapus client ini?")) return;
    await onDelete(form.id);
    onClose();
  }

  return (
    <Modal open={open} onClose={onClose} title={`${isEdit ? "Edit" : "Tambah"} Client`}>
      <Field label="Nama client">
        <input className={inputCls} value={form.name} onChange={e => set("name", e.target.value)} />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Sektor">
          <select className={selectCls} value={form.sector} onChange={e => set("sector", e.target.value as Client["sector"])}>
            {SECTORS.map(s => <option key={s}>{s}</option>)}
          </select>
        </Field>
        <Field label="Status">
          <input className={inputCls} value={form.status} onChange={e => set("status", e.target.value)} placeholder="Prospect / Active / Inactive" />
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="PIC">
          <input className={inputCls} value={form.pic} onChange={e => set("pic", e.target.value)} />
        </Field>
        <Field label="Kontak">
          <input className={inputCls} value={form.contact} onChange={e => set("contact", e.target.value)} />
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
