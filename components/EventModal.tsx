"use client";
import { useState, useEffect } from "react";
import { v4 as uuid } from "uuid";
import Modal, { Field, inputCls, selectCls, textareaCls, ModalActions } from "./ui/Modal";
import SearchableSelect from "./ui/SearchableSelect";
import { toast } from "./ui/Toast";
import { CalendarEvent, Client } from "@/types";
import { EVENT_TYPES, EVENT_STATUS, todayStr, fmtDate } from "@/lib/utils";

interface Props {
  open: boolean;
  event: CalendarEvent | null;
  preDate?: string;
  team: string[];
  clients: Client[];
  defaultMember?: string;
  onSave: (e: CalendarEvent) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onClose: () => void;
}

function emptyEvent(date?: string): CalendarEvent {
  return {
    id: uuid(), title: "", date: date || todayStr(), type: "Meeting Online", description: "",
    created_by: "", client_id: null, status: "Planned", followup_date: null,
  };
}

function parseMembers(s: string): string[] {
  return s.split(",").map(x => x.trim()).filter(Boolean);
}

function joinMembers(arr: string[]): string {
  return arr.join(", ");
}

export default function EventModal({ open, event, preDate, team, clients, defaultMember = "", onSave, onDelete, onClose }: Props) {
  const isEdit = !!event;
  const [form, setForm] = useState<CalendarEvent>(emptyEvent(preDate));
  const [selected, setSelected] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState<"detail" | "edit">("edit");

  const clientName = (id: string | null) => id ? (clients.find(c => c.id === id)?.name || "—") : "—";

  // Re-init only when the modal opens or a different event is opened — not on
  // every background poll (see VisitModal/ProjectModal for the same fix).
  useEffect(() => {
    const base = event || emptyEvent(preDate);
    setForm({
      ...base, client_id: base.client_id ?? null,
      // Events saved before the status column existed come back with status undefined
      status: base.status || "Planned", followup_date: base.followup_date ?? null,
    });
    const members = parseMembers(base.created_by);
    // Auto-select current user when creating a new event
    setSelected(event ? members : (defaultMember && !members.includes(defaultMember) ? [defaultMember] : members));
    setTab(event ? "detail" : "edit");
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [event?.id, preDate, open]);

  const set = (k: keyof CalendarEvent, v: string | null) => setForm(f => ({ ...f, [k]: v }));

  function toggleMember(name: string) {
    const next = selected.includes(name)
      ? selected.filter(x => x !== name)
      : [...selected, name];
    setSelected(next);
    setForm(f => ({ ...f, created_by: joinMembers(next) }));
  }

  async function handleSave() {
    if (!form.title.trim()) { toast("Judul event wajib diisi.", { type: "error" }); return; }
    setSaving(true);
    try {
      await onSave({ ...form, created_by: joinMembers(selected) });
      onClose();
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!confirm("Hapus event ini?")) return;
    await onDelete(form.id);
    onClose();
  }

  const tabCls = (t: string) => `modal-tab${tab === t ? " modal-tab-active" : ""}`;

  return (
    <Modal open={open} onClose={onClose} title={isEdit ? (tab === "detail" ? "Detail Event" : "Edit Event") : "Tambah Event"}>
      {isEdit && (
        <div className="modal-tabs">
          <button className={tabCls("detail")} onClick={() => setTab("detail")}>Detail</button>
          <button className={tabCls("edit")} onClick={() => setTab("edit")}>Edit</button>
        </div>
      )}

      {isEdit && tab === "detail" && (
        <>
          <div className="dd-title-row">
            <div>
              <div className="dd-name">{form.title}</div>
              <div className="dd-client">{form.type}{form.client_id ? ` · ${clientName(form.client_id)}` : ""}</div>
            </div>
            <span className="badge">{form.status}</span>
          </div>
          <div className="dd-grid">
            <div className="dd-item"><div className="dd-label">Tanggal</div><div className="dd-value">{fmtDate(form.date)}</div></div>
            {form.status === "Reschedule" && (
              <div className="dd-item"><div className="dd-label">Tanggal Baru</div><div className="dd-value">{form.followup_date ? fmtDate(form.followup_date) : "—"}</div></div>
            )}
            <div className="dd-item"><div className="dd-label">Peserta</div><div className="dd-value">{joinMembers(selected) || "—"}</div></div>
          </div>
          <div className="dd-block">
            <div className="dd-label">Keterangan</div>
            <div className="dd-text">{form.description || "—"}</div>
          </div>
          <ModalActions>
            <button className="btn btn-ghost" onClick={onClose}>Tutup</button>
          </ModalActions>
        </>
      )}

      {tab === "edit" && (
        <>
      <Field label="Judul">
        <input className={inputCls} value={form.title} onChange={e => set("title", e.target.value)} placeholder="Nama kegiatan" />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Tipe">
          <select className={selectCls} value={form.type} onChange={e => set("type", e.target.value)}>
            {EVENT_TYPES.map(t => <option key={t}>{t}</option>)}
          </select>
        </Field>
        <Field label="Status">
          <select className={selectCls} value={form.status} onChange={e => set("status", e.target.value)}>
            {EVENT_STATUS.map(s => <option key={s}>{s}</option>)}
          </select>
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Tanggal">
          <input type="date" className={inputCls} value={form.date} onChange={e => set("date", e.target.value)} />
        </Field>
        {form.status === "Reschedule" && (
          <Field label="Tanggal Baru">
            <input type="date" className={inputCls} value={form.followup_date || ""} onChange={e => set("followup_date", e.target.value || null)} />
          </Field>
        )}
      </div>

      <Field label="Client (opsional)">
        <SearchableSelect
          options={clients.map(c => ({ value: c.id, label: c.name }))}
          value={form.client_id || ""}
          onChange={v => set("client_id", v || null)}
          placeholder="Cari client…"
          clearLabel="— Tidak terkait client —"
        />
      </Field>

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
        {isEdit && <button className="btn btn-danger" onClick={handleDelete} disabled={saving}>Hapus</button>}
        <button className="btn btn-ghost" onClick={onClose}>Batal</button>
        <button className="btn" onClick={handleSave} disabled={saving}>{saving && <span className="btn-spinner" />}{saving ? "Menyimpan…" : "Simpan"}</button>
      </ModalActions>
        </>
      )}
    </Modal>
  );
}
