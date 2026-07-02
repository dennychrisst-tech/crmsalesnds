"use client";
import { useState, useEffect } from "react";
import { v4 as uuid } from "uuid";
import Modal, { Field, inputCls, selectCls, textareaCls, ModalActions } from "./ui/Modal";
import SearchableSelect from "./ui/SearchableSelect";
import { Task, Client, Contact, Deal } from "@/types";
import { todayStr, picList } from "@/lib/utils";

interface Props {
  open: boolean;
  task: Task | null;
  clients: Client[];
  contacts: Contact[];
  deals: Deal[];
  team: string[];
  defaultAssignee?: string;
  preClientId?: string;
  preDealId?: string;
  onSave: (t: Task) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onCreateDeal?: (d: Deal) => Promise<void>;
  onClose: () => void;
}

const empty = (defaultAssignee = ""): Task => ({
  id: uuid(), title: "", due_date: todayStr(),
  client_id: null, deal_id: null, pic_client: "", assigned_to: defaultAssignee, status: "Open", notes: "",
});

export default function TaskModal({ open, task, clients, contacts, deals, team, defaultAssignee = "", preClientId, preDealId, onSave, onDelete, onCreateDeal, onClose }: Props) {
  const isEdit = !!task;
  const [form, setForm] = useState<Task>(empty(defaultAssignee));
  const [manualPic, setManualPic] = useState(false);

  useEffect(() => {
    if (task) {
      setForm({ ...task });
      const hasMatchingContact = contacts.some(c => c.client_id === task.client_id && c.name === task.pic_client);
      setManualPic(!!task.pic_client && !hasMatchingContact);
    } else {
      setForm({ ...empty(defaultAssignee), client_id: preClientId || null, deal_id: preDealId || null });
      setManualPic(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [task, preClientId, preDealId, open, defaultAssignee]);

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

  async function handleCreateDeal(name: string) {
    if (!onCreateDeal || !form.client_id) return;
    const id = uuid();
    await onCreateDeal({
      id, name, client_id: form.client_id, value: 0,
      stage: "Approching", deal_type: "", product: "", close_date: "",
      notes: "", owner: picList(form.assigned_to)[0] || "", win_loss_reason: "", competitor: "",
      stage_updated_at: new Date().toISOString(),
    });
    set("deal_id", id);
  }

  function handleClientChange(clientId: string) {
    setForm(f => ({ ...f, client_id: clientId || null, pic_client: "", deal_id: null }));
    setManualPic(false);
  }

  function handleContactChange(name: string) {
    setForm(f => ({ ...f, pic_client: name }));
  }

  const clientContacts = contacts.filter(c => c.client_id === form.client_id);
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
        <Field label="Client">
          <SearchableSelect
            options={clients.map(c => ({ value: c.id, label: c.name }))}
            value={form.client_id || ""}
            onChange={handleClientChange}
            placeholder="Cari client…"
            clearLabel="— Tidak ada —"
          />
        </Field>
        <Field label="Project">
          <SearchableSelect
            options={clientDeals.map(d => ({ value: d.id, label: d.name }))}
            value={form.deal_id || ""}
            onChange={v => set("deal_id", v || null)}
            placeholder="Cari atau buat project…"
            clearLabel="— Tidak ada —"
            onCreate={onCreateDeal && form.client_id ? handleCreateDeal : undefined}
            createLabel={q => `+ Buat project baru: "${q}"`}
          />
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="PIC Client">
          {clientContacts.length > 0 ? (
            <select
              className={selectCls}
              value={manualPic ? "__other__" : form.pic_client}
              onChange={e => {
                if (e.target.value === "__other__") {
                  setManualPic(true);
                  set("pic_client", "");
                } else {
                  setManualPic(false);
                  handleContactChange(e.target.value);
                }
              }}
            >
              <option value="">— Pilih kontak —</option>
              {clientContacts.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
              <option value="__other__">Lainnya (isi manual)</option>
            </select>
          ) : (
            <input className={inputCls} value={form.pic_client} onChange={e => set("pic_client", e.target.value)} placeholder="Nama kontak di client" />
          )}
          {clientContacts.length > 0 && manualPic && (
            <input className={inputCls} style={{ marginTop: 6 }} value={form.pic_client} onChange={e => set("pic_client", e.target.value)} placeholder="Nama kontak (manual)" />
          )}
        </Field>
        <Field label="Status">
          <select className={selectCls} value={form.status} onChange={e => set("status", e.target.value as Task["status"])}>
            <option value="Open">Open</option>
            <option value="Done">Done</option>
          </select>
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
