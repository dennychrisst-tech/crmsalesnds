"use client";
import { useState, useEffect } from "react";
import { v4 as uuid } from "uuid";
import Modal, { Field, inputCls, selectCls, textareaCls, ModalActions } from "./ui/Modal";
import SearchableSelect from "./ui/SearchableSelect";
import { VisitBadge } from "./ui/Badge";
import { toast } from "./ui/Toast";
import { Visit, Client, Contact, Deal, Task } from "@/types";
import { VISIT_STATUS, STAGE_COLOR, todayStr, picList, fmtDate } from "@/lib/utils";

interface Props {
  open: boolean;
  visit: Visit | null;
  preClientId?: string;
  preDate?: string;
  clients: Client[];
  contacts: Contact[];
  deals: Deal[];
  visits: Visit[];
  team: string[];
  defaultPic?: string;
  onSave: (v: Visit) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onCreateTask?: (t: Task) => Promise<void>;
  onCreateDeal?: (d: Deal) => Promise<void>;
  // Keeps the contact's jabatan in the Client menu in sync when it's edited here
  onSaveContact?: (c: Contact) => Promise<void>;
  onClose: () => void;
}

interface TaskDraft {
  title: string;
  due_date: string;
  assigned_to: string;
  notes: string;
}

function emptyVisit(clientId: string, defaultPic = "", date = todayStr()): Visit {
  return {
    id: uuid(), client_id: clientId, deal_id: null, date,
    purpose: "", approach: "", status: "Planned",
    pic: defaultPic, pic_client: "", jabatan: "",
    followup_date: null, summary: "", rescheduled_to_id: null, rescheduled_from_id: null,
  };
}

export default function VisitModal({ open, visit, preClientId, preDate, clients, contacts, deals, visits, team, defaultPic = "", onSave, onDelete, onCreateTask, onCreateDeal, onSaveContact, onClose }: Props) {
  const isEdit = !!visit;
  const [form, setForm] = useState<Visit>(emptyVisit("", defaultPic));
  const [tab, setTab] = useState<"detail" | "edit">("edit");
  const [task, setTask] = useState<TaskDraft>({ title: "", due_date: "", assigned_to: "", notes: "" });
  const [pic1, setPic1] = useState(defaultPic);
  const [pic2, setPic2] = useState("");
  const [manualPic, setManualPic] = useState(false);
  const [saving, setSaving] = useState(false);

  const clientName = (id: string) => clients.find(c => c.id === id)?.name || "";
  const deal = (id: string | null | undefined) => id ? deals.find(d => d.id === id) || null : null;
  const dealName = (id: string | null | undefined) => deal(id)?.name || "";

  function buildDefaultTask(f: Visit): TaskDraft {
    return {
      title: `Follow-up: ${clientName(f.client_id)}${f.deal_id ? ` · ${dealName(f.deal_id)}` : ""}`,
      due_date: f.followup_date || "",
      assigned_to: picList(f.pic)[0] || "",
      notes: f.pic_client ? `PIC Client: ${f.pic_client}${f.jabatan ? ` (${f.jabatan})` : ""}` : "",
    };
  }

  useEffect(() => {
    if (visit) {
      const date = visit.date || todayStr();
      const matchingContact = contacts.find(c => c.client_id === visit.client_id && c.name === visit.pic_client);
      const restored: Visit = {
        ...visit,
        // Old visits without a jabatan fall back to the contact's title from the Client menu
        jabatan: visit.jabatan || matchingContact?.title || "",
        deal_id: visit.deal_id ?? null,
        followup_date: visit.followup_date ?? null,
        rescheduled_to_id: visit.rescheduled_to_id ?? null,
        rescheduled_from_id: visit.rescheduled_from_id ?? null,
      };
      setForm(restored);
      const [a = "", b = ""] = picList(visit.pic);
      setPic1(a); setPic2(b);
      setManualPic(!!visit.pic_client && !matchingContact);
      setTab("detail");
      if (visit.status === "Done") setTask(buildDefaultTask(restored));
    } else {
      const f = emptyVisit(preClientId || "", defaultPic, preDate || todayStr());
      setForm(f);
      setPic1(defaultPic); setPic2("");
      setManualPic(false);
      setTab("edit");
      setTask({ title: "", due_date: "", assigned_to: "", notes: "" });
    }
  // Re-init only when the modal opens or a different visit is opened — the
  // clients/contacts arrays are replaced by background polling and must not
  // wipe a summary that's being typed.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visit?.id, preClientId, preDate, open]);

  const set = (k: keyof Visit, v: string | null) => setForm(f => ({ ...f, [k]: v }));
  const setT = (k: keyof TaskDraft, v: string) => setTask(t => ({ ...t, [k]: v }));

  function updatePic(a: string, b: string) {
    setPic1(a); setPic2(b);
    setForm(f => ({ ...f, pic: [a, b].filter(Boolean).join(", ") }));
  }

  const clientContacts = contacts.filter(c => c.client_id === form.client_id);
  const clientDeals = deals.filter(d => d.client_id === form.client_id);
  const isDone = form.status === "Done";
  const isReschedule = form.status === "Reschedule";

  function handleClientChange(clientId: string) {
    setForm(f => ({ ...f, client_id: clientId, pic_client: "", jabatan: "", deal_id: null }));
    setManualPic(false);
  }

  async function handleCreateDeal(name: string) {
    if (!onCreateDeal || !form.client_id) return;
    const id = uuid();
    await onCreateDeal({
      id, name, client_id: form.client_id, value: 0,
      stage: "Approching", deal_type: "", product: "", close_date: "",
      notes: "", owner: picList(form.pic)[0] || "", win_loss_reason: "", competitor: "",
      stage_updated_at: new Date().toISOString(),
    });
    set("deal_id", id);
  }

  function handleContactChange(name: string) {
    const contact = clientContacts.find(c => c.name === name);
    // Jabatan follows the selected contact — don't carry the previous contact's title over
    setForm(f => ({ ...f, pic_client: name, jabatan: contact?.title || "" }));
  }

  function handleStatusChange(status: Visit["status"]) {
    setForm(f => {
      const next = { ...f, status };
      if (status === "Done") setTask(buildDefaultTask(next));
      return next;
    });
  }

  async function handleSave() {
    if (!form.client_id) { toast("Client wajib dipilih.", { type: "error" }); return; }
    if (!form.date) { toast("Tanggal approach wajib diisi.", { type: "error" }); return; }
    if (isReschedule && !form.followup_date) { toast("Tanggal reschedule wajib diisi untuk membuat jadwal baru.", { type: "error" }); return; }

    setSaving(true);
    try {
      let toSave: Visit = form;
      if (isReschedule && form.followup_date) {
        // The linked follow-up visit may have been deleted independently since
        // it was created — check it still exists before doing a date-only
        // partial update, otherwise Prisma's upsert falls through to its create
        // path and 500s on the missing required fields.
        const linkedChildExists = !!form.rescheduled_to_id && visits.some(v => v.id === form.rescheduled_to_id);
        if (linkedChildExists) {
          // Already spawned a follow-up visit from an earlier save — just move
          // its date if the reschedule date was changed again, instead of
          // creating another duplicate visit.
          await onSave({ id: form.rescheduled_to_id, date: form.followup_date } as unknown as Visit);
        } else {
          const newId = uuid();
          await onSave({
            id: newId, client_id: form.client_id, deal_id: form.deal_id ?? null,
            date: form.followup_date, purpose: form.purpose, approach: form.approach, status: "Planned",
            pic: form.pic, pic_client: form.pic_client, jabatan: form.jabatan,
            followup_date: null, summary: "", rescheduled_from_id: form.id,
          });
          toSave = { ...form, rescheduled_to_id: newId };
        }
      } else if (form.rescheduled_to_id) {
        // Status moved away from Reschedule — drop the link so a future
        // reschedule starts fresh. The follow-up visit already created stays
        // as-is; it isn't deleted since it may already hold its own detail.
        toSave = { ...form, rescheduled_to_id: null };
      }

      await onSave(toSave);
      // Jabatan edited here flows back to the contact in the Client menu, so both
      // stay one source of truth.
      const jabatan = (form.jabatan || "").trim();
      const contact = clientContacts.find(c => c.name === form.pic_client);
      if (onSaveContact && contact && jabatan && jabatan !== contact.title) {
        await onSaveContact({ ...contact, title: jabatan });
      }
      if (isDone && onCreateTask && task.title.trim()) {
        // Reuse the visit's own id (like the Visit->Activity sync) so re-saving
        // an already-Done visit upserts the same follow-up task instead of
        // minting a new duplicate every time.
        await onCreateTask({
          id: form.id,
          title: task.title.trim(),
          due_date: task.due_date,
          client_id: form.client_id,
          deal_id: form.deal_id ?? null,
          pic_client: form.pic_client || "",
          assigned_to: task.assigned_to || picList(form.pic)[0] || "",
          status: "Open",
          notes: task.notes,
        });
      }
      onClose();
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!confirm("Hapus visit ini?")) return;
    await onDelete(form.id);
    onClose();
  }

  const sectionStyle: React.CSSProperties = {
    borderTop: "1px dashed var(--line)",
    marginTop: 16, paddingTop: 14,
  };

  const tabCls = (t: string) => `modal-tab${tab === t ? " modal-tab-active" : ""}`;
  const visitDeal = deal(form.deal_id);

  return (
    <Modal open={open} onClose={onClose} title={isEdit ? (tab === "detail" ? "Detail Visit" : "Edit Visit") : "Jadwalkan Visit"}>
      {isEdit && (
        <div className="modal-tabs">
          <button className={tabCls("detail")} onClick={() => setTab("detail")}>Detail</button>
          <button className={tabCls("edit")} onClick={() => setTab("edit")}>Edit</button>
        </div>
      )}

      {tab === "detail" && isEdit && (
        <>
          <div className="dd-title-row">
            <div>
              <div className="dd-name">{clientName(form.client_id)}</div>
              <div className="dd-client">{fmtDate(form.date)}{form.approach ? ` · ${form.approach}` : ""}</div>
            </div>
            <VisitBadge status={form.status} />
          </div>
          {form.rescheduled_from_id && (
            <div style={{ fontSize: 12, color: "var(--brand)", marginTop: -4, marginBottom: 10 }}>
              ↩ Jadwal ini dibuat dari reschedule visit sebelumnya
            </div>
          )}
          <div className="dd-grid">
            <div className="dd-item"><div className="dd-label">Project</div><div className="dd-value">{visitDeal?.name || "—"}</div></div>
            <div className="dd-item">
              <div className="dd-label">Stage</div>
              <div className="dd-value">
                {visitDeal ? <span style={{ color: STAGE_COLOR[visitDeal.stage] || "var(--brand)" }}>{visitDeal.stage}</span> : "—"}
              </div>
            </div>
            <div className="dd-item"><div className="dd-label">PIC Client</div><div className="dd-value">{form.pic_client || "—"}</div></div>
            <div className="dd-item"><div className="dd-label">Jabatan</div><div className="dd-value">{form.jabatan || "—"}</div></div>
            <div className="dd-item"><div className="dd-label">PIC NDS Sales</div><div className="dd-value">{picList(form.pic).join(" & ") || "—"}</div></div>
            <div className="dd-item">
              <div className="dd-label">{isReschedule ? "Tanggal Reschedule" : "Tanggal Follow-up"}</div>
              <div className="dd-value">
                {form.followup_date ? fmtDate(form.followup_date) : "—"}
                {isReschedule && form.rescheduled_to_id && <span style={{ color: "var(--brand)" }}> · jadwal baru sudah dibuat</span>}
              </div>
            </div>
          </div>
          <div className="dd-block">
            <div className="dd-label">Tujuan Visit</div>
            <div className="dd-text">{form.purpose || "—"}</div>
          </div>
          {form.status === "Done" && (
            <div className="dd-block">
              <div className="dd-label">Summary / Hasil</div>
              <div className="dd-text">{form.summary || "—"}</div>
            </div>
          )}
          <ModalActions>
            <button className="btn btn-ghost" onClick={onClose}>Tutup</button>
          </ModalActions>
        </>
      )}

      {tab === "edit" && (
        <>
      <Field label="Client">
        <SearchableSelect
          options={clients.map(c => ({ value: c.id, label: c.name }))}
          value={form.client_id}
          onChange={handleClientChange}
          placeholder="Cari client…"
        />
      </Field>

      <Field label="Project">
        <SearchableSelect
          options={clientDeals.map(d => ({ value: d.id, label: d.name }))}
          value={form.deal_id || ""}
          onChange={v => set("deal_id", v || null)}
          placeholder="Cari atau buat project…"
          clearLabel="— Tidak terkait project —"
          onCreate={onCreateDeal && form.client_id ? handleCreateDeal : undefined}
          createLabel={q => `+ Buat project baru: "${q}"`}
        />
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Tanggal approach">
          <input type="date" className={inputCls} value={form.date} onChange={e => set("date", e.target.value)} />
        </Field>
        <Field label="Status">
          <select className={selectCls} value={form.status} onChange={e => handleStatusChange(e.target.value as Visit["status"])}>
            {VISIT_STATUS.map(s => <option key={s}>{s}</option>)}
          </select>
        </Field>
      </div>

      {(isDone || isReschedule) && (
        <Field label={isReschedule ? "Tanggal Reschedule (jadwal visit baru)" : "Tanggal follow-up"}>
          <input type="date" className={inputCls} value={form.followup_date || ""} onChange={e => set("followup_date", e.target.value || null)} />
        </Field>
      )}

      <div className="grid grid-cols-2 gap-3">
        <Field label="PIC Client yang dikunjungi">
          {clientContacts.length > 0 ? (
            <select
              className={selectCls}
              value={manualPic ? "__other__" : form.pic_client}
              onChange={e => {
                if (e.target.value === "__other__") {
                  setManualPic(true);
                  set("pic_client", "");
                } else {
                  setManualPic(false);
                  handleContactChange(e.target.value);
                }
              }}
            >
              <option value="">— Pilih kontak —</option>
              {clientContacts.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
              <option value="__other__">Lainnya (isi manual)</option>
            </select>
          ) : (
            <input className={inputCls} value={form.pic_client} onChange={e => set("pic_client", e.target.value)} placeholder="Nama kontak di client" />
          )}
          {clientContacts.length > 0 && manualPic && (
            <input className={inputCls} style={{ marginTop: 6 }} value={form.pic_client} onChange={e => set("pic_client", e.target.value)} placeholder="Nama kontak (manual)" />
          )}
        </Field>
        <Field label="Jabatan">
          <input className={inputCls} value={form.jabatan || ""} onChange={e => set("jabatan", e.target.value)} placeholder="Mis. IT Manager, Direktur" />
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field label="PIC NDS Sales 1">
          <select className={selectCls} value={pic1} onChange={e => updatePic(e.target.value, pic2)}>
            <option value="">— Pilih —</option>
            {team.filter(t => t !== pic2).map(t => <option key={t}>{t}</option>)}
          </select>
        </Field>
        <Field label="PIC NDS Sales 2 (opsional)">
          <select className={selectCls} value={pic2} onChange={e => updatePic(pic1, e.target.value)}>
            <option value="">— Tidak ada —</option>
            {team.filter(t => t !== pic1).map(t => <option key={t}>{t}</option>)}
          </select>
        </Field>
      </div>

      <Field label="Jenis approach">
        <select className={selectCls} value={form.approach} onChange={e => set("approach", e.target.value)}>
          <option value="">— Pilih —</option>
          <option value="First Meeting">First Meeting</option>
          <option value="Negosiasi">Negosiasi</option>
          <option value="Followup">Followup</option>
          <option value="Maintain Relation">Maintain Relation</option>
        </select>
      </Field>
      <Field label="Tujuan visit">
        <input className={inputCls} value={form.purpose} onChange={e => set("purpose", e.target.value)} placeholder="Mis. business introduction, review SLA" />
      </Field>

      {/* Summary & Task — hanya muncul saat status Done */}
      {isDone && (
        <>
          <div style={sectionStyle}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "var(--ink-soft)", textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 10 }}>
              Hasil Visit
            </div>
            <Field label="Summary / Hasil">
              <textarea className={textareaCls} value={form.summary} onChange={e => set("summary", e.target.value)} placeholder="Ringkasan hasil pertemuan & next step" />
            </Field>
          </div>

          {onCreateTask && (
            <div style={sectionStyle}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "var(--ink-soft)", textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 10 }}>
                Buat Task Follow-up <span style={{ fontWeight: 400, textTransform: "none", fontSize: 11 }}>(kosongkan judul jika tidak perlu)</span>
              </div>
              <Field label="Judul task">
                <input className={inputCls} value={task.title} onChange={e => setT("title", e.target.value)} placeholder="Mis. Follow-up proposal ke Siloam Hospital" />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Due date">
                  <input type="date" className={inputCls} value={task.due_date} onChange={e => setT("due_date", e.target.value)} />
                </Field>
                <Field label="Assign ke">
                  <select className={selectCls} value={task.assigned_to} onChange={e => setT("assigned_to", e.target.value)}>
                    <option value="">— Pilih —</option>
                    {team.map(t => <option key={t}>{t}</option>)}
                  </select>
                </Field>
              </div>
              <Field label="Catatan task">
                <input className={inputCls} value={task.notes} onChange={e => setT("notes", e.target.value)} placeholder="Detail task (opsional)" />
              </Field>
            </div>
          )}
        </>
      )}

      <ModalActions>
        {isEdit && <button className="btn btn-danger" onClick={handleDelete} disabled={saving}>Hapus</button>}
        <button className="btn btn-ghost" onClick={onClose}>Batal</button>
        <button className="btn" onClick={handleSave} disabled={saving}>{saving ? "Menyimpan…" : "Simpan"}</button>
      </ModalActions>
        </>
      )}
    </Modal>
  );
}
