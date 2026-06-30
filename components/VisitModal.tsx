"use client";
import { useState, useEffect } from "react";
import { v4 as uuid } from "uuid";
import Modal, { Field, inputCls, selectCls, textareaCls, ModalActions } from "./ui/Modal";
import { Visit, Client, Contact } from "@/types";
import { VISIT_STATUS, todayStr } from "@/lib/utils";

interface Props {
  open: boolean;
  visit: Visit | null;
  preClientId?: string;
  preDate?: string;
  clients: Client[];
  contacts: Contact[];
  team: string[];
  defaultPic?: string;
  onSave: (v: Visit) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onClose: () => void;
}

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + "T00:00:00");
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function emptyVisit(clientId: string, defaultPic = "", date = todayStr()): Visit {
  return {
    id: uuid(), client_id: clientId, project: null, date,
    purpose: "", approach: "", status: "Planned",
    pic: defaultPic, pic_client: "", jabatan: "",
    followup_date: addDays(date, 7), summary: "",
  };
}

export default function VisitModal({ open, visit, preClientId, preDate, clients, contacts, team, defaultPic = "", onSave, onDelete, onClose }: Props) {
  const isEdit = !!visit;
  const [form, setForm] = useState<Visit>(emptyVisit(clients[0]?.id || "", defaultPic));

  useEffect(() => {
    if (visit) {
      const date = visit.date || todayStr();
      setForm({
        ...visit,
        jabatan: visit.jabatan ?? "",
        project: visit.project ?? null,
        followup_date: visit.followup_date ?? addDays(date, 7),
      });
    } else {
      setForm(emptyVisit(preClientId || clients[0]?.id || "", defaultPic, preDate || todayStr()));
    }
  }, [visit, preClientId, preDate, clients, open, defaultPic]);

  const set = (k: keyof Visit, v: string | null) => setForm(f => ({ ...f, [k]: v }));

  const clientContacts = contacts.filter(c => c.client_id === form.client_id);

  function handleClientChange(clientId: string) {
    setForm(f => ({ ...f, client_id: clientId, pic_client: "", jabatan: "", project: null }));
  }

  function handleContactChange(name: string) {
    const contact = clientContacts.find(c => c.name === name);
    setForm(f => ({ ...f, pic_client: name, jabatan: contact?.title || f.jabatan }));
  }

  async function handleSave() {
    if (!form.date) { alert("Tanggal approach wajib diisi."); return; }
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
        <select className={selectCls} value={form.client_id} onChange={e => handleClientChange(e.target.value)}>
          {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </Field>

      <Field label="Project (opsional)">
        <input className={inputCls} value={form.project || ""} onChange={e => set("project", e.target.value || null)} placeholder="Nama project (opsional)" />
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Tanggal approach">
          <input type="date" className={inputCls} value={form.date} onChange={e => {
            const newDate = e.target.value;
            setForm(f => ({
              ...f, date: newDate,
              followup_date: f.followup_date ? f.followup_date : addDays(newDate, 7),
            }));
          }} />
        </Field>
        <Field label="Status">
          <select className={selectCls} value={form.status} onChange={e => set("status", e.target.value as Visit["status"])}>
            {VISIT_STATUS.map(s => <option key={s}>{s}</option>)}
          </select>
        </Field>
      </div>

      <Field label="Tanggal follow-up (default 1 minggu)">
        <input type="date" className={inputCls} value={form.followup_date || ""} onChange={e => set("followup_date", e.target.value || null)} />
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="PIC Client yang dikunjungi">
          {clientContacts.length > 0 ? (
            <select className={selectCls} value={form.pic_client} onChange={e => handleContactChange(e.target.value)}>
              <option value="">— Pilih kontak —</option>
              {clientContacts.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
              <option value="__other__">Lainnya (isi manual)</option>
            </select>
          ) : (
            <input className={inputCls} value={form.pic_client} onChange={e => set("pic_client", e.target.value)} placeholder="Nama kontak di client" />
          )}
          {clientContacts.length > 0 && form.pic_client === "__other__" && (
            <input className={inputCls} style={{ marginTop: 6 }} onChange={e => set("pic_client", e.target.value)} placeholder="Nama kontak (manual)" />
          )}
        </Field>
        <Field label="Jabatan">
          <input className={inputCls} value={form.jabatan || ""} onChange={e => set("jabatan", e.target.value)} placeholder="Mis. IT Manager, Direktur" />
        </Field>
      </div>

      <Field label="PIC NDS (sales)">
        <select className={selectCls} value={form.pic} onChange={e => set("pic", e.target.value)}>
          <option value="">— Pilih —</option>
          {team.map(t => <option key={t}>{t}</option>)}
        </select>
      </Field>

      <Field label="Jenis approach">
        <input className={inputCls} value={form.approach} onChange={e => set("approach", e.target.value)} placeholder="First meeting / Follow-up / Demo / Negotiation" />
      </Field>
      <Field label="Tujuan visit">
        <input className={inputCls} value={form.purpose} onChange={e => set("purpose", e.target.value)} placeholder="Mis. business introduction, review SLA" />
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
