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
  onUploadLogo: (file: File, clientId: string) => Promise<string>;
  onDeleteLogo: (url: string) => Promise<void>;
  onClose: () => void;
}

const emptyClient = (): Client => ({
  id: uuid(), name: "", sector: "Banking", pic: [], contact: "",
  status: "Prospect", notes: "", address: "", website: "", company_size: "", logo_url: null,
});

function getAssigned(client: Client | null): string[] {
  if (!client || !Array.isArray(client.pic)) return [];
  return client.pic.map(p => typeof p === "string" ? p : (p as { name: string }).name).filter(Boolean);
}

export default function ClientModal({ open, client, team, onSave, onDelete, onUploadLogo, onDeleteLogo, onClose }: Props) {
  const isEdit = !!client;
  const [form, setForm] = useState<Client>(emptyClient());
  const [assigned, setAssigned] = useState<string[]>([]);
  const [tab, setTab] = useState<"detail" | "info" | "profile">("info");
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (client) {
      setForm(client);
      setAssigned(getAssigned(client));
      setTab("detail");
    } else {
      setForm(emptyClient());
      setAssigned([]);
      setTab("info");
    }
  }, [client, open]);

  const set = <K extends keyof Client>(k: K, v: Client[K]) => setForm(f => ({ ...f, [k]: v }));

  function toggleSales(name: string) {
    setAssigned(prev =>
      prev.includes(name) ? prev.filter(n => n !== name) : [...prev, name]
    );
  }

  async function handleLogoChange(file: File | null) {
    if (!file) return;
    setUploadingLogo(true);
    try {
      const oldUrl = form.logo_url;
      const url = await onUploadLogo(file, form.id);
      set("logo_url", url);
      if (oldUrl) await onDeleteLogo(oldUrl).catch(() => {});
    } catch (err) {
      alert(err instanceof Error ? err.message : "Gagal upload logo.");
    } finally {
      setUploadingLogo(false);
    }
  }

  async function handleRemoveLogo() {
    if (!form.logo_url) return;
    const oldUrl = form.logo_url;
    set("logo_url", null);
    await onDeleteLogo(oldUrl).catch(() => {});
  }

  async function handleSave() {
    if (!form.name.trim()) { alert("Nama client wajib diisi."); return; }
    setSaving(true);
    try {
      const pic = assigned.map(name => ({ name, phone: "" }));
      await onSave({ ...form, pic });
      onClose();
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!confirm("Hapus client ini?")) return;
    await onDelete(form.id);
    onClose();
  }

  const tabCls = (t: string) => `modal-tab${tab === t ? " modal-tab-active" : ""}`;

  return (
    <Modal open={open} onClose={onClose} title={isEdit ? (tab === "detail" ? "Detail Client" : "Edit Client") : "Tambah Client"}>
      <div className="modal-tabs">
        {isEdit && <button className={tabCls("detail")} onClick={() => setTab("detail")}>Detail</button>}
        <button className={tabCls("info")} onClick={() => setTab("info")}>Info Utama</button>
        <button className={tabCls("profile")} onClick={() => setTab("profile")}>Company Profile</button>
      </div>

      {isEdit && tab === "detail" && (
        <>
          <div className="dd-title-row">
            <div>
              <div className="dd-name">{form.name}</div>
              <div className="dd-client">{form.sector}{form.company_size ? ` · ${form.company_size}` : ""}</div>
            </div>
            <span className="badge">{form.status}</span>
          </div>
          <div className="dd-grid">
            <div className="dd-item"><div className="dd-label">Assign Sales</div><div className="dd-value">{assigned.length ? assigned.join(", ") : "—"}</div></div>
            <div className="dd-item"><div className="dd-label">Website</div><div className="dd-value">{form.website || "—"}</div></div>
          </div>
          <div className="dd-block">
            <div className="dd-label">Alamat</div>
            <div className="dd-text">{form.address || "—"}</div>
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
              <select className={selectCls} value={form.status} onChange={e => set("status", e.target.value)}>
                <option value="Prospect">Prospect</option>
                <option value="Existing Active">Existing Active</option>
                <option value="Existing Inactive">Existing Inactive</option>
              </select>
            </Field>
          </div>

          <Field label="Assign Sales">
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {team.map(t => {
                const active = assigned.includes(t);
                return (
                  <button
                    key={t} type="button"
                    onClick={() => toggleSales(t)}
                    style={{
                      padding: "5px 14px", borderRadius: 20, fontSize: 13, fontWeight: 600,
                      cursor: "pointer", border: "1.5px solid",
                      borderColor: active ? "var(--brand)" : "var(--line)",
                      background: active ? "var(--brand)" : "var(--paper)",
                      color: active ? "#fff" : "var(--ink-soft)",
                      transition: "all .15s",
                    }}
                  >
                    {t}
                  </button>
                );
              })}
            </div>
            {assigned.length > 0 && (
              <div style={{ fontSize: 11, color: "var(--ink-soft)", marginTop: 6 }}>
                Dipilih: <b>{assigned.join(", ")}</b>
              </div>
            )}
          </Field>

          <Field label="Catatan">
            <textarea className={textareaCls} value={form.notes} onChange={e => set("notes", e.target.value)} />
          </Field>
        </>
      )}

      {tab === "profile" && (
        <>
          <Field label="Logo Perusahaan">
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              {form.logo_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={form.logo_url} alt="" style={{ width: 48, height: 48, borderRadius: 8, objectFit: "contain", background: "var(--paper)", border: "1px solid var(--line)", padding: 4 }} />
              ) : (
                <div style={{ width: 48, height: 48, borderRadius: 8, background: "var(--brand-soft)", color: "var(--brand)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800 }}>
                  {form.name.charAt(0).toUpperCase() || "?"}
                </div>
              )}
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <label className="btn btn-ghost btn-sm" style={{ cursor: "pointer", display: "inline-block" }}>
                  {uploadingLogo ? "Mengupload…" : form.logo_url ? "Ganti Logo" : "Upload Logo"}
                  <input
                    type="file"
                    accept="image/*"
                    style={{ display: "none" }}
                    disabled={uploadingLogo}
                    onChange={e => { handleLogoChange(e.target.files?.[0] || null); e.target.value = ""; }}
                  />
                </label>
                {form.logo_url && (
                  <button type="button" className="btn btn-ghost btn-sm" onClick={handleRemoveLogo}>Hapus Logo</button>
                )}
              </div>
            </div>
          </Field>
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

      {tab !== "detail" && (
        <ModalActions>
          {isEdit && <button className="btn btn-danger" onClick={handleDelete} disabled={saving}>Hapus</button>}
          <button className="btn btn-ghost" onClick={onClose}>Batal</button>
          <button className="btn" onClick={handleSave} disabled={saving}>{saving ? "Menyimpan…" : "Simpan"}</button>
        </ModalActions>
      )}
    </Modal>
  );
}
