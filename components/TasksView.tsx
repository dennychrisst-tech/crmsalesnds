"use client";
import { useState } from "react";
import { AppData } from "@/hooks/useData";
import { Task, Client, Deal } from "@/types";
import { fmtDate, todayStr } from "@/lib/utils";
import TaskModal from "./TaskModal";

interface Props {
  data: AppData;
  currentUserName: string;
  onSaveTask: (t: Task) => Promise<void>;
  onDeleteTask: (id: string) => Promise<void>;
}

function statusBadge(status: string) {
  const cls = status === "Done" ? "badge badge-won" : "badge badge-lead";
  return <span className={cls}>{status}</span>;
}

function urgencyClass(dueDate: string, status: string): string {
  if (status === "Done") return "";
  const today = todayStr();
  if (dueDate < today) return "task-overdue";
  const diff = (new Date(dueDate).getTime() - new Date(today).getTime()) / 86400000;
  if (diff <= 3) return "task-soon";
  return "";
}

export default function TasksView({ data, currentUserName, onSaveTask, onDeleteTask }: Props) {
  const { tasks, clients, deals, profiles } = data;
  const team = profiles.filter(p => !["super_admin","admin"].includes(p.role)).map(p => p.name).filter(Boolean);
  const [modalOpen, setModalOpen] = useState(false);
  const [editTask, setEditTask] = useState<Task | null>(null);
  const [filterStatus, setFilterStatus] = useState<"All" | "Open" | "Done">("Open");
  const [filterAssignee, setFilterAssignee] = useState("All");
  const [search, setSearch] = useState("");

  const clientName = (id: string | null) => id ? (clients.find(c => c.id === id)?.name || "—") : "—";
  const dealName = (id: string | null) => id ? (deals.find(d => d.id === id)?.name || "—") : "—";

  const assignees = ["All", ...Array.from(new Set(tasks.map(t => t.assigned_to).filter(Boolean)))];

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
          {assignees.map(a => <option key={a} value={a}>{a === "All" ? "Semua PIC" : a}</option>)}
        </select>
        <button className="btn" onClick={openNew}>+ Task Baru</button>
      </div>

      {(openCount > 0 || overdueCount > 0) && (
        <div className="task-summary">
          <span className="task-summary-item">{openCount} task terbuka</span>
          {overdueCount > 0 && <span className="task-summary-item task-overdue-badge">{overdueCount} overdue</span>}
        </div>
      )}

      {!filtered.length ? (
        <div className="panel"><div className="empty-state">Tidak ada task yang cocok.</div></div>
      ) : (
        <div className="panel" style={{ padding: 0 }}>
          <table>
            <thead>
              <tr>
                <th>Task</th>
                <th>Deadline</th>
                <th>Assigned To</th>
                <th>Client</th>
                <th>Deal</th>
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
                  <td><button className="btn btn-ghost btn-sm" onClick={() => openEdit(t)}>Edit</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <TaskModal open={modalOpen} task={editTask} clients={clients} deals={deals} team={team} defaultAssignee={currentUserName}
        onSave={onSaveTask} onDelete={onDeleteTask} onClose={() => setModalOpen(false)} />
    </section>
  );
}
