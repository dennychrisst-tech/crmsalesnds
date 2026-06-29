"use client";
import { useState, useEffect } from "react";
import { v4 as uuid } from "uuid";
import Modal, { Field, inputCls, selectCls, textareaCls, ModalActions } from "./ui/Modal";
import { Visit, Client } from "@/types";
import { VISIT_STATUS, todayStr } from "@/lib/utils";

interface Props {
  open: boolean;
  visit: Visit | null;
  preClientId?: string;
  clients: Client[];
  onSave: (v: Visit) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onClose: () => void;
}

export default function VisitModal({ open, visit, preClientId, clients, onSave, onDelete, onClose }: Props) {
  const isEdit = !!visit;
  const [form, setForm] = useState<Visit>({
    id: "", client_id: "", date: todayStr(), purpose: "", approach: "",
    status: "Planned", pic: "Denny", summary: "",
  });

  useEffect(() => {
    if (visit) {
      setForm(visit);
    } else {
      setForm({
        id: uuid(), client_id: preClientId || clients[0]?.id || "",
        date: todayStr(), purpose: "", approach: "", status: "Planned", pic: "Denny", summary: "",
      });
    }
  }, [visit, preClientId, clients, open]);

  const set = (k: keyof Visit, v: string) => setForm(f => ({ ...f, [k]: v }));

  async function handleSave() {
    await onSave(form);
    onClose();
  }

  async function handleDelete() {
    if (!confirm("Hapus visit ini?")) return;
    await onDelete(form.id);
    onClose();
  }

  return (
    <Modal open={open} onClose={onClose} title={`${isEdit ? "Edit" : "Jadwalkan"} Visit`}>
      <Field label="Client">
        <select className={selectCls} value={form.client_id} onChange={e => set("client_id", e.target.value)}>
          {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Tanggal approach">
          <input type="date" className={inputCls} value={form.date} onChange={e => set("date", e.target.value)} />
        </Field>
        <Field label="Status">
          <select className={selectCls} value={form.status} onChange={e => set("status", e.target.value as Visit["status"])}>
            {VISIT_STATUS.map(s => <option key={s}>{s}</option>)}
          </select>
        </Field>
      </div>
      <Field label="Jenis approach">
        <input className={inputCls} value={form.approach} onChange={e => set("approach", e.target.value)} placeholder="First meeting / Follow-up / Demo / Negotiation" />
      </Field>
      <Field label="Tujuan visit">
        <input className={inputCls} value={form.purpose} onChange={e => set("purpose", e.target.value)} placeholder="Mis. business introduction, review SLA" />
      </Field>
      <Field label="PIC NDS">
        <input className={inputCls} value={form.pic} onChange={e => set("pic", e.target.value)} />
      </Field>
      <Field label="Summary / hasil">
        <textarea className={textareaCls} value={form.summary} onChange={e => set("summary", e.target.value)} placeholder="Ringkasan hasil pertemuan & next step" />
      </Field>
      <ModalActions>
        {isEdit && <button className="btn btn-danger" onClick={handleDelete}>Hapus</button>}
        <button className="btn btn-ghost" onClick={onClose}>Batal</button>
        <button className="btn" onClick={handleSave}>Simpan</button>
      </ModalActions>
    </Modal>
  );
}
