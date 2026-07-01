"use client";
import { useState, useRef, useEffect } from "react";
import { AppData } from "@/hooks/useData";
import { ActiveView } from "@/types";
import { fmtDate, todayStr } from "@/lib/utils";

interface Props {
  data: AppData;
  currentUserName: string;
  isAdmin: boolean;
  onNavigate: (view: ActiveView) => void;
}

interface Reminder {
  id: string;
  title: string;
  sub: string;
  severity: "overdue" | "today";
  view: ActiveView;
}

export default function RemindersBell({ data, currentUserName, isAdmin, onNavigate }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const today = todayStr();

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

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
      reminders.push({ id: `t-overdue-${t.id}`, title: `Task terlambat: ${t.title}`, sub: `${fmtDate(t.due_date)} · ${t.assigned_to || "—"}`, severity: "overdue", view: "tasks" });
    } else if (t.due_date === today) {
      reminders.push({ id: `t-today-${t.id}`, title: `Task jatuh tempo hari ini: ${t.title}`, sub: `${t.assigned_to || "—"}`, severity: "today", view: "tasks" });
    }
  });

  reminders.sort((a, b) => (a.severity === b.severity ? 0 : a.severity === "overdue" ? -1 : 1));

  const overdueCount = reminders.filter(r => r.severity === "overdue").length;
  const badgeColor = overdueCount > 0 ? "var(--danger)" : reminders.length > 0 ? "var(--gold)" : null;

  function pick(view: ActiveView) {
    onNavigate(view);
    setOpen(false);
  }

  return (
    <div ref={ref} className="rb-wrap">
      <button className="rb-bell" onClick={() => setOpen(o => !o)} title="Reminder" aria-label="Reminder">
        🔔
        {reminders.length > 0 && (
          <span className="rb-badge" style={{ background: badgeColor || undefined }}>{reminders.length > 9 ? "9+" : reminders.length}</span>
        )}
      </button>
      {open && (
        <div className="rb-dropdown">
          <div className="rb-header">Reminder{!isAdmin && currentUserName ? ` — ${currentUserName}` : ""}</div>
          {reminders.length === 0 ? (
            <div className="rb-empty">Tidak ada reminder. Semua aman 🎉</div>
          ) : reminders.map(r => (
            <div key={r.id} className="rb-item" onClick={() => pick(r.view)}>
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
