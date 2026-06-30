"use client";
import { useState, useEffect } from "react";
import { v4 as uuid } from "uuid";
import Modal, { Field, inputCls, selectCls, textareaCls, ModalActions } from "./ui/Modal";
import { CalendarEvent } from "@/types";
import { EVENT_TYPES, todayStr } from "@/lib/utils";

interface Props {
  open: boolean;
  event: CalendarEvent | null;
  preDate?: string;
  team: string[];
  onSave: (e: CalendarEvent) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onClose: () => void;
}

function emptyEvent(date?: string): CalendarEvent {
  return { id: uuid(), title: "", date: date || todayStr(), type: "Meeting Online", description: "", created_by: "" };
}

function parseMembers(s: string): string[] {
  return s.split(",").map(x => x.trim()).filter(Boolean);
}

function joinMembers(arr: string[]): string {
  return arr.join(", ");
}

export default function EventModal({ open, event, preDate, team, onSave, onDelete, onClose }: Props) {
  const isEdit = !!event;
  const [form, setForm] = useState<CalendarEvent>(emptyEvent(preDate));
  const [selected, setSelected] = useState<string[]>([]);

  useEffect(() => {
    const base = event || emptyEvent(preDate);
    setForm(base);
    setSelected(parseMembers(base.created_by));
  }, [event, preDate, open]);

  const set = (k: keyof CalendarEvent, v: string) => setForm(f => ({ ...f, [k]: v }));

  function toggleMember(name: string) {
    const next = selected.includes(name)
      ? selected.filter(x => x !== name)
      : [...selected, name];
    setSelected(next);
    setForm(f => ({ ...f, created_by: joinMembers(next) }));
  }

  async function handleSave() {
    if (!form.title.trim()) { alert("Judul event wajib diisi."); return; }
    await onSave({ ...form, created_by: joinMembers(selected) });
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

      <Field label="Peserta (Tim Sales)">
        <div className="member-grid">
          {team.map(name => {
            const active = selected.includes(name);
            return (
              <button
                key={name}
                type="button"
                className={`member-chip${active ? " member-chip-active" : ""}`}
                onClick={() => toggleMember(name)}
              >
                <span className="member-avatar">{name[0]}</span>
                {name}
                {active && <span className="member-check">✓</span>}
              </button>
            );
          })}
        </div>
        {selected.length > 0 && (
          <div className="member-summary">
            Dipilih: <strong>{joinMembers(selected)}</strong>
          </div>
        )}
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
