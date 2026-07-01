"use client";
import { useState } from "react";
import { AppData } from "@/hooks/useData";
import { Task, Client, Deal } from "@/types";
import { fmtDate, todayStr, TASK_STATUS_COLOR } from "@/lib/utils";
import TaskModal from "./TaskModal";
import EmptyState from "./ui/EmptyState";

interface Props {
  data: AppData;
  currentUserName: string;
  isViewer?: boolean;
  onSaveTask: (t: Task) => Promise<void>;
  onDeleteTask: (id: string) => Promise<void>;
  onCreateDeal: (d: Deal) => Promise<void>;
}

function statusBadge(status: string) {
  const c = TASK_STATUS_COLOR[status] || { bg: "#EAE6DA", fg: "#5C5440" };
  return (
    <span style={{
      display: "inline-block", padding: "2px 10px", borderRadius: 999,
      fontSize: 11, fontWeight: 700, background: c.bg, color: c.fg,
    }}>{status}</span>
  );
}

function urgencyClass(dueDate: string, status: string): string {
  if (status === "Done") return "";
  const today = todayStr();
  if (dueDate < today) return "task-overdue";
  const diff = (new Date(dueDate).getTime() - new Date(today).getTime()) / 86400000;
  if (diff <= 3) return "task-soon";
  return "";
}

export default function TasksView({ data, currentUserName, isViewer, onSaveTask, onDeleteTask, onCreateDeal }: Props) {
  const { tasks, clients, contacts, deals, profiles } = data;
  const team = profiles.filter(p => !["super_admin","admin","viewer"].includes(p.role)).map(p => p.name).filter(Boolean);
  const [modalOpen, setModalOpen] = useState(false);
  const [editTask, setEditTask] = useState<Task | null>(null);
  const [filterStatus, setFilterStatus] = useState<"All" | "Open" | "Done">("Open");
  const [filterAssignee, setFilterAssignee] = useState("All");
  const [search, setSearch] = useState("");

  const clientName = (id: string | null) => id ? (clients.find(c => c.id === id)?.name || "—") : "—";
  const dealName = (id: string | null) => id ? (deals.find(d => d.id === id)?.name || "—") : "—";

  const assignees = ["All", ...team];

  const filtered = tasks
    .filter(t => filterStatus === "All" || t.status === filterStatus)
    .filter(t => filterAssignee === "All" || t.assigned_to === filterAssignee)
    .filter(t => !search || t.title.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => (a.due_date || "").localeCompare(b.due_date || ""));

  const openCount = tasks.filter(t => t.status === "Open").length;
  const overdueCount = tasks.filter(t => t.status === "Open" && t.due_date && t.due_date < todayStr()).length;

  function openNew() { setEditTask(null); setModalOpen(true); }
  function openEdit(t: Task) { setEditTask(t); setModalOpen(true); }

  return (
    <section>
      <div className="toolbar">
        <input className="search" value={search} onChange={e => setSearch(e.target.value)} placeholder="Cari task…" />
        <select className="search" style={{ flex: "none", width: "auto" }} value={filterStatus} onChange={e => setFilterStatus(e.target.value as "All" | "Open" | "Done")}>
          <option value="All">Semua status</option>
          <option value="Open">Open</option>
          <option value="Done">Done</option>
        </select>
        <select className="search" style={{ flex: "none", width: "auto" }} value={filterAssignee} onChange={e => setFilterAssignee(e.target.value)}>
          {assignees.map(a => <option key={a} value={a}>{a === "All" ? "Semua Sales" : a}</option>)}
        </select>
        {!isViewer && <button className="btn" onClick={openNew}>+ Task Baru</button>}
      </div>

      {(openCount > 0 || overdueCount > 0) && (
        <div className="task-summary">
          <span className="task-summary-item">{openCount} task terbuka</span>
          {overdueCount > 0 && <span className="task-summary-item task-overdue-badge">{overdueCount} overdue</span>}
        </div>
      )}

      {!filtered.length ? (
        <div className="panel"><EmptyState icon="✅" label="Tidak ada task yang cocok" sub="Coba ubah filter atau tambah task baru" /></div>
      ) : (
        <div className="panel" style={{ padding: 0 }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Task</th>
                <th>Deadline</th>
                <th>Assigned To</th>
                <th>Client</th>
                <th>Project</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(t => (
                <tr key={t.id} className={urgencyClass(t.due_date, t.status)}>
                  <td style={{ fontWeight: 600 }}>{t.title}{t.notes && <div style={{ fontWeight: 400, fontSize: 12, color: "var(--ink-soft)" }}>{t.notes}</div>}</td>
                  <td>{t.due_date ? fmtDate(t.due_date) : "—"}</td>
                  <td>{t.assigned_to || "—"}</td>
                  <td>{clientName(t.client_id)}</td>
                  <td>{dealName(t.deal_id)}</td>
                  <td>{statusBadge(t.status)}</td>
                  <td>{!isViewer && <button className="btn btn-ghost btn-sm" onClick={() => openEdit(t)}>Edit</button>}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="mobile-cards" style={{ padding: 10 }}>
            {filtered.map(t => (
              <div key={t.id} className={`mcard ${urgencyClass(t.due_date, t.status)}`}>
                <div className="mcard-head">
                  <div className="mcard-title">{t.title}</div>
                  {statusBadge(t.status)}
                </div>
                {t.notes && <div style={{ fontSize: 12, color: "var(--ink-soft)" }}>{t.notes}</div>}
                <div className="mcard-row"><span>Deadline</span><b>{t.due_date ? fmtDate(t.due_date) : "—"}</b></div>
                <div className="mcard-row"><span>Assigned To</span><b>{t.assigned_to || "—"}</b></div>
                <div className="mcard-row"><span>Client</span><b>{clientName(t.client_id)}</b></div>
                <div className="mcard-row"><span>Project</span><b>{dealName(t.deal_id)}</b></div>
                {!isViewer && (
                  <div className="mcard-actions">
                    <button className="btn btn-ghost btn-sm" onClick={() => openEdit(t)}>Edit</button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <TaskModal open={modalOpen} task={editTask} clients={clients} contacts={contacts} deals={deals} team={team} defaultAssignee={currentUserName}
        onSave={onSaveTask} onDelete={onDeleteTask} onCreateDeal={onCreateDeal} onClose={() => setModalOpen(false)} />
    </section>
  );
}
