"use client";
import { useState } from "react";
import { AppData } from "@/hooks/useData";
import { Project } from "@/types";
import { fmtIDR, fmtDate } from "@/lib/utils";
import ProjectModal from "./ProjectModal";

interface Props {
  data: AppData;
  isViewer?: boolean;
  onSaveProject: (p: Project) => Promise<void>;
  onDeleteProject: (id: string) => Promise<void>;
}

export default function Projects({ data, isViewer, onSaveProject, onDeleteProject }: Props) {
  const { clients, projects } = data;
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editProject, setEditProject] = useState<Project | null>(null);

  const clientName = (id: string) => clients.find(c => c.id === id)?.name || "—";
  const filtered = projects.filter(p => p.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <section>
      <div className="toolbar">
        <input className="search" value={search} onChange={e => setSearch(e.target.value)} placeholder="Cari project…" />
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
                <td>{p.partner ? <span style={{ fontSize: 12, background: "var(--bg)", border: "1px solid var(--line)", borderRadius: 5, padding: "2px 8px" }}>{p.partner}</span> : <span className="muted">—</span>}</td>
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
