"use client";
import { useState } from "react";
import { AppData } from "@/hooks/useData";
import { useUndoableDelete } from "@/hooks/useUndoableDelete";
import { Project, PIC, Activity } from "@/types";
import { fmtIDR, fmtDate } from "@/lib/utils";
import ProjectModal from "./ProjectModal";
import EmptyState from "./ui/EmptyState";
import FilterSheet, { FilterField } from "./ui/FilterSheet";
import SortableTh, { SortDir } from "./ui/SortableTh";
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
  const { clients, profiles, activities } = data;
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
  const [sortKey, setSortKey] = useState<ProjectSortKey | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  const clientName = (id: string) => clients.find(c => c.id === id)?.name || "—";
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

  return (
    <section>
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
              <th></th>
            </tr>
          </thead>
          <tbody>
            {sorted.length ? sorted.map(p => (
              <tr key={p.id}>
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
                <td>{p.status}</td>
                <td>{fmtIDR(p.value)}</td>
                <td>{fmtDate(p.golive)}</td>
                <td>
                  <span style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                    {!isViewer && <button className="btn btn-ghost btn-sm" onClick={() => { setEditProject(p); setModalOpen(true); }}>Edit</button>}
                  </span>
                </td>
              </tr>
            )) : <tr><td colSpan={8}><EmptyState icon="📁" label="Belum ada project" sub="Coba ubah filter, atau tambah project pertama Anda" /></td></tr>}
          </tbody>
        </table>

        {!sorted.length && (
          <div className="mobile-only">
            <EmptyState icon="📁" label="Belum ada project" sub="Coba ubah filter, atau tambah project pertama Anda" />
          </div>
        )}

        {sorted.length > 0 && (
          <div className="mobile-cards">
            {sorted.map(p => (
              <div key={p.id} className="mcard">
                <div className="mcard-head">
                  <div className="mcard-title">{p.name}</div>
                  <span className="chip">{p.status}</span>
                </div>
                {p.notes && <div style={{ fontSize: 12, color: "var(--ink-soft)" }}>{p.notes}</div>}
                <div className="mcard-row"><span>Client</span><b>{clientName(p.client_id)}</b></div>
                {p.partner && (
                  <div className="mcard-row">
                    <span>Partner</span>
                    <b
                      onClick={() => {
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
                {!isViewer && (
                  <div className="mcard-actions">
                    <button className="btn btn-ghost btn-sm" onClick={() => { setEditProject(p); setModalOpen(true); }}>Edit</button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
      <ProjectModal open={modalOpen} project={editProject} clients={clients} team={team}
        activities={editProject ? activities.filter(a => a.project_id === editProject.id) : []}
        onSave={onSaveProject} onDelete={handleDeleteProject}
        onAddActivity={onAddActivity} onDeleteActivity={onDeleteActivity}
        onClose={() => setModalOpen(false)} />
    </section>
  );
}
