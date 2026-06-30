"use client";
import { useState, useEffect } from "react";
import { v4 as uuid } from "uuid";
import Modal, { Field, inputCls, selectCls, textareaCls, ModalActions } from "./ui/Modal";
import { Client, PIC } from "@/types";
import { SECTORS, COMPANY_SIZES } from "@/lib/utils";

interface Props {
  open: boolean;
  client: Client | null;
  onSave: (c: Client) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onClose: () => void;
}

const emptyPIC = (): PIC => ({ name: "", phone: "" });

const emptyClient = (): Client => ({
  id: uuid(), name: "", sector: "Banking", pic: [emptyPIC()], contact: "",
  status: "Prospect", notes: "", address: "", website: "", company_size: "",
});

function normalizePic(raw: unknown): PIC[] {
  if (!raw || !Array.isArray(raw)) return [emptyPIC()];
  return (raw as unknown[]).map(p => {
    if (typeof p === "string") return { name: p, phone: "" };
    if (p && typeof p === "object" && "name" in p) return p as PIC;
    return emptyPIC();
  });
}

export default function ClientModal({ open, client, onSave, onDelete, onClose }: Props) {
  const isEdit = !!client;
  const [form, setForm] = useState<Client>(emptyClient());
  const [tab, setTab] = useState<"info" | "profile">("info");

  useEffect(() => {
    if (client) {
      setForm({ ...client, pic: normalizePic(client.pic) });
    } else {
      setForm(emptyClient());
    }
    setTab("info");
  }, [client, open]);

  const set = <K extends keyof Client>(k: K, v: Client[K]) => setForm(f => ({ ...f, [k]: v }));

  function setPicField(index: number, field: keyof PIC, value: string) {
    setForm(f => {
      const pics = f.pic.map((p, i) => i === index ? { ...p, [field]: value } : p);
      return { ...f, pic: pics };
    });
  }
  function addPic() { setForm(f => ({ ...f, pic: [...f.pic, emptyPIC()] })); }
  function removePic(index: number) { setForm(f => ({ ...f, pic: f.pic.filter((_, i) => i !== index) })); }

  async function handleSave() {
    if (!form.name.trim()) { alert("Nama client wajib diisi."); return; }
    const cleaned = { ...form, pic: form.pic.filter(p => p.name.trim()) };
    await onSave(cleaned);
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

          <Field label="Sales yang Handle">
            <div className="flex flex-col gap-2">
              {form.pic.map((p, i) => (
                <div key={i} className="flex gap-2 items-center">
                  <input
                    className={inputCls}
                    value={p.name}
                    onChange={e => setPicField(i, "name", e.target.value)}
                    placeholder={`Nama Sales ${i + 1}`}
                  />
                  {form.pic.length > 1 && (
                    <button type="button" onClick={() => removePic(i)}
                      className="text-red-500 hover:text-red-700 text-lg leading-none px-1 flex-shrink-0"
                      title="Hapus">×</button>
                  )}
                </div>
              ))}
              <button type="button" onClick={addPic} className="text-sm text-[#1a5c4f] hover:underline self-start">
                + Tambah Sales
              </button>
            </div>
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
