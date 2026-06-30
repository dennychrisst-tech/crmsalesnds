"use client";
import { useState, useEffect } from "react";
import { v4 as uuid } from "uuid";
import Modal, { Field, inputCls, selectCls, textareaCls, ModalActions } from "./ui/Modal";
import { Visit, Client, PIC } from "@/types";
import { VISIT_STATUS, todayStr } from "@/lib/utils";

interface Props {
  open: boolean;
  visit: Visit | null;
  preClientId?: string;
  clients: Client[];
  team: string[];
  defaultPic?: string;
  onSave: (v: Visit) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onClose: () => void;
}

function emptyVisit(clientId: string, defaultPic = ""): Visit {
  return {
    id: uuid(), client_id: clientId, date: todayStr(),
    purpose: "", approach: "", status: "Planned",
    pic: defaultPic, pic_client: "", summary: "",
  };
}

function getPics(clients: Client[], clientId: string): PIC[] {
  const client = clients.find(c => c.id === clientId);
  if (!client) return [];
  return (Array.isArray(client.pic) ? client.pic : []).filter((p: PIC) => p.name?.trim());
}

export default function VisitModal({ open, visit, preClientId, clients, team, defaultPic = "", onSave, onDelete, onClose }: Props) {
  const isEdit = !!visit;
  const [form, setForm] = useState<Visit>(emptyVisit(clients[0]?.id || "", defaultPic));

  useEffect(() => {
    if (visit) {
      setForm(visit);
    } else {
      setForm(emptyVisit(preClientId || clients[0]?.id || "", defaultPic));
    }
  }, [visit, preClientId, clients, open, defaultPic]);

  const set = (k: keyof Visit, v: string) => setForm(f => ({ ...f, [k]: v }));

  function handleClientChange(clientId: string) {
    const pics = getPics(clients, clientId);
    setForm(f => ({ ...f, client_id: clientId, pic_client: pics.length > 0 ? pics[0].name : "" }));
  }

  async function handleSave() {
    await onSave(form);
    onClose();
  }

  async function handleDelete() {
    if (!confirm("Hapus visit ini?")) return;
    await onDelete(form.id);
    onClose();
  }

  const clientPics = getPics(clients, form.client_id);

  return (
    <Modal open={open} onClose={onClose} title={`${isEdit ? "Edit" : "Jadwalkan"} Visit`}>
      <Field label="Client">
        <select className={selectCls} value={form.client_id} onChange={e => handleClientChange(e.target.value)}>
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
      <div className="grid grid-cols-2 gap-3">
        <Field label="PIC Client yang dikunjungi">
          {clientPics.length > 0 ? (
            <select className={selectCls} value={form.pic_client} onChange={e => set("pic_client", e.target.value)}>
              <option value="">— Pilih PIC —</option>
              {clientPics.map(p => (
                <option key={p.name} value={p.name}>
                  {p.name}{p.phone ? ` (${p.phone})` : ""}
                </option>
              ))}
            </select>
          ) : (
            <input className={inputCls} value={form.pic_client} onChange={e => set("pic_client", e.target.value)} placeholder="Nama kontak di client" />
          )}
        </Field>
        <Field label="PIC NDS (sales)">
          <select className={selectCls} value={form.pic} onChange={e => set("pic", e.target.value)}>
            <option value="">— Pilih —</option>
            {team.map(t => <option key={t}>{t}</option>)}
          </select>
        </Field>
      </div>
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
