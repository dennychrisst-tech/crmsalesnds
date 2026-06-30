"use client";
import { useState, useEffect } from "react";
import { v4 as uuid } from "uuid";
import Modal, { Field, inputCls, selectCls, textareaCls, ModalActions } from "./ui/Modal";
import { CalendarEvent } from "@/types";
import { EVENT_TYPES, TEAM, todayStr } from "@/lib/utils";

interface Props {
  open: boolean;
  event: CalendarEvent | null;
  preDate?: string;
  onSave: (e: CalendarEvent) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onClose: () => void;
}

function emptyEvent(date?: string): CalendarEvent {
  return { id: uuid(), title: "", date: date || todayStr(), type: "Meeting Online", description: "", created_by: "" };
}

export default function EventModal({ open, event, preDate, onSave, onDelete, onClose }: Props) {
  const isEdit = !!event;
  const [form, setForm] = useState<CalendarEvent>(emptyEvent(preDate));

  useEffect(() => {
    setForm(event || emptyEvent(preDate));
  }, [event, preDate, open]);

  const set = (k: keyof CalendarEvent, v: string) => setForm(f => ({ ...f, [k]: v }));

  async function handleSave() {
    if (!form.title.trim()) { alert("Judul event wajib diisi."); return; }
    await onSave(form);
    onClose();
  }

  async function handleDelete() {
    if (!confirm("Hapus event ini?")) return;
    await onDelete(form.id);
    onClose();
  }

  return (
    <Modal open={open} onClose={onClose} title={`${isEdit ? "Edit" : "Tambah"} Event`}>
      <Field label="Judul">
        <input className={inputCls} value={form.title} onChange={e => set("title", e.target.value)} placeholder="Nama kegiatan" />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Tipe">
          <select className={selectCls} value={form.type} onChange={e => set("type", e.target.value)}>
            {EVENT_TYPES.map(t => <option key={t}>{t}</option>)}
          </select>
        </Field>
        <Field label="Tanggal">
          <input type="date" className={inputCls} value={form.date} onChange={e => set("date", e.target.value)} />
        </Field>
      </div>
      <Field label="Peserta / PIC">
        <select className={selectCls} value={form.created_by} onChange={e => set("created_by", e.target.value)}>
          <option value="">— Pilih —</option>
          {TEAM.map(t => <option key={t}>{t}</option>)}
        </select>
      </Field>
      <Field label="Keterangan">
        <textarea className={textareaCls} value={form.description} onChange={e => set("description", e.target.value)} placeholder="Detail lokasi, link meeting, agenda, dll." />
      </Field>
      <ModalActions>
        {isEdit && <button className="btn btn-danger" onClick={handleDelete}>Hapus</button>}
        <button className="btn btn-ghost" onClick={onClose}>Batal</button>
        <button className="btn" onClick={handleSave}>Simpan</button>
      </ModalActions>
    </Modal>
  );
}
