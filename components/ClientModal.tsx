"use client";
import { useState, useEffect } from "react";
import { v4 as uuid } from "uuid";
import Modal, { Field, inputCls, selectCls, textareaCls, ModalActions } from "./ui/Modal";
import { Client } from "@/types";
import { SECTORS } from "@/lib/utils";

interface Props {
  open: boolean;
  client: Client | null;
  onSave: (c: Client) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onClose: () => void;
}

const emptyClient = (): Client => ({
  id: uuid(),
  name: "",
  sector: "Banking",
  pic: [""],
  contact: "",
  status: "Prospect",
  notes: "",
});

function formatPhone(value: string): string {
  const digits = value.replace(/\D/g, "");
  if (!digits) return "";
  if (digits.startsWith("0")) {
    const rest = digits.slice(1);
    const parts = [rest.slice(0, 3), rest.slice(3, 7), rest.slice(7, 11)].filter(Boolean);
    return "0" + parts.join("-");
  }
  const parts = [digits.slice(0, 2), digits.slice(2, 6), digits.slice(6, 10)].filter(Boolean);
  return parts.join("-");
}

export default function ClientModal({ open, client, onSave, onDelete, onClose }: Props) {
  const isEdit = !!client;
  const [form, setForm] = useState<Client>(emptyClient());

  useEffect(() => {
    if (client) {
      setForm({ ...client, pic: Array.isArray(client.pic) ? client.pic : [client.pic || ""] });
    } else {
      setForm(emptyClient());
    }
  }, [client, open]);

  const set = <K extends keyof Client>(k: K, v: Client[K]) => setForm(f => ({ ...f, [k]: v }));

  function setPic(index: number, value: string) {
    setForm(f => {
      const pics = [...f.pic];
      pics[index] = value;
      return { ...f, pic: pics };
    });
  }

  function addPic() {
    setForm(f => ({ ...f, pic: [...f.pic, ""] }));
  }

  function removePic(index: number) {
    setForm(f => ({ ...f, pic: f.pic.filter((_, i) => i !== index) }));
  }

  function handleContactChange(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value.replace(/\D/g, "");
    set("contact", raw);
  }

  async function handleSave() {
    if (!form.name.trim()) { alert("Nama client wajib diisi."); return; }
    const cleaned = { ...form, pic: form.pic.filter(p => p.trim()) };
    await onSave(cleaned);
    onClose();
  }

  async function handleDelete() {
    if (!confirm("Hapus client ini?")) return;
    await onDelete(form.id);
    onClose();
  }

  const displayContact = formatPhone(form.contact);

  return (
    <Modal open={open} onClose={onClose} title={`${isEdit ? "Edit" : "Tambah"} Client`}>
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
      <Field label="PIC">
        <div className="flex flex-col gap-2">
          {form.pic.map((p, i) => (
            <div key={i} className="flex gap-2 items-center">
              <input
                className={inputCls}
                value={p}
                onChange={e => setPic(i, e.target.value)}
                placeholder={`PIC ${i + 1}`}
              />
              {form.pic.length > 1 && (
                <button
                  type="button"
                  onClick={() => removePic(i)}
                  className="text-red-500 hover:text-red-700 text-lg leading-none px-1"
                  title="Hapus PIC"
                >
                  ×
                </button>
              )}
            </div>
          ))}
          <button
            type="button"
            onClick={addPic}
            className="text-sm text-[#1a5c4f] hover:underline self-start"
          >
            + Tambah PIC
          </button>
        </div>
      </Field>
      <Field label="Kontak (No. Telepon)">
        <input
          className={inputCls}
          value={displayContact}
          onChange={handleContactChange}
          placeholder="08xx-xxxx-xxxx"
          inputMode="tel"
          type="tel"
        />
      </Field>
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
