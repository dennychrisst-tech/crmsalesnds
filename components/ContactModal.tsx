"use client";
import { useState, useEffect } from "react";
import { v4 as uuid } from "uuid";
import Modal, { Field, inputCls, textareaCls, ModalActions } from "./ui/Modal";
import { Contact } from "@/types";

interface Props {
  open: boolean;
  contact: Contact | null;
  clientId: string;
  onSave: (c: Contact) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onClose: () => void;
}

function formatPhone(value: string): string {
  const digits = value.replace(/\D/g, "");
  if (!digits) return "";
  if (digits.startsWith("0")) {
    const rest = digits.slice(1);
    const parts = [rest.slice(0, 3), rest.slice(3, 7), rest.slice(7, 11)].filter(Boolean);
    return "0" + parts.join("-");
  }
  const parts = [digits.slice(0, 2), digits.slice(2, 6), digits.slice(6, 10)].filter(Boolean);
  return parts.join("-");
}

const empty = (clientId: string): Contact => ({ id: uuid(), client_id: clientId, name: "", title: "", email: "", phone: "", notes: "" });

export default function ContactModal({ open, contact, clientId, onSave, onDelete, onClose }: Props) {
  const isEdit = !!contact;
  const [form, setForm] = useState<Contact>(empty(clientId));

  useEffect(() => {
    setForm(contact ? { ...contact } : empty(clientId));
  }, [contact, clientId, open]);

  const set = <K extends keyof Contact>(k: K, v: Contact[K]) => setForm(f => ({ ...f, [k]: v }));

  async function handleSave() {
    if (!form.name.trim()) { alert("Nama kontak wajib diisi."); return; }
    await onSave(form);
    onClose();
  }

  async function handleDelete() {
    if (!confirm("Hapus kontak ini?")) return;
    await onDelete(form.id);
    onClose();
  }

  return (
    <Modal open={open} onClose={onClose} title={`${isEdit ? "Edit" : "Tambah"} Kontak`}>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Nama">
          <input className={inputCls} value={form.name} onChange={e => set("name", e.target.value)} />
        </Field>
        <Field label="Jabatan">
          <input className={inputCls} value={form.title} onChange={e => set("title", e.target.value)} placeholder="Sales Manager, IT Head…" />
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Email">
          <input type="email" className={inputCls} value={form.email} onChange={e => set("email", e.target.value)} />
        </Field>
        <Field label="No. Telepon">
          <input
            className={inputCls}
            value={formatPhone(form.phone)}
            onChange={e => set("phone", e.target.value.replace(/\D/g, ""))}
            placeholder="08xx-xxxx-xxxx"
            inputMode="tel"
          />
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
