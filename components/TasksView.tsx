"use client";
import { useEffect, useState } from "react";
import { Check, RotateCcw, Download } from "lucide-react";
import { AppData } from "@/hooks/useData";
import { Task, Client, Deal } from "@/types";
import { fmtDate, todayStr, TASK_STATUS_COLOR } from "@/lib/utils";
import { exportTasks } from "@/lib/export";
import TaskModal from "./TaskModal";
import EmptyState from "./ui/EmptyState";
import FilterSheet, { FilterField } from "./ui/FilterSheet";
import SortableTh, { SortDir } from "./ui/SortableTh";
import Pagination from "./ui/Pagination";
import { usePagination } from "@/hooks/usePagination";

type TaskSortKey = "title" | "due_date" | "assigned_to" | "client" | "project" | "status";

interface Props {
  data: AppData;
  currentUserName: string;
  isViewer?: boolean;
  onSaveTask: (t: Task) => Promise<void>;
  onDeleteTask: (id: string) => Promise<void>;
  onCreateDeal: (d: Deal) => Promise<void>;
  // Deep-link: open this task's detail modal on mount (e.g. from GlobalSearch/RemindersBell)
  openTaskId?: string | null;
  onOpenTaskHandled?: () => void;
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

export default function TasksView({ data, currentUserName, isViewer, onSaveTask, onDeleteTask, onCreateDeal, openTaskId, onOpenTaskHandled }: Props) {
  const { tasks, clients, contacts, deals, profiles } = data;
  const team = profiles.filter(p => !["super_admin","admin","viewer"].includes(p.role)).map(p => p.name).filter(Boolean);
  const [modalOpen, setModalOpen] = useState(false);
  const [editTask, setEditTask] = useState<Task | null>(null);
  const [filterStatus, setFilterStatus] = useState<"All" | "Open" | "Done">("Open");
  const [filterAssignee, setFilterAssignee] = useState("All");
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<TaskSortKey>("due_date");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [histSortKey, setHistSortKey] = useState<TaskSortKey>("due_date");
  const [histSortDir, setHistSortDir] = useState<SortDir>("desc");
  const hasActiveFilters = search !== "" || filterStatus !== "Open" || filterAssignee !== "All";
  function clearFilters() {
    setSearch(""); setFilterStatus("Open"); setFilterAssignee("All");
  }

  const clientName = (id: string | null) => id ? (clients.find(c => c.id === id)?.name || "—") : "—";
  const dealName = (id: string | null) => id ? (deals.find(d => d.id === id)?.name || "—") : "—";

  const assignees = ["All", ...team];

  function compareTasks(a: Task, b: Task, key: TaskSortKey, dir: SortDir): number {
    let cmp = 0;
    switch (key) {
      case "title": cmp = a.title.localeCompare(b.title); break;
      case "due_date": cmp = (a.due_date || "").localeCompare(b.due_date || ""); break;
      case "assigned_to": cmp = (a.assigned_to || "").localeCompare(b.assigned_to || ""); break;
      case "client": cmp = clientName(a.client_id).localeCompare(clientName(b.client_id)); break;
      case "project": cmp = dealName(a.deal_id).localeCompare(dealName(b.deal_id)); break;
      case "status": cmp = a.status.localeCompare(b.status); break;
    }
    return dir === "asc" ? cmp : -cmp;
  }
  function toggleSort(key: TaskSortKey) {
    if (key === sortKey) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir("asc"); }
  }
  function toggleHistSort(key: TaskSortKey) {
    if (key === histSortKey) setHistSortDir(d => d === "asc" ? "desc" : "asc");
    else { setHistSortKey(key); setHistSortDir("asc"); }
  }

  const filtered = tasks
    .filter(t => filterStatus === "All" || t.status === filterStatus)
    .filter(t => filterAssignee === "All" || t.assigned_to === filterAssignee)
    .filter(t => !search || t.title.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => compareTasks(a, b, sortKey, sortDir));

  // Riwayat (history) always shows every Done task below the main list, so it
  // doesn't disappear behind the Status filter above — most recently done first.
  const history = tasks
    .filter(t => t.status === "Done")
    .filter(t => filterAssignee === "All" || t.assigned_to === filterAssignee)
    .filter(t => !search || t.title.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => compareTasks(a, b, histSortKey, histSortDir));

  const openCount = tasks.filter(t => t.status === "Open").length;
  const overdueCount = tasks.filter(t => t.status === "Open" && t.due_date && t.due_date < todayStr()).length;

  function openNew() { setEditTask(null); setModalOpen(true); }
  function openEdit(t: Task) { setEditTask(t); setModalOpen(true); }

  const { page, setPage, totalPages, totalItems, pageSize, paged } = usePagination(filtered, 25);
  const { page: histPage, setPage: setHistPage, totalPages: histTotalPages, totalItems: histTotalItems, pageSize: histPageSize, paged: pagedHistory } = usePagination(history, 25);

  useEffect(() => {
    if (!openTaskId) return;
    const task = tasks.find(t => t.id === openTaskId);
    if (task) openEdit(task);
    onOpenTaskHandled?.();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openTaskId]);

  return (
    <section>
      <div className="toolbar">
        <input className="search" value={search} onChange={e => setSearch(e.target.value)} placeholder="Cari task…" />
        <span className="filter-inline">
          <select className="search" style={{ flex: "none", width: "auto" }} value={filterStatus} onChange={e => setFilterStatus(e.target.value as "All" | "Open" | "Done")}>
            <option value="All">Semua status</option>
            <option value="Open">Open</option>
            <option value="Done">Done</option>
          </select>
          <select className="search" style={{ flex: "none", width: "auto" }} value={filterAssignee} onChange={e => setFilterAssignee(e.target.value)}>
            {assignees.map(a => <option key={a} value={a}>{a === "All" ? "Semua Sales" : a}</option>)}
          </select>
          {hasActiveFilters && (
            <button className="btn-clear-filters" onClick={clearFilters} title="Bersihkan semua filter">× Bersihkan filter</button>
          )}
        </span>
        <FilterSheet>
          <FilterField label="Status">
            <select value={filterStatus} onChange={e => setFilterStatus(e.target.value as "All" | "Open" | "Done")}>
              <option value="All">Semua status</option>
              <option value="Open">Open</option>
              <option value="Done">Done</option>
            </select>
          </FilterField>
          <FilterField label="Assigned To">
            <select value={filterAssignee} onChange={e => setFilterAssignee(e.target.value)}>
              {assignees.map(a => <option key={a} value={a}>{a === "All" ? "Semua Sales" : a}</option>)}
            </select>
          </FilterField>
          {hasActiveFilters && (
            <button className="btn-clear-filters" onClick={clearFilters}>× Bersihkan filter</button>
          )}
        </FilterSheet>
        <button className="btn btn-ghost btn-sm" onClick={() => exportTasks(tasks, clientName, dealName)}><Download size={13} /> Export Excel</button>
        {!isViewer && <button className="btn add-btn-desktop" onClick={openNew}>+ Task Baru</button>}
      </div>

      {!isViewer && <button className="fab" onClick={openNew} aria-label="Tambah Task">+</button>}

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
                <SortableTh active={sortKey === "title"} dir={sortDir} onClick={() => toggleSort("title")}>Task</SortableTh>
                <SortableTh active={sortKey === "due_date"} dir={sortDir} onClick={() => toggleSort("due_date")}>Deadline</SortableTh>
                <SortableTh active={sortKey === "assigned_to"} dir={sortDir} onClick={() => toggleSort("assigned_to")}>Assigned To</SortableTh>
                <SortableTh active={sortKey === "client"} dir={sortDir} onClick={() => toggleSort("client")}>Client</SortableTh>
                <SortableTh active={sortKey === "project"} dir={sortDir} onClick={() => toggleSort("project")}>Project</SortableTh>
                <SortableTh active={sortKey === "status"} dir={sortDir} onClick={() => toggleSort("status")}>Status</SortableTh>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {paged.map(t => (
                <tr key={t.id} className={urgencyClass(t.due_date, t.status)}>
                  <td style={{ fontWeight: 600 }}>{t.title}{t.notes && <div style={{ fontWeight: 400, fontSize: 12, color: "var(--ink-soft)" }}>{t.notes}</div>}</td>
                  <td>{t.due_date ? fmtDate(t.due_date) : "—"}</td>
                  <td>{t.assigned_to || "—"}</td>
                  <td>{clientName(t.client_id)}</td>
                  <td>{dealName(t.deal_id)}</td>
                  <td>{statusBadge(t.status)}</td>
                  <td>
                    {!isViewer && (
                      <span style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                        {t.status !== "Done" && (
                          <button className="btn btn-sm" title="Tandai selesai"
                            onClick={() => onSaveTask({ ...t, status: "Done" })}><Check size={13} /> Selesai</button>
                        )}
                        <button className="btn btn-ghost btn-sm" onClick={() => openEdit(t)}>Edit</button>
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="mobile-cards" style={{ padding: 10 }}>
            {paged.map(t => (
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
                    {t.status !== "Done" && (
                      <button className="btn btn-sm" onClick={() => onSaveTask({ ...t, status: "Done" })}><Check size={13} /> Selesai</button>
                    )}
                    <button className="btn btn-ghost btn-sm" onClick={() => openEdit(t)}>Edit</button>
                  </div>
                )}
              </div>
            ))}
          </div>

          <Pagination page={page} totalPages={totalPages} totalItems={totalItems} pageSize={pageSize} onPageChange={setPage} />
        </div>
      )}

      {history.length > 0 && (
        <div className="panel" style={{ padding: 0, marginTop: 18 }}>
          <div style={{ padding: "14px 16px 0", fontWeight: 700, fontSize: 13.5 }}>
            Riwayat Task Selesai <span style={{ fontWeight: 400, color: "var(--ink-soft)", fontSize: 12 }}>({history.length})</span>
          </div>
          <table className="data-table">
            <thead>
              <tr>
                <SortableTh active={histSortKey === "title"} dir={histSortDir} onClick={() => toggleHistSort("title")}>Task</SortableTh>
                <SortableTh active={histSortKey === "due_date"} dir={histSortDir} onClick={() => toggleHistSort("due_date")}>Deadline</SortableTh>
                <SortableTh active={histSortKey === "assigned_to"} dir={histSortDir} onClick={() => toggleHistSort("assigned_to")}>Assigned To</SortableTh>
                <SortableTh active={histSortKey === "client"} dir={histSortDir} onClick={() => toggleHistSort("client")}>Client</SortableTh>
                <SortableTh active={histSortKey === "project"} dir={histSortDir} onClick={() => toggleHistSort("project")}>Project</SortableTh>
                <SortableTh active={histSortKey === "status"} dir={histSortDir} onClick={() => toggleHistSort("status")}>Status</SortableTh>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {pagedHistory.map(t => (
                <tr key={t.id} style={{ opacity: 0.75 }}>
                  <td style={{ fontWeight: 600 }}>{t.title}{t.notes && <div style={{ fontWeight: 400, fontSize: 12, color: "var(--ink-soft)" }}>{t.notes}</div>}</td>
                  <td>{t.due_date ? fmtDate(t.due_date) : "—"}</td>
                  <td>{t.assigned_to || "—"}</td>
                  <td>{clientName(t.client_id)}</td>
                  <td>{dealName(t.deal_id)}</td>
                  <td>{statusBadge(t.status)}</td>
                  <td>
                    {!isViewer && (
                      <span style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                        <button className="btn btn-ghost btn-sm" title="Buka lagi"
                          onClick={() => onSaveTask({ ...t, status: "Open" })}><RotateCcw size={13} /> Buka lagi</button>
                        <button className="btn btn-ghost btn-sm" onClick={() => openEdit(t)}>Edit</button>
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="mobile-cards" style={{ padding: 10 }}>
            {pagedHistory.map(t => (
              <div key={t.id} className="mcard" style={{ opacity: 0.75 }}>
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
                    <button className="btn btn-ghost btn-sm" onClick={() => onSaveTask({ ...t, status: "Open" })}><RotateCcw size={13} /> Buka lagi</button>
                    <button className="btn btn-ghost btn-sm" onClick={() => openEdit(t)}>Edit</button>
                  </div>
                )}
              </div>
            ))}
          </div>

          <Pagination page={histPage} totalPages={histTotalPages} totalItems={histTotalItems} pageSize={histPageSize} onPageChange={setHistPage} />
        </div>
      )}

      <TaskModal open={modalOpen} task={editTask} clients={clients} contacts={contacts} deals={deals} team={team} defaultAssignee={currentUserName}
        onSave={onSaveTask} onDelete={onDeleteTask} onCreateDeal={onCreateDeal} onClose={() => setModalOpen(false)} />
    </section>
  );
}
