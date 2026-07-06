"use client";
import { useState } from "react";
import { AppData } from "@/hooks/useData";
import { useUndoableDelete } from "@/hooks/useUndoableDelete";
import { Deal, CRMDocument, Activity } from "@/types";
import { STAGE_COLOR, fmtIDR, fmtDate, isClosedStage } from "@/lib/utils";
import { exportDeals } from "@/lib/export";
import DealModal from "./DealModal";
import EmptyState from "./ui/EmptyState";
import FilterSheet, { FilterField } from "./ui/FilterSheet";
import SortableTh, { SortDir } from "./ui/SortableTh";
import { Download } from "lucide-react";

type OptySortKey = "name" | "client" | "stage" | "value" | "close_date";

interface Props {
  data: AppData;
  currentUserName: string;
  isViewer?: boolean;
  onSaveDeal: (d: Deal) => Promise<void>;
  onDeleteDeal: (id: string) => Promise<void>;
  onAddDocument: (d: CRMDocument) => Promise<void>;
  onDeleteDocument: (id: string) => Promise<void>;
  onUploadAttachment: (file: File, dealId: string) => Promise<void>;
  onDeleteAttachment: (id: string) => Promise<void>;
  onAddActivity: (a: Activity) => Promise<void>;
  onDeleteActivity: (id: string) => Promise<void>;
}

// Oppty tab is Pipeline's flip side — a flat table of deals that haven't
// closed yet (won or lost), so "which ones are already a Project" (the
// Project tab) vs "which ones are still just an opportunity" is a single
// glance instead of scanning the Pipeline kanban's stage columns.
// Talent-product deals are excluded here — they live under the Talent tab
// instead (see components/Talent.tsx), so they aren't listed twice.
export default function Opty({
  data, currentUserName, isViewer, onSaveDeal, onDeleteDeal,
  onAddDocument, onDeleteDocument, onUploadAttachment, onDeleteAttachment,
  onAddActivity, onDeleteActivity,
}: Props) {
  const { clients, products, documents, attachments, activities, profiles } = data;
  const { isPending, requestDelete } = useUndoableDelete(onDeleteDeal);
  const deals = data.deals.filter(d => !isPending(d.id) && !isClosedStage(d.stage) && d.product !== "Talent");
  async function handleDeleteDeal(id: string) {
    const d = data.deals.find(x => x.id === id);
    requestDelete(id, d ? `Deal "${d.name}"` : "Deal");
  }
  const team = profiles.filter(p => !["super_admin", "admin", "viewer"].includes(p.role)).map(p => p.name).filter(Boolean);
  const [search, setSearch] = useState("");
  const [ownerFilter, setOwnerFilter] = useState("all");
  const [modalOpen, setModalOpen] = useState(false);
  const [editDeal, setEditDeal] = useState<Deal | null>(null);
  const [sortKey, setSortKey] = useState<OptySortKey | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  const clientName = (id: string) => clients.find(c => c.id === id)?.name || "—";

  const filtered = deals.filter(d => {
    const matchSearch = d.name.toLowerCase().includes(search.toLowerCase()) || clientName(d.client_id).toLowerCase().includes(search.toLowerCase());
    const matchOwner = ownerFilter === "all" || d.owner === ownerFilter;
    return matchSearch && matchOwner;
  });

  function toggleSort(key: OptySortKey) {
    if (key === sortKey) setSortDir(dir => dir === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir("asc"); }
  }
  const sorted = sortKey ? [...filtered].sort((a, b) => {
    let cmp = 0;
    switch (sortKey) {
      case "name": cmp = a.name.localeCompare(b.name); break;
      case "client": cmp = clientName(a.client_id).localeCompare(clientName(b.client_id)); break;
      case "stage": cmp = a.stage.localeCompare(b.stage); break;
      case "value": cmp = a.value - b.value; break;
      case "close_date": cmp = (a.close_date || "").localeCompare(b.close_date || ""); break;
    }
    return sortDir === "asc" ? cmp : -cmp;
  }) : filtered;

  function openEdit(d: Deal) { setEditDeal(d); setModalOpen(true); }

  const dealDocuments = editDeal ? documents.filter(d => d.deal_id === editDeal.id) : [];
  const dealAttachments = editDeal ? attachments.filter(a => a.deal_id === editDeal.id) : [];
  const dealActivities = editDeal ? activities.filter(a => a.deal_id === editDeal.id) : [];

  return (
    <section>
      <div className="toolbar">
        <input className="search" value={search} onChange={e => setSearch(e.target.value)} placeholder="Cari opportunity / client…" />
        <span className="filter-inline">
          <select
            value={ownerFilter}
            onChange={e => setOwnerFilter(e.target.value)}
            style={{ fontSize: 13, padding: "4px 10px", borderRadius: 6, border: "1px solid var(--line)", background: "var(--card)", color: "var(--ink)", cursor: "pointer" }}
          >
            <option value="all">Semua Sales</option>
            {team.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </span>
        <FilterSheet>
          <FilterField label="Sales">
            <select value={ownerFilter} onChange={e => setOwnerFilter(e.target.value)}>
              <option value="all">Semua Sales</option>
              {team.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </FilterField>
        </FilterSheet>
        <button className="btn btn-ghost btn-sm" onClick={() => exportDeals(deals, clientName)}><Download size={13} /> Export Excel</button>
        {!isViewer && <button className="btn add-btn-desktop" onClick={() => { setEditDeal(null); setModalOpen(true); }}>+ Oppty Baru</button>}
      </div>

      {!isViewer && <button className="fab" onClick={() => { setEditDeal(null); setModalOpen(true); }} aria-label="Tambah Oppty">+</button>}
      <div className="panel">
        <table className="data-table">
          <thead>
            <tr>
              <SortableTh active={sortKey === "name"} dir={sortDir} onClick={() => toggleSort("name")}>Opportunity</SortableTh>
              <SortableTh active={sortKey === "client"} dir={sortDir} onClick={() => toggleSort("client")}>Client</SortableTh>
              <SortableTh active={sortKey === "stage"} dir={sortDir} onClick={() => toggleSort("stage")}>Stage</SortableTh>
              <th>Owner</th>
              <SortableTh active={sortKey === "value"} dir={sortDir} onClick={() => toggleSort("value")}>Nilai</SortableTh>
              <SortableTh active={sortKey === "close_date"} dir={sortDir} onClick={() => toggleSort("close_date")}>Target Closing</SortableTh>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {sorted.length ? sorted.map(d => (
              <tr key={d.id} onClick={() => openEdit(d)} style={{ cursor: "pointer" }}>
                <td><b>{d.name}</b>{d.product && <><br /><span className="muted" style={{ fontSize: 11 }}>{d.product}</span></>}</td>
                <td>{clientName(d.client_id)}</td>
                <td>
                  <span className="badge" style={{ background: `${STAGE_COLOR[d.stage] || "var(--brand)"}22`, color: STAGE_COLOR[d.stage] || "var(--brand)" }}>
                    {d.stage}
                  </span>
                </td>
                <td>{d.owner || "—"}</td>
                <td>{fmtIDR(d.value)}</td>
                <td>{fmtDate(d.close_date)}</td>
                <td>
                  <span style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                    {!isViewer && <button className="btn btn-ghost btn-sm" onClick={e => { e.stopPropagation(); openEdit(d); }}>Edit</button>}
                  </span>
                </td>
              </tr>
            )) : <tr><td colSpan={7}><EmptyState icon="🎯" label="Belum ada opportunity" sub="Coba ubah filter, atau tambah opportunity pertama Anda" /></td></tr>}
          </tbody>
        </table>

        {!sorted.length && (
          <div className="mobile-only">
            <EmptyState icon="🎯" label="Belum ada opportunity" sub="Coba ubah filter, atau tambah opportunity pertama Anda" />
          </div>
        )}

        {sorted.length > 0 && (
          <div className="mobile-cards">
            {sorted.map(d => (
              <div key={d.id} className="mcard" onClick={() => openEdit(d)}>
                <div className="mcard-head">
                  <div className="mcard-title">{d.name}</div>
                  <span className="chip" style={{ background: `${STAGE_COLOR[d.stage] || "var(--brand)"}22`, color: STAGE_COLOR[d.stage] || "var(--brand)" }}>{d.stage}</span>
                </div>
                <div className="mcard-row"><span>Client</span><b>{clientName(d.client_id)}</b></div>
                <div className="mcard-row"><span>Owner</span><b>{d.owner || "—"}</b></div>
                <div className="mcard-row"><span>Nilai</span><b>{fmtIDR(d.value)}</b></div>
                <div className="mcard-row"><span>Target Closing</span><b>{fmtDate(d.close_date)}</b></div>
                {!isViewer && (
                  <div className="mcard-actions">
                    <button className="btn btn-ghost btn-sm" onClick={e => { e.stopPropagation(); openEdit(d); }}>Edit</button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <DealModal
        open={modalOpen} deal={editDeal} clients={clients} products={products} team={team} defaultOwner={currentUserName}
        documents={dealDocuments} attachments={dealAttachments} activities={dealActivities}
        onSave={onSaveDeal} onDelete={handleDeleteDeal}
        onAddDocument={onAddDocument} onDeleteDocument={onDeleteDocument}
        onUploadAttachment={onUploadAttachment} onDeleteAttachment={onDeleteAttachment}
        onAddActivity={onAddActivity} onDeleteActivity={onDeleteActivity}
        onClose={() => setModalOpen(false)}
      />
    </section>
  );
}
