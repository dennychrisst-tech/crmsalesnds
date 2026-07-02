"use client";
import { useState, useEffect } from "react";
import { v4 as uuid } from "uuid";
import Modal, { Field, inputCls, selectCls, textareaCls, ModalActions } from "./ui/Modal";
import { Deal, Client, Product, CRMDocument, Attachment, Activity } from "@/types";
import { STAGES, DEAL_TYPES, ACTIVITY_TYPES, STAGE_COLOR, fmtDate, fmtIDR, todayStr } from "@/lib/utils";
import DocumentTracker from "./DocumentTracker";
import AttachmentSection from "./AttachmentSection";
import SearchableSelect from "./ui/SearchableSelect";

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

const emptyDeal = (clientId: string, defaultOwner = ""): Deal => ({
  id: uuid(), name: "", client_id: clientId, value: 0,
  stage: "Cold Call", deal_type: "", product: "", close_date: "", notes: "",
  owner: defaultOwner, win_loss_reason: "", competitor: "", stage_updated_at: new Date().toISOString(),
});

const emptyActivity = (dealId: string): Omit<Activity, "id" | "created_at"> => ({
  deal_id: dealId, client_id: null, type: "Note", description: "", date: todayStr(), created_by: "",
});

export default function DealModal({
  open, deal, clients, products, documents, attachments, activities, team, defaultOwner = "",
  onSave, onDelete, onAddDocument, onDeleteDocument,
  onUploadAttachment, onDeleteAttachment,
  onAddActivity, onDeleteActivity,
  onClose,
}: Props) {
  const isEdit = !!deal;
  const [form, setForm] = useState<Deal>(emptyDeal("", defaultOwner));
  const [tab, setTab] = useState<"detail" | "info" | "activity" | "docs" | "files">("info");
  const [actForm, setActForm] = useState(emptyActivity(deal?.id || ""));
  const [saving, setSaving] = useState(false);

  // Re-init only when the modal opens or a different deal is opened — NOT when
  // background polling replaces the data arrays, which would wipe in-progress
  // edits and kick the user back to the detail tab mid-typing.
  useEffect(() => {
    const d = deal || emptyDeal("", defaultOwner);
    setForm(d);
    setActForm(emptyActivity(d.id));
    setTab(deal ? "detail" : "info");
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deal?.id, open]);

  const clientName = (id: string) => clients.find(c => c.id === id)?.name || "—";

  const set = <K extends keyof Deal>(k: K, v: Deal[K]) => setForm(f => ({ ...f, [k]: v }));

  async function handleSave() {
    if (!form.name.trim()) { alert("Nama project wajib diisi."); return; }
    if (!form.client_id) { alert("Client wajib dipilih."); return; }
    await onSave(form);
    onClose();
  }

  async function handleDelete() {
    if (!confirm("Hapus project ini?")) return;
    await onDelete(form.id);
    onClose();
  }

  async function handleAddActivity() {
    if (!actForm.description.trim()) { alert("Deskripsi aktivitas wajib diisi."); return; }
    setSaving(true);
    try {
      await onAddActivity({ ...actForm, id: uuid(), deal_id: form.id });
      setActForm(emptyActivity(form.id));
    } catch {
      // useData's mutation helpers already surface the failure via error toast.
    } finally {
      setSaving(false);
    }
  }

  const tabCls = (t: string) => `modal-tab${tab === t ? " modal-tab-active" : ""}`;
  const showWinLoss = form.stage === "Won" || form.stage === "Lost";

  return (
    <Modal open={open} onClose={onClose} title={isEdit ? (tab === "detail" ? "Detail Project" : "Edit Project") : "Tambah Project"}>
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
            <div className="dd-item"><div className="dd-label">Tipe Project</div><div className="dd-value">{form.deal_type || "—"}</div></div>
            <div className="dd-item"><div className="dd-label">Owner (Sales)</div><div className="dd-value">{form.owner || "—"}</div></div>
            <div className="dd-item"><div className="dd-label">Target Closing</div><div className="dd-value">{form.close_date ? fmtDate(form.close_date) : "—"}</div></div>
            <div className="dd-item"><div className="dd-label">Nilai</div><div className="dd-value dd-value-brand">{fmtIDR(form.value)}</div></div>
            <div className="dd-item"><div className="dd-label">Produk / Solusi</div><div className="dd-value">{form.product || "—"}</div></div>
            <div className="dd-item"><div className="dd-label">Kompetitor</div><div className="dd-value">{form.competitor || "—"}</div></div>
          </div>
          {showWinLoss && form.win_loss_reason && (
            <div className="dd-block">
              <div className="dd-label">Alasan {form.stage}</div>
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
          <Field label="Nama project">
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
                {[...STAGES, "Lost"].map(s => <option key={s}>{s}</option>)}
              </select>
            </Field>
            <Field label="Tipe Project">
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
            <Field label={`Alasan ${form.stage}`}>
              <textarea className={textareaCls} value={form.win_loss_reason} onChange={e => set("win_loss_reason", e.target.value)} placeholder={`Kenapa project ini ${form.stage}?`} />
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
            <button className="btn btn-sm" onClick={handleAddActivity} disabled={saving}>
              {saving ? "Menyimpan…" : "+ Tambah Aktivitas"}
            </button>
          </div>

          <div className="activity-timeline">
            {activities.length === 0 && (
              <div className="empty-state" style={{ padding: "16px 0" }}>Belum ada aktivitas.</div>
            )}
            {[...activities].sort((a, b) => (b.date || b.created_at || "").localeCompare(a.date || a.created_at || "")).map(a => (
              <div key={a.id} className="activity-item">
                <div className="activity-header">
                  <span className="activity-type">{a.type}</span>
                  {a.created_by && <span className="activity-by">👤 {a.created_by}</span>}
                  <span className="activity-date">{fmtDate((a.date || a.created_at || "").slice(0, 10))}</span>
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
          <DocumentTracker dealId={form.id} documents={documents} onAdd={onAddDocument} onDelete={onDeleteDocument} />
          <ModalActions>
            <button className="btn btn-ghost" onClick={onClose}>Tutup</button>
          </ModalActions>
        </>
      )}

      {tab === "files" && isEdit && (
        <>
          <AttachmentSection dealId={form.id} attachments={attachments} onUpload={onUploadAttachment} onDelete={onDeleteAttachment} />
          <ModalActions>
            <button className="btn btn-ghost" onClick={onClose}>Tutup</button>
          </ModalActions>
        </>
      )}
    </Modal>
  );
}
