"use client";
import { useState, useEffect } from "react";
import { v4 as uuid } from "uuid";
import Modal, { Field, inputCls, selectCls, textareaCls, ModalActions } from "./ui/Modal";
import SearchableSelect from "./ui/SearchableSelect";
import { Project, Client, Activity } from "@/types";
import { PROJ_STATUS, ACTIVITY_TYPES, fmtIDR as fmtIDRFull, fmtDate, todayStr } from "@/lib/utils";
import { toast } from "./ui/Toast";

interface Props {
  open: boolean;
  project: Project | null;
  clients: Client[];
  activities: Activity[];
  team: string[];
  defaultProduct?: string;
  // Which tab an existing project opens on — lets list rows offer separate
  // "Detail" (view) and "Edit" (jump straight to the form) actions instead of
  // always landing on Detail first.
  initialTab?: "detail" | "edit";
  onSave: (p: Project) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onAddActivity: (a: Activity) => Promise<void>;
  onDeleteActivity: (id: string) => Promise<void>;
  onClose: () => void;
}

const PRODUCT_CATEGORIES = ["Solution", "Talent", "License", "Support", "IBM"] as const;
const IBM_PRODUCTS = ["IBM Filenet", "IBM MQ", "IBM BAW", "IBM BOB", "IBM Cloud Pak for Integration"] as const;

function parseProduct(product: string) {
  const ibmMatch = IBM_PRODUCTS.find(p => product === p);
  if (ibmMatch) return { category: "IBM", sub: ibmMatch };
  const cat = PRODUCT_CATEGORIES.find(c => c !== "IBM" && c === product);
  return { category: cat || "", sub: "" };
}

function fmtIDR(num: number): string {
  if (!num) return "";
  return num.toLocaleString("id-ID");
}

function emptyProject(defaultProduct = ""): Project {
  return { id: uuid(), name: "", client_id: "", product: defaultProduct, status: "Initiation", value: 0, golive: "", notes: "", partner: "" };
}

const emptyActivity = (projectId: string): Omit<Activity, "id" | "created_at"> => ({
  deal_id: null, project_id: projectId, client_id: null, type: "Note", description: "", date: todayStr(), created_by: "",
});

export default function ProjectModal({ open, project, clients, activities, team, defaultProduct = "", initialTab = "detail", onSave, onDelete, onAddActivity, onDeleteActivity, onClose }: Props) {
  const isEdit = !!project;
  const [form, setForm] = useState<Project>(emptyProject(defaultProduct));
  const [valueDisplay, setValueDisplay] = useState("");
  const [productCat, setProductCat] = useState("");
  const [ibmSub, setIbmSub] = useState("");
  const [saving, setSaving] = useState(false);
  const [savingActivity, setSavingActivity] = useState(false);
  const [tab, setTab] = useState<"detail" | "edit" | "activity">("edit");
  const [actForm, setActForm] = useState(emptyActivity(project?.id || ""));
  const [editingActivityId, setEditingActivityId] = useState<string | null>(null);

  useEffect(() => {
    const base = project || emptyProject(defaultProduct);
    setForm(base);
    setValueDisplay(fmtIDR(base.value || 0));
    const { category, sub } = parseProduct(base.product || "");
    setProductCat(category);
    setIbmSub(sub);
    setActForm(emptyActivity(base.id));
    setEditingActivityId(null);
    setTab(project ? initialTab : "edit");
  // Re-init only when the modal opens or a different project is opened — the
  // clients array is replaced by background polling and must not wipe edits.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project?.id, open, initialTab]);

  const set = (k: keyof Project, v: string | number) => setForm(f => ({ ...f, [k]: v }));

  async function handleSaveActivity() {
    if (!actForm.description.trim()) { toast("Deskripsi aktivitas wajib diisi.", { type: "error" }); return; }
    if (!actForm.created_by) { toast("Oleh wajib diisi.", { type: "error" }); return; }
    setSavingActivity(true);
    try {
      await onAddActivity({ ...actForm, id: editingActivityId || uuid(), project_id: form.id });
      setActForm(emptyActivity(form.id));
      setEditingActivityId(null);
    } catch {
      // useData's mutation helpers already surface the failure via error toast.
    } finally {
      setSavingActivity(false);
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

  function handleProductCatChange(cat: string) {
    setProductCat(cat);
    setIbmSub("");
    setForm(f => ({ ...f, product: cat === "IBM" ? "" : cat }));
  }

  function handleIbmSubChange(sub: string) {
    setIbmSub(sub);
    setForm(f => ({ ...f, product: sub }));
  }

  async function handleSave() {
    if (!form.name.trim()) { toast("Nama project wajib diisi.", { type: "error" }); return; }
    if (!form.client_id) { toast("Client wajib dipilih.", { type: "error" }); return; }
    setSaving(true);
    try {
      await onSave(form);
      onClose();
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    // No confirm() dialog — the Undo toast (see useUndoableDelete) is the
    // safety net: the record isn't actually deleted until that window passes.
    await onDelete(form.id);
    onClose();
  }

  const clientName = (id: string) => clients.find(c => c.id === id)?.name || "—";
  const tabCls = (t: string) => `modal-tab${tab === t ? " modal-tab-active" : ""}`;

  return (
    <Modal open={open} onClose={onClose} title={isEdit ? (tab === "detail" ? "Detail Project" : "Edit Project") : "Tambah Project"}>
      {isEdit && (
        <div className="modal-tabs">
          <button className={tabCls("detail")} onClick={() => setTab("detail")}>Detail</button>
          <button className={tabCls("edit")} onClick={() => setTab("edit")}>Edit</button>
          <button className={tabCls("activity")} onClick={() => setTab("activity")}>
            Aktivitas {activities.length > 0 && <span className="tab-badge">{activities.length}</span>}
          </button>
        </div>
      )}

      {isEdit && tab === "detail" && (
        <>
          <div className="dd-title-row">
            <div>
              <div className="dd-name">{form.name}</div>
              <div className="dd-client">{clientName(form.client_id)}</div>
            </div>
            <span className="badge">{form.status}</span>
          </div>
          <div className="dd-grid">
            <div className="dd-item"><div className="dd-label">Produk / Solusi</div><div className="dd-value">{form.product || "—"}</div></div>
            <div className="dd-item"><div className="dd-label">Nilai</div><div className="dd-value dd-value-brand">{fmtIDRFull(form.value)}</div></div>
            <div className="dd-item"><div className="dd-label">Target Go-Live</div><div className="dd-value">{form.golive ? fmtDate(form.golive) : "—"}</div></div>
            <div className="dd-item"><div className="dd-label">Partner</div><div className="dd-value">{form.partner || "—"}</div></div>
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

      {tab === "edit" && (
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
        <Field label="Status">
          <select className={selectCls} value={form.status} onChange={e => set("status", e.target.value as Project["status"])}>
            {PROJ_STATUS.map(s => <option key={s}>{s}</option>)}
          </select>
        </Field>
        <Field label="Nilai Project">
          <div style={{ position: "relative" }}>
            <span style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", fontSize: 12, color: "var(--ink-soft)", pointerEvents: "none" }}>IDR</span>
            <input
              className={inputCls}
              style={{ paddingLeft: 38 }}
              inputMode="numeric"
              value={valueDisplay}
              onChange={e => {
                const raw = e.target.value.replace(/\D/g, "");
                const num = parseInt(raw, 10) || 0;
                setValueDisplay(raw ? num.toLocaleString("id-ID") : "");
                setForm(f => ({ ...f, value: num }));
              }}
              placeholder="0"
            />
          </div>
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Produk / solusi">
          <select className={selectCls} value={productCat} onChange={e => handleProductCatChange(e.target.value)}>
            <option value="">— Pilih —</option>
            {PRODUCT_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          {productCat === "IBM" && (
            <select className={selectCls} style={{ marginTop: 6 }} value={ibmSub} onChange={e => handleIbmSubChange(e.target.value)}>
              <option value="">— Pilih Produk IBM —</option>
              {IBM_PRODUCTS.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          )}
        </Field>
        {form.status !== "Delivered" && (
          <Field label="Target go-live">
            <input type="date" className={inputCls} value={form.golive} onChange={e => set("golive", e.target.value)} />
          </Field>
        )}
      </div>
      <Field label="Partner (opsional)">
        <SearchableSelect
          options={clients.filter(c => c.id !== form.client_id).map(c => ({ value: c.name, label: c.name }))}
          value={form.partner || ""}
          onChange={v => set("partner", v)}
          placeholder="Cari partner…"
          clearLabel="— Tidak ada partner —"
        />
      </Field>
      <Field label="Catatan">
        <textarea className={textareaCls} value={form.notes} onChange={e => set("notes", e.target.value)} />
      </Field>
      <ModalActions>
        {isEdit && <button className="btn btn-danger" onClick={handleDelete} disabled={saving}>Hapus</button>}
        <button className="btn btn-ghost" onClick={onClose}>Batal</button>
        <button className="btn" onClick={handleSave} disabled={saving}>{saving && <span className="btn-spinner" />}{saving ? "Menyimpan…" : "Simpan"}</button>
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
                placeholder="Catat aktivitas, hasil update, dll…"
              />
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button className="btn btn-sm" onClick={handleSaveActivity} disabled={savingActivity}>
                {savingActivity ? "Menyimpan…" : editingActivityId ? "Simpan Perubahan" : "+ Tambah Aktivitas"}
              </button>
              {editingActivityId && (
                <button className="btn btn-ghost btn-sm" onClick={cancelEditActivity} disabled={savingActivity}>Batal Edit</button>
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
    </Modal>
  );
}
