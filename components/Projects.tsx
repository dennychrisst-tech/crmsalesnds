"use client";
import { useEffect, useState } from "react";
import { AppData } from "@/hooks/useData";
import { Project, PIC } from "@/types";
import { fmtIDR, fmtDate } from "@/lib/utils";
import ProjectModal from "./ProjectModal";

interface Props {
  data: AppData;
  isViewer?: boolean;
  onSaveProject: (p: Project) => Promise<void>;
  onDeleteProject: (id: string) => Promise<void>;
  onOpenClient: (clientId: string) => void;
  openProjectId?: string | null;
  onOpenProjectHandled?: () => void;
}

export default function Projects({ data, isViewer, onSaveProject, onDeleteProject, onOpenClient, openProjectId, onOpenProjectHandled }: Props) {
  const { clients, projects, profiles } = data;
  const team = profiles.filter(p => !["super_admin","admin","viewer"].includes(p.role)).map(p => p.name).filter(Boolean);
  const [search, setSearch] = useState("");
  const [salesFilter, setSalesFilter] = useState("all");
  const [modalOpen, setModalOpen] = useState(false);
  const [editProject, setEditProject] = useState<Project | null>(null);

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
    return matchSearch && matchSales;
  });

  return (
    <section>
      <div className="toolbar">
        <input className="search" value={search} onChange={e => setSearch(e.target.value)} placeholder="Cari project / client…" />
        <select
          value={salesFilter}
          onChange={e => setSalesFilter(e.target.value)}
          style={{ fontSize: 13, padding: "4px 10px", borderRadius: 6, border: "1px solid var(--line)", background: "var(--card)", color: "var(--ink)", cursor: "pointer" }}
        >
          <option value="all">Semua Sales</option>
          {team.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        {!isViewer && <button className="btn" onClick={() => { setEditProject(null); setModalOpen(true); }}>+ Project Baru</button>}
      </div>
      <div className="panel">
        <table>
          <thead>
            <tr>
              <th>Project</th><th>Client</th><th>Partner</th><th>Produk / Solusi</th>
              <th>Status</th><th>Nilai</th><th>Target Go-Live</th><th></th>
            </tr>
          </thead>
          <tbody>
            {filtered.length ? filtered.map(p => (
              <tr key={p.id}>
                <td><b>{p.name}</b><br /><span className="muted" style={{ fontSize: 11 }}>{p.notes}</span></td>
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
      </div>
      <ProjectModal open={modalOpen} project={editProject} clients={clients}
        onSave={onSaveProject} onDelete={onDeleteProject} onClose={() => setModalOpen(false)} />
    </section>
  );
}
