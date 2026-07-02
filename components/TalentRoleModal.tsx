"use client";
import { useEffect, useState } from "react";
import { v4 as uuid } from "uuid";
import Modal, { Field, inputCls, selectCls, textareaCls, ModalActions } from "./ui/Modal";
import { TalentRole } from "@/types";
import { TALENT_LEVELS, TALENT_ROLE_STATUS } from "@/lib/utils";

interface Props {
  open: boolean;
  role: TalentRole | null;
  projectId: string;
  team: string[];
  onSave: (r: TalentRole) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onClose: () => void;
}

function emptyRole(projectId: string): TalentRole {
  return {
    id: uuid(), project_id: projectId, role_name: "", level: "", ratecard: 0, pic: "",
    deadline: null, status: "Active", notes: "",
  };
}

export default function TalentRoleModal({ open, role, projectId, team, onSave, onDelete, onClose }: Props) {
  const isEdit = !!role;
  const [form, setForm] = useState<TalentRole>(emptyRole(projectId));
  const [ratecardDisplay, setRatecardDisplay] = useState("");

  useEffect(() => {
    const base = role || emptyRole(projectId);
    setForm(base);
    setRatecardDisplay(base.ratecard ? base.ratecard.toLocaleString("id-ID") : "");
  // Re-init only when the modal opens or a different role is opened.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role?.id, open]);

  const set = (k: keyof TalentRole, v: string | null) => setForm(f => ({ ...f, [k]: v }));

  async function handleSave() {
    if (!form.role_name.trim()) { alert("Nama role wajib diisi."); return; }
    await onSave(form);
    onClose();
  }

  async function handleDelete() {
    if (!confirm("Hapus role ini beserta seluruh CV di dalamnya?")) return;
    await onDelete(form.id);
    onClose();
  }

  return (
    <Modal open={open} onClose={onClose} title={isEdit ? "Edit Role" : "Tambah Role"}>
      <Field label="Nama Role">
        <input className={inputCls} value={form.role_name} onChange={e => set("role_name", e.target.value)} placeholder="Mis. Java Developer" />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Level">
          <select className={selectCls} value={form.level} onChange={e => set("level", e.target.value)}>
            <option value="">— Pilih —</option>
            {TALENT_LEVELS.map(l => <option key={l}>{l}</option>)}
          </select>
        </Field>
        <Field label="Status">
          <select className={selectCls} value={form.status} onChange={e => set("status", e.target.value)}>
            {TALENT_ROLE_STATUS.map(s => <option key={s}>{s}</option>)}
          </select>
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Ratecard (per bulan)">
          <div style={{ position: "relative" }}>
            <span style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", fontSize: 12, color: "var(--ink-soft)", pointerEvents: "none" }}>IDR</span>
            <input
              className={inputCls}
              style={{ paddingLeft: 38 }}
              inputMode="numeric"
              value={ratecardDisplay}
              onChange={e => {
                const raw = e.target.value.replace(/\D/g, "");
                const num = parseInt(raw, 10) || 0;
                setRatecardDisplay(raw ? num.toLocaleString("id-ID") : "");
                setForm(f => ({ ...f, ratecard: num }));
              }}
              placeholder="0"
            />
          </div>
        </Field>
        <Field label="PIC / Recruiter">
          <select className={selectCls} value={form.pic} onChange={e => set("pic", e.target.value)}>
            <option value="">— Pilih —</option>
            {team.map(t => <option key={t}>{t}</option>)}
          </select>
        </Field>
      </div>
      <Field label="Deadline">
        <input type="date" className={inputCls} value={form.deadline || ""} onChange={e => set("deadline", e.target.value || null)} />
      </Field>
      <Field label="Catatan (opsional)">
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
