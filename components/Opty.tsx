"use client";
import { useState } from "react";
import { AppData } from "@/hooks/useData";
import { useUndoableDelete } from "@/hooks/useUndoableDelete";
import { Deal, CRMDocument, Activity } from "@/types";
import { STAGES, STAGE_COLOR, fmtIDR, fmtDate, isClosedStage } from "@/lib/utils";
import { exportDeals } from "@/lib/export";
import DealModal from "./DealModal";
import EmptyState from "./ui/EmptyState";
import FilterSheet, { FilterField } from "./ui/FilterSheet";
import SortableTh, { SortDir } from "./ui/SortableTh";
import Pagination from "./ui/Pagination";
import { usePagination } from "@/hooks/usePagination";
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
  const { clients, contacts, products, documents, attachments, activities, profiles } = data;
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
  const [modalTab, setModalTab] = useState<"detail" | "info">("detail");
  const [sortKey, setSortKey] = useState<OptySortKey | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [expandedActivityClients, setExpandedActivityClients] = useState<Set<string>>(new Set());
  const [showClientProgress, setShowClientProgress] = useState(false);

  function toggleActivityClient(id: string) {
    setExpandedActivityClients(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  const clientName = (id: string) => clients.find(c => c.id === id)?.name || "—";
  const stageIndex = (stage: string) => STAGES.indexOf(stage as typeof STAGES[number]);

  // Per-client rollup: for clients with more than one open opportunity, show
  // whichever one is furthest along the pipeline as "where they're at" —
  // gives a one-glance read on client progress without opening every deal.
  const clientProgress = Object.values(
    deals.reduce((acc, d) => {
      const key = d.client_id;
      if (!acc[key] || stageIndex(d.stage) > stageIndex(acc[key].stage)) {
        acc[key] = { client_id: key, stage: d.stage, count: (acc[key]?.count || 0) + 1, value: (acc[key]?.value || 0) + d.value };
      } else {
        acc[key] = { ...acc[key], count: acc[key].count + 1, value: acc[key].value + d.value };
      }
      return acc;
    }, {} as Record<string, { client_id: string; stage: string; count: number; value: number }>)
  ).sort((a, b) => stageIndex(b.stage) - stageIndex(a.stage));

  const dealById = (id: string | null) => deals.find(d => d.id === id) || null;
  const contactName = (clientId: string) => contacts.find(c => c.client_id === clientId)?.name || "—";

  // Latest activity log entries per client, across that client's open
  // opportunities on this page — a quick "what happened lately" feed per
  // client without opening each deal one by one.
  const dealIds = new Set(deals.map(d => d.id));
  const sortedActivities = [...activities]
    .filter(a => a.deal_id && dealIds.has(a.deal_id))
    .sort((a, b) => (b.date || b.created_at || "").localeCompare(a.date || a.created_at || ""));

  // "Terakhir Update" per oppty — deals have no generic updated_at column, so
  // the most recent activity log entry stands in as "when this was last
  // touched" (sortedActivities is already newest-first, so the first hit per
  // deal wins).
  const lastActivityDate = new Map<string, string>();
  for (const a of sortedActivities) {
    if (!lastActivityDate.has(a.deal_id!)) lastActivityDate.set(a.deal_id!, a.date || a.created_at || "");
  }

  // Technova is the reseller NDS goes through to reach Sequis Life — same
  // deal chain split across two client records, so their activity feeds are
  // combined into one section instead of listed separately.
  const MERGED_ACTIVITY_CLIENTS = ["Sequis Life", "Technova"];
  function activityGroupFor(clientId: string): { key: string; label: string } {
    const name = clientName(clientId);
    if (MERGED_ACTIVITY_CLIENTS.some(n => n.toLowerCase() === name.toLowerCase())) {
      return { key: MERGED_ACTIVITY_CLIENTS.join("|"), label: MERGED_ACTIVITY_CLIENTS.join(" / ") };
    }
    return { key: clientId, label: name };
  }

  const activitiesByClient = new Map<string, { label: string; items: Activity[] }>();
  for (const a of sortedActivities) {
    const clientId = dealById(a.deal_id)!.client_id;
    const { key, label } = activityGroupFor(clientId);
    const group = activitiesByClient.get(key) || { label, items: [] };
    if (group.items.length < 10) group.items.push(a);
    activitiesByClient.set(key, group);
  }
  const clientActivityGroups = [...activitiesByClient.entries()]
    .map(([key, { label, items }]) => ({ key, label, items }))
    .sort((a, b) => (b.items[0].date || b.items[0].created_at || "").localeCompare(a.items[0].date || a.items[0].created_at || ""));

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

  function openEdit(d: Deal, tab: "detail" | "info" = "detail") { setEditDeal(d); setModalTab(tab); setModalOpen(true); }

  const { page, setPage, totalPages, totalItems, pageSize, paged } = usePagination(sorted, 25);

  const dealDocuments = editDeal ? documents.filter(d => d.deal_id === editDeal.id) : [];
  const dealAttachments = editDeal ? attachments.filter(a => a.deal_id === editDeal.id) : [];
  const dealActivities = editDeal ? activities.filter(a => a.deal_id === editDeal.id) : [];

  return (
    <section>
      {clientProgress.length > 0 && (
        <div className="panel" style={{ marginBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: showClientProgress ? 12 : 0 }}>
            <h3 style={{ margin: 0, fontSize: 15 }}>Progress per Client</h3>
            <span style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              <span className="muted" style={{ fontSize: 12 }}>{clientProgress.length} client aktif</span>
              <button className="btn btn-ghost btn-sm" onClick={() => setShowClientProgress(v => !v)}>
                {showClientProgress ? "Sembunyikan" : "Tampilkan"}
              </button>
            </span>
          </div>
          {showClientProgress && (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {clientProgress.map(c => {
                const color = STAGE_COLOR[c.stage] || "var(--brand)";
                return (
                  <div
                    key={c.client_id}
                    className="funnel-row"
                    style={{ cursor: "pointer", flexWrap: "wrap" }}
                    onClick={() => setSearch(clientName(c.client_id))}
                    title="Klik untuk filter tabel ke client ini"
                  >
                    <div className="opty-progress-name">
                      {clientName(c.client_id)}
                    </div>
                    <div className="funnel-track" style={{ flex: 1, minWidth: 80 }}>
                      <div className="funnel-fill" style={{
                        width: `${((stageIndex(c.stage) + 1) / STAGES.length) * 100}%`,
                        background: color,
                      }} />
                    </div>
                    <span className="badge opty-progress-stage" style={{ background: `${color}22`, color }}>
                      {c.stage}
                    </span>
                    <div className="opty-progress-value">{fmtIDR(c.value)}</div>
                    <div className="opty-progress-count">{c.count} oppty</div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {clientActivityGroups.length > 0 && (
        <div className="panel" style={{ marginBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12, flexWrap: "wrap", gap: 8 }}>
            <h3 style={{ margin: 0, fontSize: 15 }}>Aktivitas Terakhir per Client</h3>
            <span style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              <span className="muted" style={{ fontSize: 12 }}>maks. 10 aktivitas / client</span>
              <button className="btn btn-ghost btn-sm" onClick={() => setExpandedActivityClients(new Set(clientActivityGroups.map(g => g.key)))}>Tampilkan Semua</button>
              <button className="btn btn-ghost btn-sm" onClick={() => setExpandedActivityClients(new Set())}>Sembunyikan Semua</button>
            </span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {clientActivityGroups.map(g => {
              const isOpen = expandedActivityClients.has(g.key);
              const isMerged = new Set(g.items.map(a => dealById(a.deal_id)?.client_id)).size > 1;
              return (
                <div key={g.key}>
                  <button
                    className="ccard-collapse-toggle"
                    style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}
                    onClick={() => toggleActivityClient(g.key)}
                  >
                    <span style={{ minWidth: 0 }}>{isOpen ? "▾" : "▸"} <b style={{ color: "var(--ink)", fontSize: 15 }}>{g.label}</b> <span style={{ fontSize: 11 }}>({g.items.length} aktivitas)</span></span>
                    <span className="muted" style={{ flexShrink: 0, whiteSpace: "nowrap" }}>{fmtDate((g.items[0].date || g.items[0].created_at || "").slice(0, 10))}</span>
                  </button>
                  {isOpen && (
                    <table className="table-zebra">
                      <thead>
                        <tr>
                          <th>Tanggal</th>{isMerged && <th>Client</th>}<th>PIC Handle</th><th>PIC Client</th><th>Oppty</th><th>Aktivitas</th>
                        </tr>
                      </thead>
                      <tbody>
                        {g.items.map(a => {
                          const deal = dealById(a.deal_id);
                          return (
                            <tr key={a.id} style={{ cursor: deal ? "pointer" : "default" }} onClick={() => deal && openEdit(deal, "detail")}>
                              <td>{fmtDate((a.date || a.created_at || "").slice(0, 10))}</td>
                              {isMerged && <td>{deal ? clientName(deal.client_id) : "—"}</td>}
                              <td>{a.created_by || "—"}</td>
                              <td>{deal ? contactName(deal.client_id) : "—"}</td>
                              <td>{deal?.name || "—"}</td>
                              <td>{a.description}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

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
              <th>Update Terakhir</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {sorted.length ? paged.map(d => (
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
                <td>{lastActivityDate.has(d.id) ? fmtDate(lastActivityDate.get(d.id)!.slice(0, 10)) : <span className="muted">—</span>}</td>
                <td>
                  <span style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                    <button className="btn btn-ghost btn-sm" onClick={e => { e.stopPropagation(); openEdit(d, "detail"); }}>Detail</button>
                    {!isViewer && <button className="btn btn-ghost btn-sm" onClick={e => { e.stopPropagation(); openEdit(d, "info"); }}>Edit</button>}
                  </span>
                </td>
              </tr>
            )) : <tr><td colSpan={8}><EmptyState icon="🎯" label="Belum ada opportunity" sub="Coba ubah filter, atau tambah opportunity pertama Anda" /></td></tr>}
          </tbody>
        </table>

        {!sorted.length && (
          <div className="mobile-only">
            <EmptyState icon="🎯" label="Belum ada opportunity" sub="Coba ubah filter, atau tambah opportunity pertama Anda" />
          </div>
        )}

        {sorted.length > 0 && (
          <div className="mobile-cards">
            {paged.map(d => (
              <div key={d.id} className="mcard" onClick={() => openEdit(d)}>
                <div className="mcard-head">
                  <div className="mcard-title">{d.name}</div>
                  <span className="chip" style={{ background: `${STAGE_COLOR[d.stage] || "var(--brand)"}22`, color: STAGE_COLOR[d.stage] || "var(--brand)" }}>{d.stage}</span>
                </div>
                <div className="mcard-row"><span>Client</span><b>{clientName(d.client_id)}</b></div>
                <div className="mcard-row"><span>Owner</span><b>{d.owner || "—"}</b></div>
                <div className="mcard-row"><span>Nilai</span><b>{fmtIDR(d.value)}</b></div>
                <div className="mcard-row"><span>Target Closing</span><b>{fmtDate(d.close_date)}</b></div>
                <div className="mcard-row"><span>Update Terakhir</span><b>{lastActivityDate.has(d.id) ? fmtDate(lastActivityDate.get(d.id)!.slice(0, 10)) : "—"}</b></div>
                <div className="mcard-actions">
                  <button className="btn btn-ghost btn-sm" onClick={e => { e.stopPropagation(); openEdit(d, "detail"); }}>Detail</button>
                  {!isViewer && <button className="btn btn-ghost btn-sm" onClick={e => { e.stopPropagation(); openEdit(d, "info"); }}>Edit</button>}
                </div>
              </div>
            ))}
          </div>
        )}

        <Pagination page={page} totalPages={totalPages} totalItems={totalItems} pageSize={pageSize} onPageChange={setPage} />
      </div>

      <DealModal
        open={modalOpen} deal={editDeal} clients={clients} products={products} team={team} defaultOwner={currentUserName}
        initialTab={modalTab}
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
