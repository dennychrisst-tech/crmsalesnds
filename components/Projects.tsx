"use client";
import { useEffect, useState } from "react";
import { AppData } from "@/hooks/useData";
import { Project, TalentRole, PIC } from "@/types";
import { fmtIDR, fmtDate } from "@/lib/utils";
import ProjectModal from "./ProjectModal";
import TalentManageModal from "./TalentManageModal";
import FilterSheet, { FilterField } from "./ui/FilterSheet";
import SortableTh, { SortDir } from "./ui/SortableTh";

type ProjectSortKey = "name" | "client" | "status" | "value" | "golive";

// Compact "at a glance" summary for a Talent row — aggregates each role's own
// count fields (matching the team's Excel tracker columns) across the project.
// Shared between the desktop table cell and the mobile card.
function TalentSummary({ roles }: { roles: TalentRole[] }) {
  if (!roles.length) return <div style={{ fontSize: 11.5, color: "var(--ink-soft)", marginTop: 4 }}>Belum ada requisition.</div>;
  const submitted = roles.reduce((s, r) => s + r.cv_submitted, 0);
  const rejected = roles.reduce((s, r) => s + r.cv_reject, 0);
  const poIssued = roles.reduce((s, r) => s + r.po_issued, 0);
  return (
    <div style={{ fontSize: 11.5, color: "var(--ink-soft)", marginTop: 4, display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
      <span>👤 {roles.length} requisition · {submitted} CV</span>
      {poIssued > 0 && (
        <span style={{ fontSize: 10.5, fontWeight: 700, padding: "1px 7px", borderRadius: 999, background: "var(--brand-soft)", color: "var(--brand)" }}>
          {poIssued} PO Issued
        </span>
      )}
      {rejected > 0 && (
        <span style={{ fontSize: 10.5, fontWeight: 700, padding: "1px 7px", borderRadius: 999, background: "#FEE2E2", color: "#991B1B" }}>
          {rejected} Reject
        </span>
      )}
    </div>
  );
}

interface Props {
  data: AppData;
  isViewer?: boolean;
  onSaveProject: (p: Project) => Promise<void>;
  onDeleteProject: (id: string) => Promise<void>;
  onSaveTalentRole: (r: TalentRole) => Promise<void>;
  onDeleteTalentRole: (id: string) => Promise<void>;
  onOpenClient: (clientId: string) => void;
  openProjectId?: string | null;
  onOpenProjectHandled?: () => void;
}

export default function Projects({
  data, isViewer, onSaveProject, onDeleteProject,
  onSaveTalentRole, onDeleteTalentRole, onOpenClient,
  openProjectId, onOpenProjectHandled,
}: Props) {
  const { clients, projects, profiles, talent_roles } = data;
  const team = profiles.filter(p => !["super_admin","admin","viewer"].includes(p.role)).map(p => p.name).filter(Boolean);
  const [search, setSearch] = useState("");
  const [salesFilter, setSalesFilter] = useState("all");
  const [productFilter, setProductFilter] = useState<"all" | "Talent">("all");
  const [modalOpen, setModalOpen] = useState(false);
  const [editProject, setEditProject] = useState<Project | null>(null);
  const [talentModalOpen, setTalentModalOpen] = useState(false);
  const [talentProject, setTalentProject] = useState<Project | null>(null);
  const [sortKey, setSortKey] = useState<ProjectSortKey | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  useEffect(() => {
    if (!openProjectId) return;
    const project = projects.find(p => p.id === openProjectId);
    if (project) { setEditProject(project); setModalOpen(true); }
    onOpenProjectHandled?.();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openProjectId]);

  const clientName = (id: string) => clients.find(c => c.id === id)?.name || "—";
  const filtered = projects.filter(p => {
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase()) || clientName(p.client_id).toLowerCase().includes(search.toLowerCase());
    const client = clients.find(c => c.id === p.client_id);
    const matchSales = salesFilter === "all" || (Array.isArray(client?.pic) ? client!.pic : []).some((s: PIC) => s.name === salesFilter);
    const matchProduct = productFilter === "all" || p.product === productFilter;
    return matchSearch && matchSales && matchProduct;
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

  function openTalentManage(p: Project) { setTalentProject(p); setTalentModalOpen(true); }

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
          <select
            value={productFilter}
            onChange={e => setProductFilter(e.target.value as "all" | "Talent")}
            style={{ fontSize: 13, padding: "4px 10px", borderRadius: 6, border: "1px solid var(--line)", background: "var(--card)", color: "var(--ink)", cursor: "pointer" }}
          >
            <option value="all">Semua Produk</option>
            <option value="Talent">Talent saja</option>
          </select>
        </span>
        <FilterSheet>
          <FilterField label="Sales">
            <select value={salesFilter} onChange={e => setSalesFilter(e.target.value)}>
              <option value="all">Semua Sales</option>
              {team.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </FilterField>
          <FilterField label="Produk">
            <select value={productFilter} onChange={e => setProductFilter(e.target.value as "all" | "Talent")}>
              <option value="all">Semua Produk</option>
              <option value="Talent">Talent saja</option>
            </select>
          </FilterField>
        </FilterSheet>
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
            {sorted.length ? sorted.map(p => {
              const projectRoles = talent_roles.filter(r => r.project_id === p.id);
              return (
                <tr key={p.id}>
                  <td>
                    <b>{p.name}</b><br /><span className="muted" style={{ fontSize: 11 }}>{p.notes}</span>
                    {p.product === "Talent" && <TalentSummary roles={projectRoles} />}
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
                      {p.product === "Talent" && <button className="btn btn-ghost btn-sm" onClick={() => openTalentManage(p)}>Kelola Talent</button>}
                      {!isViewer && <button className="btn btn-ghost btn-sm" onClick={() => { setEditProject(p); setModalOpen(true); }}>Edit</button>}
                    </span>
                  </td>
                </tr>
              );
            }) : <tr><td colSpan={8} className="empty-state">Belum ada project.</td></tr>}
          </tbody>
        </table>

        {sorted.length > 0 && (
          <div className="mobile-cards">
            {sorted.map(p => {
              const projectRoles = talent_roles.filter(r => r.project_id === p.id);
              return (
                <div key={p.id} className="mcard">
                  <div className="mcard-head">
                    <div className="mcard-title">{p.name}</div>
                    <span className="chip">{p.status}</span>
                  </div>
                  {p.notes && <div style={{ fontSize: 12, color: "var(--ink-soft)" }}>{p.notes}</div>}
                  {p.product === "Talent" && <TalentSummary roles={projectRoles} />}
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
                  <div className="mcard-actions">
                    {p.product === "Talent" && <button className="btn btn-ghost btn-sm" onClick={() => openTalentManage(p)}>Kelola Talent</button>}
                    {!isViewer && <button className="btn btn-ghost btn-sm" onClick={() => { setEditProject(p); setModalOpen(true); }}>Edit</button>}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
      <ProjectModal open={modalOpen} project={editProject} clients={clients}
        onSave={onSaveProject} onDelete={onDeleteProject} onClose={() => setModalOpen(false)} />

      <TalentManageModal
        open={talentModalOpen} project={talentProject}
        roles={talentProject ? talent_roles.filter(r => r.project_id === talentProject.id) : []}
        team={team}
        onSaveRole={onSaveTalentRole} onDeleteRole={onDeleteTalentRole}
        onClose={() => setTalentModalOpen(false)}
      />
    </section>
  );
}
