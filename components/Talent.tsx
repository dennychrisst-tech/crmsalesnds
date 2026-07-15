"use client";
import { useState } from "react";
import { AppData } from "@/hooks/useData";
import { useUndoableDelete } from "@/hooks/useUndoableDelete";
import { Project, TalentRole, Deal, CRMDocument, Activity, PIC } from "@/types";
import { fmtIDR, fmtDate, STAGE_COLOR, isClosedStage, isTalentProduct, onActivateKey } from "@/lib/utils";
import ProjectModal from "./ProjectModal";
import DealModal from "./DealModal";
import TalentManageModal from "./TalentManageModal";
import EmptyState from "./ui/EmptyState";
import FilterSheet, { FilterField } from "./ui/FilterSheet";
import SortableTh, { SortDir } from "./ui/SortableTh";
import Pagination from "./ui/Pagination";
import { usePagination } from "@/hooks/usePagination";
import { exportProjects, exportDeals } from "@/lib/export";
import { Download } from "lucide-react";

type TalentSortKey = "name" | "client" | "status" | "value" | "golive";
type TalentDealSortKey = "name" | "client" | "stage" | "value" | "close_date";

// Compact "at a glance" summary for a Talent row — aggregates each role's own
// count fields (matching the team's Excel tracker columns) across the project.
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
  currentUserName: string;
  isViewer?: boolean;
  onSaveProject: (p: Project) => Promise<void>;
  onDeleteProject: (id: string) => Promise<void>;
  onSaveTalentRole: (r: TalentRole) => Promise<void>;
  onDeleteTalentRole: (id: string) => Promise<void>;
  onSaveDeal: (d: Deal) => Promise<void>;
  onDeleteDeal: (id: string) => Promise<void>;
  onAddDocument: (d: CRMDocument) => Promise<void>;
  onDeleteDocument: (id: string) => Promise<void>;
  onUploadAttachment: (file: File, dealId: string) => Promise<void>;
  onDeleteAttachment: (id: string) => Promise<void>;
  onAddActivity: (a: Activity) => Promise<void>;
  onDeleteActivity: (id: string) => Promise<void>;
  onOpenClient: (clientId: string) => void;
}

// Talent (product === "Talent") lives here in full instead of split across
// Oppty/Project — deals still being pursued (Opportunity Talent, below) and
// projects already won (Project Talent) are both staffing work with the same
// CV-pipeline/PO rhythm, so keeping them together avoids showing Talent twice
// in both Oppty and Project.
export default function Talent({
  data, currentUserName, isViewer, onSaveProject, onDeleteProject,
  onSaveTalentRole, onDeleteTalentRole, onSaveDeal, onDeleteDeal,
  onAddDocument, onDeleteDocument, onUploadAttachment, onDeleteAttachment,
  onAddActivity, onDeleteActivity, onOpenClient,
}: Props) {
  const { clients, documents, attachments, activities, profiles, talent_roles } = data;
  const team = profiles.filter(p => !["super_admin","admin","viewer"].includes(p.role)).map(p => p.name).filter(Boolean);
  const clientName = (id: string) => clients.find(c => c.id === id)?.name || "—";

  // --- Opportunity Talent (Deal, product === "Talent", not yet closed) ---
  const { isPending: isDealPending, requestDelete: requestDeleteDeal } = useUndoableDelete(onDeleteDeal);
  const talentDeals = data.deals.filter(d => !isDealPending(d.id) && isTalentProduct(d.product) && !isClosedStage(d.stage));
  async function handleDeleteDeal(id: string) {
    const d = data.deals.find(x => x.id === id);
    requestDeleteDeal(id, d ? `Deal "${d.name}"` : "Deal");
  }
  const [dealModalOpen, setDealModalOpen] = useState(false);
  const [editDeal, setEditDeal] = useState<Deal | null>(null);
  function openEditDeal(d: Deal) { setEditDeal(d); setDealModalOpen(true); }
  const dealDocuments = editDeal ? documents.filter(d => d.deal_id === editDeal.id) : [];
  const dealAttachments = editDeal ? attachments.filter(a => a.deal_id === editDeal.id) : [];
  const dealActivities = editDeal ? activities.filter(a => a.deal_id === editDeal.id) : [];

  const [dealSearch, setDealSearch] = useState("");
  const [dealOwnerFilter, setDealOwnerFilter] = useState("all");
  const [dealSortKey, setDealSortKey] = useState<TalentDealSortKey | null>(null);
  const [dealSortDir, setDealSortDir] = useState<SortDir>("asc");

  const filteredTalentDeals = talentDeals.filter(d => {
    const matchSearch = d.name.toLowerCase().includes(dealSearch.toLowerCase()) || clientName(d.client_id).toLowerCase().includes(dealSearch.toLowerCase());
    const matchOwner = dealOwnerFilter === "all" || d.owner === dealOwnerFilter;
    return matchSearch && matchOwner;
  });
  function toggleDealSort(key: TalentDealSortKey) {
    if (key === dealSortKey) setDealSortDir(d => d === "asc" ? "desc" : "asc");
    else { setDealSortKey(key); setDealSortDir("asc"); }
  }
  const sortedTalentDeals = dealSortKey ? [...filteredTalentDeals].sort((a, b) => {
    let cmp = 0;
    switch (dealSortKey) {
      case "name": cmp = a.name.localeCompare(b.name); break;
      case "client": cmp = clientName(a.client_id).localeCompare(clientName(b.client_id)); break;
      case "stage": cmp = a.stage.localeCompare(b.stage); break;
      case "value": cmp = a.value - b.value; break;
      case "close_date": cmp = (a.close_date || "").localeCompare(b.close_date || ""); break;
    }
    return dealSortDir === "asc" ? cmp : -cmp;
  }) : filteredTalentDeals;

  // --- Project Talent (Project, product === "Talent") ---
  const { isPending, requestDelete } = useUndoableDelete(onDeleteProject);
  const projects = data.projects.filter(p => !isPending(p.id) && p.product === "Talent");
  async function handleDeleteProject(id: string) {
    const p = data.projects.find(x => x.id === id);
    requestDelete(id, p ? `Project "${p.name}"` : "Project");
  }
  const [search, setSearch] = useState("");
  const [salesFilter, setSalesFilter] = useState("all");
  const [modalOpen, setModalOpen] = useState(false);
  const [editProject, setEditProject] = useState<Project | null>(null);
  const [talentModalOpen, setTalentModalOpen] = useState(false);
  const [talentProject, setTalentProject] = useState<Project | null>(null);
  const [sortKey, setSortKey] = useState<TalentSortKey | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  const filtered = projects.filter(p => {
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase()) || clientName(p.client_id).toLowerCase().includes(search.toLowerCase());
    const client = clients.find(c => c.id === p.client_id);
    const matchSales = salesFilter === "all" || (Array.isArray(client?.pic) ? client!.pic : []).some((s: PIC) => s.name === salesFilter);
    return matchSearch && matchSales;
  });

  function toggleSort(key: TalentSortKey) {
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

  const { page: dealPage, setPage: setDealPage, totalPages: dealTotalPages, totalItems: dealTotalItems, pageSize: dealPageSize, paged: pagedTalentDeals } = usePagination(sortedTalentDeals, 25);
  const { page, setPage, totalPages, totalItems, pageSize, paged } = usePagination(sorted, 25);

  return (
    <section>
      <div className="toolbar">
        <input className="search" value={dealSearch} onChange={e => setDealSearch(e.target.value)} placeholder="Cari opportunity talent / client…" />
        <span className="filter-inline">
          <select
            value={dealOwnerFilter}
            onChange={e => setDealOwnerFilter(e.target.value)}
            style={{ fontSize: 13, padding: "4px 10px", borderRadius: 6, border: "1px solid var(--line)", background: "var(--card)", color: "var(--ink)", cursor: "pointer" }}
          >
            <option value="all">Semua Sales</option>
            {team.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </span>
        <FilterSheet>
          <FilterField label="Sales">
            <select value={dealOwnerFilter} onChange={e => setDealOwnerFilter(e.target.value)}>
              <option value="all">Semua Sales</option>
              {team.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </FilterField>
        </FilterSheet>
        <button className="btn btn-ghost btn-sm" onClick={() => exportDeals(talentDeals, clientName)}><Download size={13} /> Export Excel</button>
        {!isViewer && <button className="btn btn-ghost btn-sm" onClick={() => { setEditDeal(null); setDealModalOpen(true); }}>+ Opportunity Talent Baru</button>}
      </div>
      <div className="panel" style={{ marginBottom: 24 }}>
        <table className="data-table">
          <thead>
            <tr>
              <SortableTh active={dealSortKey === "name"} dir={dealSortDir} onClick={() => toggleDealSort("name")}>Opportunity</SortableTh>
              <SortableTh active={dealSortKey === "client"} dir={dealSortDir} onClick={() => toggleDealSort("client")}>Client</SortableTh>
              <SortableTh active={dealSortKey === "stage"} dir={dealSortDir} onClick={() => toggleDealSort("stage")}>Stage</SortableTh>
              <th>Owner</th>
              <SortableTh active={dealSortKey === "value"} dir={dealSortDir} onClick={() => toggleDealSort("value")}>Nilai</SortableTh>
              <SortableTh active={dealSortKey === "close_date"} dir={dealSortDir} onClick={() => toggleDealSort("close_date")}>Target Closing</SortableTh>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {sortedTalentDeals.length ? pagedTalentDeals.map(d => (
              <tr key={d.id} onClick={() => openEditDeal(d)} onKeyDown={onActivateKey(() => openEditDeal(d))} role="button" tabIndex={0} style={{ cursor: "pointer" }}>
                <td><b>{d.name}</b></td>
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
                  {!isViewer && <button className="btn btn-ghost btn-sm" onClick={e => { e.stopPropagation(); openEditDeal(d); }}>Edit</button>}
                </td>
              </tr>
            )) : <tr><td colSpan={7}><EmptyState icon="🎯" label="Belum ada opportunity talent" sub="Belum ada permintaan staffing yang masih dalam tahap opportunity" /></td></tr>}
          </tbody>
        </table>

        {sortedTalentDeals.length > 0 && (
          <div className="mobile-cards">
            {pagedTalentDeals.map(d => (
              <div key={d.id} className="mcard" onClick={() => openEditDeal(d)} onKeyDown={onActivateKey(() => openEditDeal(d))} role="button" tabIndex={0}>
                <div className="mcard-head">
                  <div className="mcard-title">{d.name}</div>
                  <span className="chip" style={{ background: `${STAGE_COLOR[d.stage] || "var(--brand)"}22`, color: STAGE_COLOR[d.stage] || "var(--brand)" }}>{d.stage}</span>
                </div>
                <div className="mcard-row"><span>Client</span><b>{clientName(d.client_id)}</b></div>
                <div className="mcard-row"><span>Owner</span><b>{d.owner || "—"}</b></div>
                <div className="mcard-row"><span>Nilai</span><b>{fmtIDR(d.value)}</b></div>
                <div className="mcard-row"><span>Target Closing</span><b>{fmtDate(d.close_date)}</b></div>
              </div>
            ))}
          </div>
        )}

        <Pagination page={dealPage} totalPages={dealTotalPages} totalItems={dealTotalItems} pageSize={dealPageSize} onPageChange={setDealPage} />
      </div>

      <div className="toolbar">
        <input className="search" value={search} onChange={e => setSearch(e.target.value)} placeholder="Cari project talent / client…" />
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
        {!isViewer && <button className="btn add-btn-desktop" onClick={() => { setEditProject(null); setModalOpen(true); }}>+ Project Talent Baru</button>}
      </div>

      {!isViewer && <button className="fab" onClick={() => { setEditProject(null); setModalOpen(true); }} aria-label="Tambah Talent">+</button>}
      <div className="panel">
        <table className="data-table">
          <thead>
            <tr>
              <SortableTh active={sortKey === "name"} dir={sortDir} onClick={() => toggleSort("name")}>Project</SortableTh>
              <SortableTh active={sortKey === "client"} dir={sortDir} onClick={() => toggleSort("client")}>Client</SortableTh>
              <th>Partner</th>
              <SortableTh active={sortKey === "status"} dir={sortDir} onClick={() => toggleSort("status")}>Status</SortableTh>
              <SortableTh active={sortKey === "value"} dir={sortDir} onClick={() => toggleSort("value")}>Nilai</SortableTh>
              <SortableTh active={sortKey === "golive"} dir={sortDir} onClick={() => toggleSort("golive")}>Target Go-Live</SortableTh>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {sorted.length ? paged.map(p => {
              const projectRoles = talent_roles.filter(r => r.project_id === p.id);
              return (
                <tr key={p.id}>
                  <td>
                    <b>{p.name}</b><br /><span className="muted" style={{ fontSize: 11 }}>{p.notes}</span>
                    <TalentSummary roles={projectRoles} />
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
                  <td>{p.status}</td>
                  <td>{fmtIDR(p.value)}</td>
                  <td>{fmtDate(p.golive)}</td>
                  <td>
                    <span style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                      <button className="btn btn-ghost btn-sm" onClick={() => openTalentManage(p)}>Kelola Talent</button>
                      {!isViewer && <button className="btn btn-ghost btn-sm" onClick={() => { setEditProject(p); setModalOpen(true); }}>Edit</button>}
                    </span>
                  </td>
                </tr>
              );
            }) : <tr><td colSpan={7}><EmptyState icon="🧑‍💼" label="Belum ada project talent" sub="Coba ubah filter, atau tambah project talent pertama Anda" /></td></tr>}
          </tbody>
        </table>

        {!sorted.length && (
          <div className="mobile-only">
            <EmptyState icon="🧑‍💼" label="Belum ada project talent" sub="Coba ubah filter, atau tambah project talent pertama Anda" />
          </div>
        )}

        {sorted.length > 0 && (
          <div className="mobile-cards">
            {paged.map(p => {
              const projectRoles = talent_roles.filter(r => r.project_id === p.id);
              return (
                <div key={p.id} className="mcard">
                  <div className="mcard-head">
                    <div className="mcard-title">{p.name}</div>
                    <span className="chip">{p.status}</span>
                  </div>
                  {p.notes && <div style={{ fontSize: 12, color: "var(--ink-soft)" }}>{p.notes}</div>}
                  <TalentSummary roles={projectRoles} />
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
                  <div className="mcard-row"><span>Nilai</span><b>{fmtIDR(p.value)}</b></div>
                  <div className="mcard-row"><span>Target Go-Live</span><b>{fmtDate(p.golive)}</b></div>
                  <div className="mcard-actions">
                    <button className="btn btn-ghost btn-sm" onClick={() => openTalentManage(p)}>Kelola Talent</button>
                    {!isViewer && <button className="btn btn-ghost btn-sm" onClick={() => { setEditProject(p); setModalOpen(true); }}>Edit</button>}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <Pagination page={page} totalPages={totalPages} totalItems={totalItems} pageSize={pageSize} onPageChange={setPage} />
      </div>
      <ProjectModal open={modalOpen} project={editProject} clients={clients} team={team} defaultProduct="Talent"
        activities={editProject ? activities.filter(a => a.project_id === editProject.id) : []}
        onSave={onSaveProject} onDelete={handleDeleteProject}
        onAddActivity={onAddActivity} onDeleteActivity={onDeleteActivity}
        onClose={() => setModalOpen(false)} />

      <TalentManageModal
        open={talentModalOpen} project={talentProject}
        roles={talentProject ? talent_roles.filter(r => r.project_id === talentProject.id) : []}
        team={team}
        onSaveRole={onSaveTalentRole} onDeleteRole={onDeleteTalentRole}
        onClose={() => setTalentModalOpen(false)}
      />

      <DealModal
        open={dealModalOpen} deal={editDeal} clients={clients} team={team}
        defaultOwner={currentUserName} defaultProduct="Talent" entityLabel="Oppty Talent"
        documents={dealDocuments} attachments={dealAttachments} activities={dealActivities}
        onSave={onSaveDeal} onDelete={handleDeleteDeal}
        onAddDocument={onAddDocument} onDeleteDocument={onDeleteDocument}
        onUploadAttachment={onUploadAttachment} onDeleteAttachment={onDeleteAttachment}
        onAddActivity={onAddActivity} onDeleteActivity={onDeleteActivity}
        onClose={() => setDealModalOpen(false)}
      />
    </section>
  );
}
