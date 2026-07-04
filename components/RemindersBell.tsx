"use client";
import { useState, useRef, useEffect } from "react";
import { Bell } from "lucide-react";
import { AppData } from "@/hooks/useData";
import { ActiveView } from "@/types";
import { fmtDate, todayStr } from "@/lib/utils";

interface Props {
  data: AppData;
  currentUserName: string;
  isAdmin: boolean;
  onNavigate: (view: ActiveView) => void;
  onOpenTask: (id: string) => void;
}

interface Reminder {
  id: string;
  title: string;
  sub: string;
  severity: "overdue" | "today";
  view: ActiveView;
  // Only set for task reminders — lets pick() open that task directly instead
  // of just landing on the Tasks tab (matches how Client/Deal search results
  // already deep-link straight to the record).
  taskId?: string;
}

export default function RemindersBell({ data, currentUserName, isAdmin, onNavigate, onOpenTask }: Props) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number; width: number } | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const bellRef = useRef<HTMLButtonElement>(null);
  const today = todayStr();

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  function updatePosition() {
    if (!bellRef.current) return;
    const rect = bellRef.current.getBoundingClientRect();
    const width = Math.min(320, window.innerWidth - 20);
    const left = Math.max(10, Math.min(rect.right - width, window.innerWidth - width - 10));
    setPos({ top: rect.bottom + 6, left, width });
  }

  function toggle() {
    if (!open) updatePosition();
    setOpen(o => !o);
  }

  useEffect(() => {
    if (!open) return;
    window.addEventListener("resize", updatePosition);
    return () => window.removeEventListener("resize", updatePosition);
  }, [open]);

  const clientName = (id: string) => data.clients.find(c => c.id === id)?.name || "—";
  const mine = (owner: string) => isAdmin || owner === currentUserName;

  const reminders: Reminder[] = [];

  data.visits.filter(v => mine(v.pic)).forEach(v => {
    if (v.status === "Planned" && v.date && v.date < today) {
      reminders.push({ id: `v-overdue-${v.id}`, title: `Visit ke ${clientName(v.client_id)} terlewat`, sub: `${fmtDate(v.date)} · ${v.pic || "—"}`, severity: "overdue", view: "calendar" });
    } else if (v.status === "Planned" && v.date === today) {
      reminders.push({ id: `v-today-${v.id}`, title: `Visit ke ${clientName(v.client_id)} hari ini`, sub: `${v.purpose || "—"} · ${v.pic || "—"}`, severity: "today", view: "calendar" });
    } else if (v.status === "Reschedule") {
      reminders.push({ id: `v-resched-${v.id}`, title: `Follow-up: ${clientName(v.client_id)} perlu dijadwalkan ulang`, sub: `${fmtDate(v.date)} · ${v.pic || "—"}`, severity: "overdue", view: "calendar" });
    }
  });

  data.tasks.filter(t => t.status === "Open" && mine(t.assigned_to)).forEach(t => {
    if (t.due_date && t.due_date < today) {
      reminders.push({ id: `t-overdue-${t.id}`, title: `Task terlambat: ${t.title}`, sub: `${fmtDate(t.due_date)} · ${t.assigned_to || "—"}`, severity: "overdue", view: "tasks", taskId: t.id });
    } else if (t.due_date === today) {
      reminders.push({ id: `t-today-${t.id}`, title: `Task jatuh tempo hari ini: ${t.title}`, sub: `${t.assigned_to || "—"}`, severity: "today", view: "tasks", taskId: t.id });
    }
  });

  reminders.sort((a, b) => (a.severity === b.severity ? 0 : a.severity === "overdue" ? -1 : 1));

  const overdueCount = reminders.filter(r => r.severity === "overdue").length;
  const badgeColor = overdueCount > 0 ? "var(--danger)" : reminders.length > 0 ? "var(--gold)" : null;

  function pick(r: Reminder) {
    if (r.taskId) onOpenTask(r.taskId);
    else onNavigate(r.view);
    setOpen(false);
  }

  return (
    <div ref={ref} className="rb-wrap">
      <button ref={bellRef} className="rb-bell" onClick={toggle} title="Reminder" aria-label="Reminder">
        <Bell size={17} />
        {reminders.length > 0 && (
          <span className="rb-badge" style={{ background: badgeColor || undefined }}>{reminders.length > 9 ? "9+" : reminders.length}</span>
        )}
      </button>
      {open && pos && (
        <div className="rb-dropdown" style={{ position: "fixed", top: pos.top, left: pos.left, width: pos.width }}>
          <div className="rb-header">Reminder{!isAdmin && currentUserName ? ` — ${currentUserName}` : ""}</div>
          {reminders.length === 0 ? (
            <div className="rb-empty">Tidak ada reminder. Semua aman 🎉</div>
          ) : reminders.map(r => (
            <div key={r.id} className="rb-item" onClick={() => pick(r)}>
              <span className={`rb-dot rb-dot-${r.severity}`} />
              <div className="rb-item-text">
                <div className="rb-item-title">{r.title}</div>
                <div className="rb-item-sub">{r.sub}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
