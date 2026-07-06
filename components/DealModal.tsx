"use client";
import { useState, useEffect } from "react";
import { v4 as uuid } from "uuid";
import Modal, { Field, inputCls, selectCls, textareaCls, ModalActions } from "./ui/Modal";
import { Deal, Client, Product, CRMDocument, Attachment, Activity } from "@/types";
import { STAGES, DEAL_TYPES, ACTIVITY_TYPES, STAGE_COLOR, fmtDate, fmtIDR, todayStr, isWonStage } from "@/lib/utils";
import DocumentTracker from "./DocumentTracker";
import AttachmentSection from "./AttachmentSection";
import SearchableSelect from "./ui/SearchableSelect";
import { toast } from "./ui/Toast";

interface Props {
  open: boolean;
  deal: Deal | null;
  clients: Client[];
  products: Product[];
  documents: CRMDocument[];
  attachments: Attachment[];
  activities: Activity[];
  team: string[];
  defaultOwner?: string;
  defaultProduct?: string;
  onSave: (d: Deal) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onAddDocument: (d: CRMDocument) => Promise<void>;
  onDeleteDocument: (id: string) => Promise<void>;
  onUploadAttachment: (file: File, dealId: string) => Promise<void>;
  onDeleteAttachment: (id: string) => Promise<void>;
  onAddActivity: (a: Activity) => Promise<void>;
  onDeleteActivity: (id: string) => Promise<void>;
  onClose: () => void;
}

const emptyDeal = (clientId: string, defaultOwner = "", defaultProduct = ""): Deal => ({
  id: uuid(), name: "", client_id: clientId, value: 0,
  stage: "Approching", deal_type: "", product: defaultProduct, close_date: "", notes: "",
  owner: defaultOwner, win_loss_reason: "", competitor: "", stage_updated_at: new Date().toISOString(),
});

const emptyActivity = (dealId: string): Omit<Activity, "id" | "created_at"> => ({
  deal_id: dealId, project_id: null, client_id: null, type: "Note", description: "", date: todayStr(), created_by: "",
});

export default function DealModal({
  open, deal, clients, products, documents, attachments, activities, team, defaultOwner = "", defaultProduct = "",
  onSave, onDelete, onAddDocument, onDeleteDocument,
  onUploadAttachment, onDeleteAttachment,
  onAddActivity, onDeleteActivity,
  onClose,
}: Props) {
  const isEdit = !!deal;
  const [form, setForm] = useState<Deal>(emptyDeal("", defaultOwner, defaultProduct));
  const [tab, setTab] = useState<"detail" | "info" | "activity" | "docs" | "files">("info");
  const [actForm, setActForm] = useState(emptyActivity(deal?.id || ""));
  const [editingActivityId, setEditingActivityId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [savingMain, setSavingMain] = useState(false);

  // Re-init only when the modal opens or a different deal is opened — NOT when
  // background polling replaces the data arrays, which would wipe in-progress
  // edits and kick the user back to the detail tab mid-typing.
  useEffect(() => {
    const d = deal || emptyDeal("", defaultOwner, defaultProduct);
    setForm(d);
    setActForm(emptyActivity(d.id));
    setEditingActivityId(null);
    setTab(deal ? "detail" : "info");
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deal?.id, open]);

  const clientName = (id: string) => clients.find(c => c.id === id)?.name || "—";

  const set = <K extends keyof Deal>(k: K, v: Deal[K]) => setForm(f => ({ ...f, [k]: v }));

  async function handleSave() {
    if (!form.name.trim()) { toast("Nama oppty wajib diisi.", { type: "error" }); return; }
    if (!form.client_id) { toast("Client wajib dipilih.", { type: "error" }); return; }
    setSavingMain(true);
    try {
      await onSave(form);
      onClose();
    } finally {
      setSavingMain(false);
    }
  }

  async function handleDelete() {
    // No confirm() dialog — the Undo toast (see useUndoableDelete) is the
    // safety net: the record isn't actually deleted until that window passes.
    await onDelete(form.id);
    onClose();
  }

  async function handleSaveActivity() {
    if (!actForm.description.trim()) { toast("Deskripsi aktivitas wajib diisi.", { type: "error" }); return; }
    if (!actForm.created_by) { toast("Oleh wajib diisi.", { type: "error" }); return; }
    setSaving(true);
    try {
      await onAddActivity({ ...actForm, id: editingActivityId || uuid(), deal_id: form.id });
      setActForm(emptyActivity(form.id));
      setEditingActivityId(null);
    } catch {
      // useData's mutation helpers already surface the failure via error toast.
    } finally {
      setSaving(false);
    }
  }

  function startEditActivity(a: Activity) {
    setActForm({
      deal_id: a.deal_id, project_id: a.project_id, client_id: a.client_id,
      type: a.type, description: a.description, date: a.date, created_by: a.created_by,
    });
    setEditingActivityId(a.id);
  }

  function cancelEditActivity() {
    setActForm(emptyActivity(form.id));
    setEditingActivityId(null);
  }

  const tabCls = (t: string) => `modal-tab${tab === t ? " modal-tab-active" : ""}`;
  const showWinLoss = isWonStage(form.stage) || form.stage === "Dropped";
  // PO/Kontrak are later paperwork steps on an already-Dealed deal, not a fresh
  // win determination — keep the reason-field wording fixed to the moment it
  // was actually captured (Dealed) instead of whichever stage the deal is at now.
  const winLossLabel = form.stage === "Dropped" ? "Dropped" : "Dealed";

  return (
    <Modal open={open} onClose={onClose} title={isEdit ? (tab === "detail" ? "Detail Oppty" : "Edit Oppty") : "Tambah Oppty"}>
      {isEdit && (
        <div className="modal-tabs">
          <button className={tabCls("detail")} onClick={() => setTab("detail")}>Detail</button>
          <button className={tabCls("info")} onClick={() => setTab("info")}>Edit</button>
          <button className={tabCls("activity")} onClick={() => setTab("activity")}>
            Aktivitas {activities.length > 0 && <span className="tab-badge">{activities.length}</span>}
          </button>
          <button className={tabCls("docs")} onClick={() => setTab("docs")}>
            Dokumen {documents.length > 0 && <span className="tab-badge">{documents.length}</span>}
          </button>
          <button className={tabCls("files")} onClick={() => setTab("files")}>
            File {attachments.length > 0 && <span className="tab-badge">{attachments.length}</span>}
          </button>
        </div>
      )}

      {tab === "detail" && isEdit && (
        <>
          <div className="dd-title-row">
            <div>
              <div className="dd-name">{form.name}</div>
              <div className="dd-client">{clientName(form.client_id)}</div>
            </div>
            <span className="badge" style={{ background: `${STAGE_COLOR[form.stage] || "var(--brand)"}22`, color: STAGE_COLOR[form.stage] || "var(--brand)" }}>
              {form.stage}
            </span>
          </div>
          <div className="dd-grid">
            <div className="dd-item"><div className="dd-label">Tipe Oppty</div><div className="dd-value">{form.deal_type || "—"}</div></div>
            <div className="dd-item"><div className="dd-label">Owner (Sales)</div><div className="dd-value">{form.owner || "—"}</div></div>
            <div className="dd-item"><div className="dd-label">Target Closing</div><div className="dd-value">{form.close_date ? fmtDate(form.close_date) : "—"}</div></div>
            <div className="dd-item"><div className="dd-label">Nilai</div><div className="dd-value dd-value-brand">{fmtIDR(form.value)}</div></div>
            <div className="dd-item"><div className="dd-label">Produk / Solusi</div><div className="dd-value">{form.product || "—"}</div></div>
            <div className="dd-item"><div className="dd-label">Kompetitor</div><div className="dd-value">{form.competitor || "—"}</div></div>
          </div>
          {showWinLoss && form.win_loss_reason && (
            <div className="dd-block">
              <div className="dd-label">Alasan {winLossLabel}</div>
              <div className="dd-text">{form.win_loss_reason}</div>
            </div>
          )}
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
          <Field label="Nama Oppty">
            <input className={inputCls} value={form.name} onChange={e => set("name", e.target.value)} />
          </Field>
          <Field label="Client">
            <SearchableSelect
              options={clients.map(c => ({ value: c.id, label: c.name }))}
              value={form.client_id}
              onChange={v => set("client_id", v)}
              placeholder="Cari client…"
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Stage">
              <select className={selectCls} value={form.stage} onChange={e => {
                setForm(f => ({ ...f, stage: e.target.value as Deal["stage"], stage_updated_at: new Date().toISOString() }));
              }}>
                {[...STAGES, "On Hold", "Dropped"].map(s => <option key={s}>{s}</option>)}
              </select>
            </Field>
            <Field label="Tipe Oppty">
              <select className={selectCls} value={form.deal_type} onChange={e => set("deal_type", e.target.value)}>
                <option value="">— Pilih —</option>
                {DEAL_TYPES.map(t => <option key={t}>{t}</option>)}
              </select>
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Owner (Sales)">
              <select className={selectCls} value={form.owner} onChange={e => set("owner", e.target.value)}>
                <option value="">— Pilih —</option>
                {team.map(t => <option key={t}>{t}</option>)}
              </select>
            </Field>
            <Field label="Target closing">
              <input type="date" className={inputCls} value={form.close_date} onChange={e => set("close_date", e.target.value)} />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Nilai (Rp)">
              <input type="number" className={inputCls} value={form.value} onChange={e => set("value", +e.target.value)} />
            </Field>
            <Field label="Produk / Solusi">
              <input
                className={inputCls}
                value={form.product}
                onChange={e => set("product", e.target.value)}
                placeholder="Ketik atau pilih…"
                list="deal-product-list"
              />
              <datalist id="deal-product-list">
                {products.map(p => <option key={p.id} value={p.name} />)}
              </datalist>
            </Field>
          </div>
          <Field label="Kompetitor">
            <input className={inputCls} value={form.competitor || ""} onChange={e => set("competitor", e.target.value)} placeholder="Nama vendor / kompetitor yang terlibat" />
          </Field>
          {showWinLoss && (
            <Field label={`Alasan ${winLossLabel}`}>
              <textarea className={textareaCls} value={form.win_loss_reason} onChange={e => set("win_loss_reason", e.target.value)} placeholder={`Kenapa oppty ini ${winLossLabel}?`} />
            </Field>
          )}
          <Field label="Catatan">
            <textarea className={textareaCls} value={form.notes} onChange={e => set("notes", e.target.value)} />
          </Field>
          <ModalActions>
            {isEdit && <button className="btn btn-danger" onClick={handleDelete} disabled={savingMain}>Hapus</button>}
            <button className="btn btn-ghost" onClick={onClose}>Batal</button>
            <button className="btn" onClick={handleSave} disabled={savingMain}>{savingMain && <span className="btn-spinner" />}{savingMain ? "Menyimpan…" : "Simpan"}</button>
          </ModalActions>
        </>
      )}

      {tab === "activity" && isEdit && (
        <>
          <div className="activity-form">
            <div className="grid grid-cols-2 gap-2" style={{ marginBottom: 8 }}>
              <select className={selectCls} value={actForm.type} onChange={e => setActForm(f => ({ ...f, type: e.target.value }))}>
                {ACTIVITY_TYPES.map(t => <option key={t}>{t}</option>)}
              </select>
              <select className={selectCls} value={actForm.created_by} onChange={e => setActForm(f => ({ ...f, created_by: e.target.value }))}>
                <option value="">— Oleh —</option>
                {team.map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
              <input
                type="date"
                className={inputCls}
                style={{ flex: "0 0 160px" }}
                value={actForm.date || ""}
                onChange={e => setActForm(f => ({ ...f, date: e.target.value || null }))}
              />
              <textarea
                className={textareaCls}
                style={{ flex: 1, margin: 0 }}
                rows={2}
                value={actForm.description}
                onChange={e => setActForm(f => ({ ...f, description: e.target.value }))}
                placeholder="Catat aktivitas, hasil call, meeting, dll…"
              />
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button className="btn btn-sm" onClick={handleSaveActivity} disabled={saving}>
                {saving ? "Menyimpan…" : editingActivityId ? "Simpan Perubahan" : "+ Tambah Aktivitas"}
              </button>
              {editingActivityId && (
                <button className="btn btn-ghost btn-sm" onClick={cancelEditActivity} disabled={saving}>Batal Edit</button>
              )}
            </div>
          </div>

          <div className="activity-timeline">
            {activities.length === 0 && (
              <div className="empty-state" style={{ padding: "16px 0" }}>Belum ada aktivitas.</div>
            )}
            {[...activities].sort((a, b) => (b.date || b.created_at || "").localeCompare(a.date || a.created_at || "")).map(a => (
              <div key={a.id} className={`activity-item${editingActivityId === a.id ? " activity-item-editing" : ""}`}>
                <div className="activity-header">
                  <span className="activity-type">{a.type}</span>
                  {a.created_by && <span className="activity-by">👤 {a.created_by}</span>}
                  <span className="activity-date">{fmtDate((a.date || a.created_at || "").slice(0, 10))}</span>
                  <button className="activity-edit" onClick={() => startEditActivity(a)} title="Edit">✎</button>
                  <button className="activity-del" onClick={() => onDeleteActivity(a.id)} title="Hapus">×</button>
                </div>
                <div className="activity-desc">{a.description}</div>
              </div>
            ))}
          </div>
          <ModalActions>
            <button className="btn btn-ghost" onClick={onClose}>Tutup</button>
          </ModalActions>
        </>
      )}

      {tab === "docs" && isEdit && (
        <>
          <div className="panel-hint">📌 Catatan status dokumen (Proposal, Kontrak, dll) — tanpa file fisik. Untuk upload file-nya, pakai tab &quot;File&quot;.</div>
          <DocumentTracker dealId={form.id} documents={documents} onAdd={onAddDocument} onDelete={onDeleteDocument} />
          <ModalActions>
            <button className="btn btn-ghost" onClick={onClose}>Tutup</button>
          </ModalActions>
        </>
      )}

      {tab === "files" && isEdit && (
        <>
          <div className="panel-hint">📌 Upload file fisik (PDF, kontrak, dll). Untuk mencatat status dokumen tanpa file, pakai tab &quot;Dokumen&quot;.</div>
          <AttachmentSection dealId={form.id} attachments={attachments} onUpload={onUploadAttachment} onDelete={onDeleteAttachment} />
          <ModalActions>
            <button className="btn btn-ghost" onClick={onClose}>Tutup</button>
          </ModalActions>
        </>
      )}
    </Modal>
  );
}
