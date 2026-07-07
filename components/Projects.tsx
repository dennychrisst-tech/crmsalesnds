"use client";
import { useState } from "react";
import { AppData } from "@/hooks/useData";
import { useUndoableDelete } from "@/hooks/useUndoableDelete";
import { Project, PIC, Activity } from "@/types";
import { PROJECT_STATUS_COLOR, fmtIDR, fmtDate } from "@/lib/utils";
import ProjectModal from "./ProjectModal";
import EmptyState from "./ui/EmptyState";
import FilterSheet, { FilterField } from "./ui/FilterSheet";
import SortableTh, { SortDir } from "./ui/SortableTh";
import Pagination from "./ui/Pagination";
import { usePagination } from "@/hooks/usePagination";
import { exportProjects } from "@/lib/export";
import { Download } from "lucide-react";

type ProjectSortKey = "name" | "client" | "status" | "value" | "golive";

interface Props {
  data: AppData;
  isViewer?: boolean;
  onSaveProject: (p: Project) => Promise<void>;
  onDeleteProject: (id: string) => Promise<void>;
  onAddActivity: (a: Activity) => Promise<void>;
  onDeleteActivity: (id: string) => Promise<void>;
  onOpenClient: (clientId: string) => void;
}

// Talent projects (product === "Talent") live in their own tab (see
// components/Talent.tsx), not here — staffing/requisition work has a
// different rhythm than delivery projects, so it's kept off this list.
export default function Projects({
  data, isViewer, onSaveProject, onDeleteProject, onAddActivity, onDeleteActivity, onOpenClient,
}: Props) {
  const { clients, contacts, profiles, activities } = data;
  // Soft-delete: "Hapus" hides the project immediately, real delete happens
  // after the Undo window passes — see useUndoableDelete.
  const { isPending, requestDelete } = useUndoableDelete(onDeleteProject);
  const projects = data.projects.filter(p => !isPending(p.id) && p.product !== "Talent");
  async function handleDeleteProject(id: string) {
    const p = data.projects.find(x => x.id === id);
    requestDelete(id, p ? `Project "${p.name}"` : "Project");
  }
  const team = profiles.filter(p => !["super_admin","admin","viewer"].includes(p.role)).map(p => p.name).filter(Boolean);
  const [search, setSearch] = useState("");
  const [salesFilter, setSalesFilter] = useState("all");
  const [modalOpen, setModalOpen] = useState(false);
  const [editProject, setEditProject] = useState<Project | null>(null);
  const [modalTab, setModalTab] = useState<"detail" | "edit">("detail");
  const [sortKey, setSortKey] = useState<ProjectSortKey | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [expandedActivityClients, setExpandedActivityClients] = useState<Set<string>>(new Set());

  function toggleActivityClient(id: string) {
    setExpandedActivityClients(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  const clientName = (id: string) => clients.find(c => c.id === id)?.name || "—";
  const projectById = (id: string | null) => projects.find(p => p.id === id) || null;
  const contactName = (clientId: string) => contacts.find(c => c.client_id === clientId)?.name || "—";

  // Latest activity log entries per client, across that client's projects on
  // this page — a quick "what happened lately" feed per client without
  // opening each project one by one.
  const projectIds = new Set(projects.map(p => p.id));
  const sortedActivities = [...activities]
    .filter(a => a.project_id && projectIds.has(a.project_id))
    .sort((a, b) => (b.date || b.created_at || "").localeCompare(a.date || a.created_at || ""));

  // "Update Terakhir" per project — projects have no generic updated_at
  // column, so the most recent activity log entry stands in as "when this
  // was last touched" (sortedActivities is already newest-first, so the
  // first hit per project wins).
  const lastActivityDate = new Map<string, string>();
  for (const a of sortedActivities) {
    if (!lastActivityDate.has(a.project_id!)) lastActivityDate.set(a.project_id!, a.date || a.created_at || "");
  }

  // Technova is the reseller NDS goes through to reach Sequis Life — same
  // delivery chain split across two client records, so their activity feeds
  // are combined into one section instead of listed separately.
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
    const clientId = projectById(a.project_id)!.client_id;
    const { key, label } = activityGroupFor(clientId);
    const group = activitiesByClient.get(key) || { label, items: [] };
    if (group.items.length < 10) group.items.push(a);
    activitiesByClient.set(key, group);
  }
  const clientActivityGroups = [...activitiesByClient.entries()]
    .map(([key, { label, items }]) => ({ key, label, items }))
    .sort((a, b) => (b.items[0].date || b.items[0].created_at || "").localeCompare(a.items[0].date || a.items[0].created_at || ""));

  const filtered = projects.filter(p => {
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase()) || clientName(p.client_id).toLowerCase().includes(search.toLowerCase());
    const client = clients.find(c => c.id === p.client_id);
    const matchSales = salesFilter === "all" || (Array.isArray(client?.pic) ? client!.pic : []).some((s: PIC) => s.name === salesFilter);
    return matchSearch && matchSales;
  });

  function toggleSort(key: ProjectSortKey) {
    if (key === sortKey) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir("asc"); }
  }
  const sorted = sortKey ? [...filtered].sort((a, b) => {
    let cmp = 0;
    switch (sortKey) {
      case "name": cmp = a.name.localeCompare(b.name); break;
      case "client": cmp = clientName(a.client_id).localeCompare(clientName(b.client_id)); break;
      case "status": cmp = (a.status || "").localeCompare(b.status || ""); break;
      case "value": cmp = a.value - b.value; break;
      case "golive": cmp = (a.golive || "").localeCompare(b.golive || ""); break;
    }
    return sortDir === "asc" ? cmp : -cmp;
  }) : filtered;

  function openEdit(p: Project, tab: "detail" | "edit" = "detail") { setEditProject(p); setModalTab(tab); setModalOpen(true); }

  const { page, setPage, totalPages, totalItems, pageSize, paged } = usePagination(sorted, 25);

  return (
    <section>
      {clientActivityGroups.length > 0 && (
        <div className="panel" style={{ marginBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12, flexWrap: "wrap", gap: 8 }}>
            <h3 style={{ margin: 0, fontSize: 15 }}>Aktivitas Terakhir per Client</h3>
            <span style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span className="muted" style={{ fontSize: 12 }}>maks. 10 aktivitas / client</span>
              <button className="btn btn-ghost btn-sm" onClick={() => setExpandedActivityClients(new Set(clientActivityGroups.map(g => g.key)))}>Tampilkan Semua</button>
              <button className="btn btn-ghost btn-sm" onClick={() => setExpandedActivityClients(new Set())}>Sembunyikan Semua</button>
            </span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {clientActivityGroups.map(g => {
              const isOpen = expandedActivityClients.has(g.key);
              const isMerged = new Set(g.items.map(a => projectById(a.project_id)?.client_id)).size > 1;
              return (
                <div key={g.key}>
                  <button
                    className="ccard-collapse-toggle"
                    style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}
                    onClick={() => toggleActivityClient(g.key)}
                  >
                    <span>{isOpen ? "▾" : "▸"} <b style={{ color: "var(--ink)", fontSize: 15 }}>{g.label}</b> <span style={{ fontSize: 11 }}>({g.items.length} aktivitas)</span></span>
                    <span className="muted">{fmtDate((g.items[0].date || g.items[0].created_at || "").slice(0, 10))}</span>
                  </button>
                  {isOpen && (
                    <table className="data-table table-zebra">
                      <thead>
                        <tr>
                          <th>Tanggal</th>{isMerged && <th>Client</th>}<th>PIC Handle</th><th>PIC Client</th><th>Project</th><th>Aktivitas</th>
                        </tr>
                      </thead>
                      <tbody>
                        {g.items.map(a => {
                          const project = projectById(a.project_id);
                          return (
                            <tr key={a.id} style={{ cursor: project ? "pointer" : "default" }} onClick={() => project && openEdit(project, "detail")}>
                              <td>{fmtDate((a.date || a.created_at || "").slice(0, 10))}</td>
                              {isMerged && <td>{project ? clientName(project.client_id) : "—"}</td>}
                              <td>{a.created_by || "—"}</td>
                              <td>{project ? contactName(project.client_id) : "—"}</td>
                              <td>{project?.name || "—"}</td>
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
        <input className="search" value={search} onChange={e => setSearch(e.target.value)} placeholder="Cari project / client…" />
        <span className="filter-inline">
          <select
            value={salesFilter}
            onChange={e => setSalesFilter(e.target.value)}
            style={{ fontSize: 13, padding: "4px 10px", borderRadius: 6, border: "1px solid var(--line)", background: "var(--card)", color: "var(--ink)", cursor: "pointer" }}
          >
            <option value="all">Semua Sales</option>
            {team.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </span>
        <FilterSheet>
          <FilterField label="Sales">
            <select value={salesFilter} onChange={e => setSalesFilter(e.target.value)}>
              <option value="all">Semua Sales</option>
              {team.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </FilterField>
        </FilterSheet>
        <button className="btn btn-ghost btn-sm" onClick={() => exportProjects(projects, clientName)}><Download size={13} /> Export Excel</button>
        {!isViewer && <button className="btn add-btn-desktop" onClick={() => { setEditProject(null); setModalOpen(true); }}>+ Project Baru</button>}
      </div>

      {!isViewer && <button className="fab" onClick={() => { setEditProject(null); setModalOpen(true); }} aria-label="Tambah Project">+</button>}
      <div className="panel">
        <table className="data-table">
          <thead>
            <tr>
              <SortableTh active={sortKey === "name"} dir={sortDir} onClick={() => toggleSort("name")}>Project</SortableTh>
              <SortableTh active={sortKey === "client"} dir={sortDir} onClick={() => toggleSort("client")}>Client</SortableTh>
              <th>Partner</th><th>Produk / Solusi</th>
              <SortableTh active={sortKey === "status"} dir={sortDir} onClick={() => toggleSort("status")}>Status</SortableTh>
              <SortableTh active={sortKey === "value"} dir={sortDir} onClick={() => toggleSort("value")}>Nilai</SortableTh>
              <SortableTh active={sortKey === "golive"} dir={sortDir} onClick={() => toggleSort("golive")}>Target Go-Live</SortableTh>
              <th>Update Terakhir</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {sorted.length ? paged.map(p => (
              <tr key={p.id} onClick={() => openEdit(p)} style={{ cursor: "pointer" }}>
                <td>
                  <b>{p.name}</b><br /><span className="muted" style={{ fontSize: 11 }}>{p.notes}</span>
                </td>
                <td>{clientName(p.client_id)}</td>
                <td>
                  {p.partner ? (
                    <span
                      onClick={e => {
                        e.stopPropagation();
                        const partnerClient = clients.find(c => c.name === p.partner);
                        if (partnerClient) onOpenClient(partnerClient.id);
                      }}
                      style={{
                        fontSize: 12, background: "var(--bg)", border: "1px solid var(--line)", borderRadius: 5,
                        padding: "2px 8px", cursor: "pointer",
                      }}
                      title="Buka data client"
                    >
                      {p.partner}
                    </span>
                  ) : <span className="muted">—</span>}
                </td>
                <td>{p.product || "-"}</td>
                <td>
                  <span className="badge" style={{ background: `${PROJECT_STATUS_COLOR[p.status] || "var(--brand)"}22`, color: PROJECT_STATUS_COLOR[p.status] || "var(--brand)" }}>
                    {p.status}
                  </span>
                </td>
                <td>{fmtIDR(p.value)}</td>
                <td>{fmtDate(p.golive)}</td>
                <td>{lastActivityDate.has(p.id) ? fmtDate(lastActivityDate.get(p.id)!.slice(0, 10)) : <span className="muted">—</span>}</td>
                <td>
                  <span style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                    <button className="btn btn-ghost btn-sm" onClick={e => { e.stopPropagation(); openEdit(p, "detail"); }}>Detail</button>
                    {!isViewer && <button className="btn btn-ghost btn-sm" onClick={e => { e.stopPropagation(); openEdit(p, "edit"); }}>Edit</button>}
                  </span>
                </td>
              </tr>
            )) : <tr><td colSpan={9}><EmptyState icon="📁" label="Belum ada project" sub="Coba ubah filter, atau tambah project pertama Anda" /></td></tr>}
          </tbody>
        </table>

        {!sorted.length && (
          <div className="mobile-only">
            <EmptyState icon="📁" label="Belum ada project" sub="Coba ubah filter, atau tambah project pertama Anda" />
          </div>
        )}

        {sorted.length > 0 && (
          <div className="mobile-cards">
            {paged.map(p => (
              <div key={p.id} className="mcard" onClick={() => openEdit(p)}>
                <div className="mcard-head">
                  <div className="mcard-title">{p.name}</div>
                  <span className="chip" style={{ background: `${PROJECT_STATUS_COLOR[p.status] || "var(--brand)"}22`, color: PROJECT_STATUS_COLOR[p.status] || "var(--brand)" }}>{p.status}</span>
                </div>
                {p.notes && <div style={{ fontSize: 12, color: "var(--ink-soft)" }}>{p.notes}</div>}
                <div className="mcard-row"><span>Client</span><b>{clientName(p.client_id)}</b></div>
                {p.partner && (
                  <div className="mcard-row">
                    <span>Partner</span>
                    <b
                      onClick={e => {
                        e.stopPropagation();
                        const partnerClient = clients.find(c => c.name === p.partner);
                        if (partnerClient) onOpenClient(partnerClient.id);
                      }}
                      style={{ cursor: "pointer", textDecoration: "underline" }}
                    >{p.partner}</b>
                  </div>
                )}
                <div className="mcard-row"><span>Produk / Solusi</span><b>{p.product || "-"}</b></div>
                <div className="mcard-row"><span>Nilai</span><b>{fmtIDR(p.value)}</b></div>
                <div className="mcard-row"><span>Target Go-Live</span><b>{fmtDate(p.golive)}</b></div>
                <div className="mcard-row"><span>Update Terakhir</span><b>{lastActivityDate.has(p.id) ? fmtDate(lastActivityDate.get(p.id)!.slice(0, 10)) : "—"}</b></div>
                <div className="mcard-actions">
                  <button className="btn btn-ghost btn-sm" onClick={e => { e.stopPropagation(); openEdit(p, "detail"); }}>Detail</button>
                  {!isViewer && <button className="btn btn-ghost btn-sm" onClick={e => { e.stopPropagation(); openEdit(p, "edit"); }}>Edit</button>}
                </div>
              </div>
            ))}
          </div>
        )}

        <Pagination page={page} totalPages={totalPages} totalItems={totalItems} pageSize={pageSize} onPageChange={setPage} />
      </div>
      <ProjectModal open={modalOpen} project={editProject} clients={clients} team={team}
        initialTab={modalTab}
        activities={editProject ? activities.filter(a => a.project_id === editProject.id) : []}
        onSave={onSaveProject} onDelete={handleDeleteProject}
        onAddActivity={onAddActivity} onDeleteActivity={onDeleteActivity}
        onClose={() => setModalOpen(false)} />
    </section>
  );
}
