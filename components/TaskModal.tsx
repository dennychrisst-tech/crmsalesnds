"use client";
import { useState, useEffect } from "react";
import { v4 as uuid } from "uuid";
import Modal, { Field, inputCls, selectCls, textareaCls, ModalActions } from "./ui/Modal";
import { Task, Client, Deal } from "@/types";
import { todayStr } from "@/lib/utils";

interface Props {
  open: boolean;
  task: Task | null;
  clients: Client[];
  deals: Deal[];
  team: string[];
  preClientId?: string;
  preDealId?: string;
  onSave: (t: Task) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onClose: () => void;
}

const empty = (): Task => ({
  id: uuid(), title: "", due_date: todayStr(),
  client_id: null, deal_id: null, assigned_to: "", status: "Open", notes: "",
});

export default function TaskModal({ open, task, clients, deals, team, preClientId, preDealId, onSave, onDelete, onClose }: Props) {
  const isEdit = !!task;
  const [form, setForm] = useState<Task>(empty());

  useEffect(() => {
    if (task) {
      setForm({ ...task });
    } else {
      setForm({ ...empty(), client_id: preClientId || null, deal_id: preDealId || null });
    }
  }, [task, preClientId, preDealId, open]);

  const set = <K extends keyof Task>(k: K, v: Task[K]) => setForm(f => ({ ...f, [k]: v }));

  async function handleSave() {
    if (!form.title.trim()) { alert("Judul task wajib diisi."); return; }
    await onSave(form);
    onClose();
  }

  async function handleDelete() {
    if (!confirm("Hapus task ini?")) return;
    await onDelete(form.id);
    onClose();
  }

  const clientDeals = form.client_id ? deals.filter(d => d.client_id === form.client_id) : deals;

  return (
    <Modal open={open} onClose={onClose} title={`${isEdit ? "Edit" : "Tambah"} Task`}>
      <Field label="Judul task">
        <input className={inputCls} value={form.title} onChange={e => set("title", e.target.value)} placeholder="Follow up proposal, kirim kontrak…" />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Deadline">
          <input type="date" className={inputCls} value={form.due_date} onChange={e => set("due_date", e.target.value)} />
        </Field>
        <Field label="Assigned to">
          <select className={selectCls} value={form.assigned_to} onChange={e => set("assigned_to", e.target.value)}>
            <option value="">— Pilih —</option>
            {team.map(t => <option key={t}>{t}</option>)}
          </select>
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Client (opsional)">
          <select className={selectCls} value={form.client_id || ""} onChange={e => set("client_id", e.target.value || null)}>
            <option value="">— Tidak ada —</option>
            {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </Field>
        <Field label="Deal (opsional)">
          <select className={selectCls} value={form.deal_id || ""} onChange={e => set("deal_id", e.target.value || null)}>
            <option value="">— Tidak ada —</option>
            {clientDeals.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
        </Field>
      </div>
      <Field label="Status">
        <select className={selectCls} value={form.status} onChange={e => set("status", e.target.value as Task["status"])}>
          <option value="Open">Open</option>
          <option value="Done">Done</option>
        </select>
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
