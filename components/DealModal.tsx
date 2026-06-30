"use client";
import { useState, useEffect } from "react";
import { v4 as uuid } from "uuid";
import Modal, { Field, inputCls, selectCls, textareaCls, ModalActions } from "./ui/Modal";
import { Deal, Client, Product, CRMDocument, Attachment } from "@/types";
import { STAGES, TEAM } from "@/lib/utils";
import DocumentTracker from "./DocumentTracker";
import AttachmentSection from "./AttachmentSection";

interface Props {
  open: boolean;
  deal: Deal | null;
  clients: Client[];
  products: Product[];
  documents: CRMDocument[];
  attachments: Attachment[];
  onSave: (d: Deal) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onAddDocument: (d: CRMDocument) => Promise<void>;
  onDeleteDocument: (id: string) => Promise<void>;
  onUploadAttachment: (file: File, dealId: string) => Promise<void>;
  onDeleteAttachment: (id: string) => Promise<void>;
  onClose: () => void;
}

const emptyDeal = (clientId: string): Deal => ({
  id: uuid(), name: "", client_id: clientId, value: 0,
  stage: "Lead", product: "", close_date: "", notes: "",
  owner: "", win_loss_reason: "",
});

export default function DealModal({
  open, deal, clients, products, documents, attachments,
  onSave, onDelete, onAddDocument, onDeleteDocument,
  onUploadAttachment, onDeleteAttachment, onClose,
}: Props) {
  const isEdit = !!deal;
  const [form, setForm] = useState<Deal>(emptyDeal(clients[0]?.id || ""));
  const [tab, setTab] = useState<"info" | "docs" | "files">("info");

  useEffect(() => {
    setForm(deal || emptyDeal(clients[0]?.id || ""));
    setTab("info");
  }, [deal, clients, open]);

  const set = <K extends keyof Deal>(k: K, v: Deal[K]) => setForm(f => ({ ...f, [k]: v }));

  async function handleSave() {
    if (!form.name.trim()) { alert("Nama deal wajib diisi."); return; }
    await onSave(form);
    onClose();
  }

  async function handleDelete() {
    if (!confirm("Hapus deal ini?")) return;
    await onDelete(form.id);
    onClose();
  }

  const tabCls = (t: string) => `modal-tab${tab === t ? " modal-tab-active" : ""}`;
  const showWinLoss = form.stage === "Won" || form.stage === "Lost";

  return (
    <Modal open={open} onClose={onClose} title={`${isEdit ? "Edit" : "Tambah"} Deal`}>
      {isEdit && (
        <div className="modal-tabs">
          <button className={tabCls("info")} onClick={() => setTab("info")}>Info</button>
          <button className={tabCls("docs")} onClick={() => setTab("docs")}>
            Dokumen {documents.length > 0 && <span className="tab-badge">{documents.length}</span>}
          </button>
          <button className={tabCls("files")} onClick={() => setTab("files")}>
            File {attachments.length > 0 && <span className="tab-badge">{attachments.length}</span>}
          </button>
        </div>
      )}

      {tab === "info" && (
        <>
          <Field label="Nama deal">
            <input className={inputCls} value={form.name} onChange={e => set("name", e.target.value)} />
          </Field>
          <Field label="Client">
            <select className={selectCls} value={form.client_id} onChange={e => set("client_id", e.target.value)}>
              {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Stage">
              <select className={selectCls} value={form.stage} onChange={e => set("stage", e.target.value as Deal["stage"])}>
                {[...STAGES, "Lost"].map(s => <option key={s}>{s}</option>)}
              </select>
            </Field>
            <Field label="Owner (Sales)">
              <select className={selectCls} value={form.owner} onChange={e => set("owner", e.target.value)}>
                <option value="">— Pilih —</option>
                {TEAM.map(t => <option key={t}>{t}</option>)}
              </select>
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Nilai (Rp)">
              <input type="number" className={inputCls} value={form.value} onChange={e => set("value", +e.target.value)} />
            </Field>
            <Field label="Target closing">
              <input type="date" className={inputCls} value={form.close_date} onChange={e => set("close_date", e.target.value)} />
            </Field>
          </div>
          <Field label="Produk / Solusi">
            <input
              className={inputCls}
              value={form.product}
              onChange={e => set("product", e.target.value)}
              placeholder="Ketik atau pilih dari catalog…"
              list="deal-product-list"
            />
            <datalist id="deal-product-list">
              {products.map(p => <option key={p.id} value={p.name} />)}
            </datalist>
          </Field>
          {showWinLoss && (
            <Field label={`Alasan ${form.stage}`}>
              <textarea className={textareaCls} value={form.win_loss_reason} onChange={e => set("win_loss_reason", e.target.value)} placeholder={`Kenapa deal ini ${form.stage}?`} />
            </Field>
          )}
          <Field label="Catatan">
            <textarea className={textareaCls} value={form.notes} onChange={e => set("notes", e.target.value)} />
          </Field>
          <ModalActions>
            {isEdit && <button className="btn btn-danger" onClick={handleDelete}>Hapus</button>}
            <button className="btn btn-ghost" onClick={onClose}>Batal</button>
            <button className="btn" onClick={handleSave}>Simpan</button>
          </ModalActions>
        </>
      )}

      {tab === "docs" && isEdit && (
        <>
          <DocumentTracker
            dealId={form.id}
            documents={documents}
            onAdd={onAddDocument}
            onDelete={onDeleteDocument}
          />
          <ModalActions>
            <button className="btn btn-ghost" onClick={onClose}>Tutup</button>
          </ModalActions>
        </>
      )}

      {tab === "files" && isEdit && (
        <>
          <AttachmentSection
            dealId={form.id}
            attachments={attachments}
            onUpload={onUploadAttachment}
            onDelete={onDeleteAttachment}
          />
          <ModalActions>
            <button className="btn btn-ghost" onClick={onClose}>Tutup</button>
          </ModalActions>
        </>
      )}
    </Modal>
  );
}
