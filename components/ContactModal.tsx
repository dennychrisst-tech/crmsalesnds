"use client";
import { useState, useEffect, useRef } from "react";
import { v4 as uuid } from "uuid";
import Modal, { Field, inputCls, textareaCls, ModalActions } from "./ui/Modal";
import { toast } from "./ui/Toast";
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
  // Last group has no upper bound — numbers pasted with a country code (e.g.
  // "+62 812-3456-7890" from WhatsApp/contacts) run longer than a locally-typed
  // 08xx number, and a capped slice() here used to silently drop the trailing
  // digits from the display, making paste look broken.
  if (digits.startsWith("0")) {
    const rest = digits.slice(1);
    const parts = [rest.slice(0, 3), rest.slice(3, 7), rest.slice(7)].filter(Boolean);
    return "0" + parts.join("-");
  }
  const parts = [digits.slice(0, 2), digits.slice(2, 6), digits.slice(6)].filter(Boolean);
  return parts.join("-");
}

// Keeps the caret where the user is typing/deleting instead of always
// snapping to the end — plain `value={formatPhone(...)}` resets the caret
// on every keystroke because the dashes shift the string length.
function PhoneInput({ value, onChange, className, placeholder }: {
  value: string;
  onChange: (digits: string) => void;
  className?: string;
  placeholder?: string;
}) {
  const ref = useRef<HTMLInputElement>(null);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const input = e.target;
    const raw = input.value;
    const cursor = input.selectionStart ?? raw.length;
    const digitsBeforeCursor = raw.slice(0, cursor).replace(/\D/g, "").length;
    const digits = raw.replace(/\D/g, "");
    onChange(digits);

    requestAnimationFrame(() => {
      if (!ref.current) return;
      const formatted = formatPhone(digits);
      let pos = 0, seen = 0;
      while (pos < formatted.length && seen < digitsBeforeCursor) {
        if (/\d/.test(formatted[pos])) seen++;
        pos++;
      }
      ref.current.setSelectionRange(pos, pos);
    });
  }

  return (
    <input
      ref={ref}
      className={className}
      value={formatPhone(value)}
      onChange={handleChange}
      placeholder={placeholder}
      inputMode="tel"
    />
  );
}

const emptyRow = (clientId: string): Contact => ({ id: uuid(), client_id: clientId, name: "", title: "", email: "", phone: "", notes: "" });

export default function ContactModal({ open, contact, clientId, onSave, onDelete, onClose }: Props) {
  const isEdit = !!contact;

  // Edit mode: single form
  const [form, setForm] = useState<Contact>(emptyRow(clientId));
  const [tab, setTab] = useState<"detail" | "edit">("edit");
  // Add mode: multiple rows
  const [rows, setRows] = useState<Contact[]>([emptyRow(clientId)]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isEdit) {
      setForm({ ...contact });
      setTab("detail");
    } else {
      setRows([emptyRow(clientId)]);
      setTab("edit");
    }
  }, [contact, clientId, open, isEdit]);

  const setField = <K extends keyof Contact>(k: K, v: Contact[K]) => setForm(f => ({ ...f, [k]: v }));

  function setRow<K extends keyof Contact>(i: number, k: K, v: Contact[K]) {
    setRows(rs => rs.map((r, idx) => idx === i ? { ...r, [k]: v } : r));
  }

  function addRow() {
    setRows(rs => [...rs, emptyRow(clientId)]);
  }

  function removeRow(i: number) {
    setRows(rs => rs.filter((_, idx) => idx !== i));
  }

  async function handleSave() {
    if (isEdit) {
      if (!form.name.trim()) { toast("Nama kontak wajib diisi.", { type: "error" }); return; }
    } else {
      const valid = rows.filter(r => r.name.trim());
      if (!valid.length) { toast("Isi minimal satu nama kontak.", { type: "error" }); return; }
    }
    setSaving(true);
    try {
      if (isEdit) {
        await onSave(form);
      } else {
        const valid = rows.filter(r => r.name.trim());
        for (const r of valid) await onSave(r);
      }
      onClose();
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!confirm("Hapus kontak ini?")) return;
    await onDelete(form.id);
    onClose();
  }

  const rowStyle: React.CSSProperties = {
    border: "1px solid var(--line)", borderRadius: 10,
    padding: "14px 14px 10px", marginBottom: 10, position: "relative",
    background: "var(--paper)",
  };

  const tabCls = (t: string) => `modal-tab${tab === t ? " modal-tab-active" : ""}`;

  return (
    <Modal open={open} onClose={onClose} title={isEdit ? (tab === "detail" ? "Detail Kontak" : "Edit Kontak") : "Tambah Kontak"}>
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
              <div className="dd-name">{form.name}</div>
              <div className="dd-client">{form.title || "—"}</div>
            </div>
          </div>
          <div className="dd-grid">
            <div className="dd-item"><div className="dd-label">Email</div><div className="dd-value">{form.email || "—"}</div></div>
            <div className="dd-item"><div className="dd-label">No. Telepon</div><div className="dd-value">{form.phone ? formatPhone(form.phone) : "—"}</div></div>
          </div>
          <div className="dd-block">
            <div className="dd-label">Catatan</div>
            <div className="dd-text">{form.notes || "—"}</div>
          </div>
          <ModalActions>
            <button className="btn btn-ghost" onClick={onClose}>Tutup</button>
          </ModalActions>
        </>
      )}

      {isEdit && tab === "edit" ? (
        <>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Nama">
              <input className={inputCls} value={form.name} onChange={e => setField("name", e.target.value)} />
            </Field>
            <Field label="Jabatan">
              <input className={inputCls} value={form.title} onChange={e => setField("title", e.target.value)} placeholder="Sales Manager, IT Head…" />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Email">
              <input type="email" className={inputCls} value={form.email} onChange={e => setField("email", e.target.value)} />
            </Field>
            <Field label="No. Telepon">
              <PhoneInput className={inputCls} value={form.phone} onChange={v => setField("phone", v)} placeholder="08xx-xxxx-xxxx" />
            </Field>
          </div>
          <Field label="Catatan">
            <textarea className={textareaCls} value={form.notes} onChange={e => setField("notes", e.target.value)} />
          </Field>
          <ModalActions>
            {isEdit && <button className="btn btn-danger" onClick={handleDelete} disabled={saving}>Hapus</button>}
            <button className="btn btn-ghost" onClick={onClose}>Batal</button>
            <button className="btn" onClick={handleSave} disabled={saving}>{saving && <span className="btn-spinner" />}{saving ? "Menyimpan…" : "Simpan"}</button>
          </ModalActions>
        </>
      ) : !isEdit ? (
        <>
          {rows.map((row, i) => (
            <div key={row.id} style={rowStyle}>
              {rows.length > 1 && (
                <button
                  onClick={() => removeRow(i)}
                  style={{ position: "absolute", top: 10, right: 10, background: "none", border: "none", cursor: "pointer", fontSize: 16, color: "var(--ink-soft)", lineHeight: 1 }}
                  title="Hapus baris ini"
                >×</button>
              )}
              <div style={{ fontSize: 11, fontWeight: 700, color: "var(--ink-soft)", marginBottom: 8, textTransform: "uppercase", letterSpacing: ".05em" }}>
                Kontak {i + 1}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Nama">
                  <input className={inputCls} value={row.name} onChange={e => setRow(i, "name", e.target.value)} placeholder="Nama kontak" />
                </Field>
                <Field label="Jabatan">
                  <input className={inputCls} value={row.title} onChange={e => setRow(i, "title", e.target.value)} placeholder="Sales Manager, IT Head…" />
                </Field>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Email">
                  <input type="email" className={inputCls} value={row.email} onChange={e => setRow(i, "email", e.target.value)} />
                </Field>
                <Field label="No. Telepon">
                  <PhoneInput className={inputCls} value={row.phone} onChange={v => setRow(i, "phone", v)} placeholder="08xx-xxxx-xxxx" />
                </Field>
              </div>
            </div>
          ))}
          <button
            className="btn btn-ghost"
            style={{ width: "100%", marginBottom: 4 }}
            onClick={addRow}
          >
            + Tambah Kontak Lagi
          </button>
          <ModalActions>
            <button className="btn btn-ghost" onClick={onClose}>Batal</button>
            <button className="btn" onClick={handleSave} disabled={saving}>
              {saving ? "Menyimpan…" : `Simpan ${rows.filter(r => r.name.trim()).length > 1 ? `(${rows.filter(r => r.name.trim()).length} kontak)` : ""}`}
            </button>
          </ModalActions>
        </>
      ) : null}
    </Modal>
  );
}
