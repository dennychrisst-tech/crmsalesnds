"use client";
import { useState } from "react";
import { AppData } from "@/hooks/useData";
import { Project, PIC } from "@/types";
import { fmtIDR, fmtDate } from "@/lib/utils";
import ProjectModal from "./ProjectModal";
import FilterSheet, { FilterField } from "./ui/FilterSheet";

// Days since the requisition was opened — same tiering as Pipeline's deal
// aging badge (reuses its CSS classes), just computed from created_at since
// Project has no stage_updated_at to track a more specific milestone date.
function talentAgingDays(createdAt?: string): number {
  const ref = createdAt ? new Date(createdAt) : new Date();
  return Math.floor((Date.now() - ref.getTime()) / 86_400_000);
}

function TalentAgingBadge({ days }: { days: number }) {
  let cls = "aging-fresh";
  if (days >= 30) cls = "aging-critical";
  else if (days >= 14) cls = "aging-warn";
  else if (days >= 7) cls = "aging-caution";
  return <span className={`aging-badge ${cls}`}>{days}h</span>;
}

// Compact "at a glance" summary for a Talent row — role/level/ratecard subtitle
// plus a milestone checklist (which of the 4 recruitment dates are filled).
// Shared between the desktop table cell and the mobile card.
function TalentSummary({ p }: { p: Project }) {
  const isOpen = p.status !== "Delivered" && p.status !== "Closed";
  const steps: [string, string | null | undefined][] = [
    ["CV", p.talent_submit_cv_date],
    ["Interview", p.talent_interview_date],
    ["Hired", p.talent_hired_date],
    ["PO", p.talent_po_date],
  ];
  return (
    <div style={{ marginTop: 4 }}>
      <div style={{ fontSize: 11.5, color: "var(--ink-soft)", display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
        <span>👤 {p.talent_role || "—"}{p.talent_level ? ` · ${p.talent_level}` : ""}{p.talent_ratecard ? ` · ${fmtIDR(p.talent_ratecard)}/bln` : ""}</span>
        {isOpen && <TalentAgingBadge days={talentAgingDays(p.created_at)} />}
      </div>
      <div className="talent-milestones">
        {steps.map(([label, date]) => (
          <span key={label} className={`talent-milestone${date ? " talent-milestone-done" : ""}`} title={date ? fmtDate(date) : "Belum"}>
            {date ? "✓" : "○"} {label}
          </span>
        ))}
      </div>
    </div>
  );
}

interface Props {
  data: AppData;
  isViewer?: boolean;
  onSaveProject: (p: Project) => Promise<void>;
  onDeleteProject: (id: string) => Promise<void>;
  onOpenClient: (clientId: string) => void;
}

export default function Projects({ data, isViewer, onSaveProject, onDeleteProject, onOpenClient }: Props) {
  const { clients, projects, profiles } = data;
  const team = profiles.filter(p => !["super_admin","admin","viewer"].includes(p.role)).map(p => p.name).filter(Boolean);
  const [search, setSearch] = useState("");
  const [salesFilter, setSalesFilter] = useState("all");
  const [productFilter, setProductFilter] = useState<"all" | "Talent">("all");
  const [modalOpen, setModalOpen] = useState(false);
  const [editProject, setEditProject] = useState<Project | null>(null);

  const clientName = (id: string) => clients.find(c => c.id === id)?.name || "—";
  const filtered = projects.filter(p => {
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase()) || clientName(p.client_id).toLowerCase().includes(search.toLowerCase());
    const client = clients.find(c => c.id === p.client_id);
    const matchSales = salesFilter === "all" || (Array.isArray(client?.pic) ? client!.pic : []).some((s: PIC) => s.name === salesFilter);
    const matchProduct = productFilter === "all" || p.product === productFilter;
    return matchSearch && matchSales && matchProduct;
  });

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
              <th>Project</th><th>Client</th><th>Partner</th><th>Produk / Solusi</th>
              <th>Status</th><th>Nilai</th><th>Target Go-Live</th><th></th>
            </tr>
          </thead>
          <tbody>
            {filtered.length ? filtered.map(p => (
              <tr key={p.id}>
                <td>
                  <b>{p.name}</b><br /><span className="muted" style={{ fontSize: 11 }}>{p.notes}</span>
                  {p.product === "Talent" && <TalentSummary p={p} />}
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
                <td>{!isViewer && <button className="btn btn-ghost btn-sm" onClick={() => { setEditProject(p); setModalOpen(true); }}>Edit</button>}</td>
              </tr>
            )) : <tr><td colSpan={8} className="empty-state">Belum ada project.</td></tr>}
          </tbody>
        </table>

        {filtered.length > 0 && (
          <div className="mobile-cards">
            {filtered.map(p => (
              <div key={p.id} className="mcard">
                <div className="mcard-head">
                  <div className="mcard-title">{p.name}</div>
                  <span className="chip">{p.status}</span>
                </div>
                {p.notes && <div style={{ fontSize: 12, color: "var(--ink-soft)" }}>{p.notes}</div>}
                {p.product === "Talent" && <TalentSummary p={p} />}
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
        onSave={onSaveProject} onDelete={onDeleteProject} onClose={() => setModalOpen(false)} />
    </section>
  );
}
