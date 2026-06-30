"use client";
import { useState, useEffect } from "react";
import { v4 as uuid } from "uuid";
import Modal, { Field, inputCls, selectCls, textareaCls, ModalActions } from "./ui/Modal";
import { Client } from "@/types";
import { SECTORS, COMPANY_SIZES } from "@/lib/utils";

interface Props {
  open: boolean;
  client: Client | null;
  team: string[];
  onSave: (c: Client) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onClose: () => void;
}

const emptyClient = (): Client => ({
  id: uuid(), name: "", sector: "Banking", pic: [], contact: "",
  status: "Prospect", notes: "", address: "", website: "", company_size: "",
});

function getAssigned(client: Client | null): string {
  if (!client) return "";
  if (Array.isArray(client.pic) && client.pic.length > 0) {
    const first = client.pic[0];
    return typeof first === "string" ? first : (first as { name: string }).name || "";
  }
  return "";
}

export default function ClientModal({ open, client, team, onSave, onDelete, onClose }: Props) {
  const isEdit = !!client;
  const [form, setForm] = useState<Client>(emptyClient());
  const [assigned, setAssigned] = useState("");
  const [tab, setTab] = useState<"info" | "profile">("info");

  useEffect(() => {
    if (client) {
      setForm(client);
      setAssigned(getAssigned(client));
    } else {
      setForm(emptyClient());
      setAssigned("");
    }
    setTab("info");
  }, [client, open]);

  const set = <K extends keyof Client>(k: K, v: Client[K]) => setForm(f => ({ ...f, [k]: v }));

  async function handleSave() {
    if (!form.name.trim()) { alert("Nama client wajib diisi."); return; }
    const pic = assigned ? [{ name: assigned, phone: "" }] : [];
    await onSave({ ...form, pic });
    onClose();
  }

  async function handleDelete() {
    if (!confirm("Hapus client ini?")) return;
    await onDelete(form.id);
    onClose();
  }

  const tabCls = (t: string) => `modal-tab${tab === t ? " modal-tab-active" : ""}`;

  return (
    <Modal open={open} onClose={onClose} title={`${isEdit ? "Edit" : "Tambah"} Client`}>
      <div className="modal-tabs">
        <button className={tabCls("info")} onClick={() => setTab("info")}>Info Utama</button>
        <button className={tabCls("profile")} onClick={() => setTab("profile")}>Company Profile</button>
      </div>

      {tab === "info" && (
        <>
          <Field label="Nama client">
            <input className={inputCls} value={form.name} onChange={e => set("name", e.target.value)} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Sektor">
              <select className={selectCls} value={form.sector} onChange={e => set("sector", e.target.value as Client["sector"])}>
                {SECTORS.map(s => <option key={s}>{s}</option>)}
              </select>
            </Field>
            <Field label="Status">
              <input className={inputCls} value={form.status} onChange={e => set("status", e.target.value)} placeholder="Prospect / Active / Inactive" />
            </Field>
          </div>

          <Field label="Assign">
            <select className={selectCls} value={assigned} onChange={e => setAssigned(e.target.value)}>
              <option value="">— Pilih Sales —</option>
              {team.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </Field>

          <Field label="Catatan">
            <textarea className={textareaCls} value={form.notes} onChange={e => set("notes", e.target.value)} />
          </Field>
        </>
      )}

      {tab === "profile" && (
        <>
          <Field label="Ukuran Perusahaan">
            <select className={selectCls} value={form.company_size || ""} onChange={e => set("company_size", e.target.value)}>
              <option value="">— Pilih —</option>
              {COMPANY_SIZES.map(s => <option key={s}>{s}</option>)}
            </select>
          </Field>
          <Field label="Alamat">
            <textarea className={textareaCls} value={form.address || ""} onChange={e => set("address", e.target.value)} placeholder="Jl. Sudirman No. 1, Jakarta…" />
          </Field>
          <Field label="Website">
            <input className={inputCls} value={form.website || ""} onChange={e => set("website", e.target.value)} placeholder="https://www.perusahaan.co.id" />
          </Field>
        </>
      )}

      <ModalActions>
        {isEdit && <button className="btn btn-danger" onClick={handleDelete}>Hapus</button>}
        <button className="btn btn-ghost" onClick={onClose}>Batal</button>
        <button className="btn" onClick={handleSave}>Simpan</button>
      </ModalActions>
    </Modal>
  );
}
