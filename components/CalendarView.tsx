"use client";
import { useState, useEffect } from "react";
import { DndContext, DragEndEvent, DragOverlay, DragStartEvent, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { useDroppable, useDraggable } from "@dnd-kit/core";
import { AppData } from "@/hooks/useData";
import { Visit, CalendarEvent, Task, Deal, Contact, DateRange } from "@/types";
import { fmtDate, todayStr, picList, picMatches, colorForSales, holidayName } from "@/lib/utils";
import { VisitBadge } from "./ui/Badge";
import EmptyState from "./ui/EmptyState";
import VisitModal from "./VisitModal";
import EventModal from "./EventModal";
import { exportVisits } from "@/lib/export";
import { v4 as uuid } from "uuid";
import { Download } from "lucide-react";
import { toast } from "./ui/Toast";
import FilterSheet, { FilterField } from "./ui/FilterSheet";

const WFO_DRAG_PREFIX = "wfo:";
const LEAVE_DRAG_PREFIX = "leave:";

interface Props {
  data: AppData;
  currentUserName: string;
  isViewer?: boolean;
  onSaveVisit: (v: Visit) => Promise<void>;
  onDeleteVisit: (id: string) => Promise<void>;
  onSaveEvent: (e: CalendarEvent) => Promise<void>;
  onDeleteEvent: (id: string) => Promise<void>;
  onCreateTask: (t: Task) => Promise<void>;
  onCreateDeal: (d: Deal) => Promise<void>;
  onSaveContact: (c: Contact) => Promise<void>;
  // Deep-link: open this visit's detail modal on mount (e.g. from Summary Activity)
  openVisitId?: string | null;
  onOpenVisitHandled?: () => void;
  // Deep-link: jump to and filter this week (e.g. from Weekly Report's KPI
  // cards) — consumed once on mount, then held as local state (see weekFocus
  // below) until the user dismisses it.
  weekFocus?: DateRange | null;
  onWeekFocusHandled?: () => void;
}

function WfoChip({ name }: { name: string }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: `${WFO_DRAG_PREFIX}${name}` });
  const style = transform ? { transform: `translate3d(${transform.x}px,${transform.y}px,0)`, opacity: isDragging ? 0.4 : 1 } : {};
  return (
    <div ref={setNodeRef} {...listeners} {...attributes} style={style} className="wfo-chip">
      🏢 {name}
    </div>
  );
}

function LeaveChip({ name }: { name: string }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: `${LEAVE_DRAG_PREFIX}${name}` });
  const style = transform ? { transform: `translate3d(${transform.x}px,${transform.y}px,0)`, opacity: isDragging ? 0.4 : 1 } : {};
  return (
    <div ref={setNodeRef} {...listeners} {...attributes} style={style} className="leave-chip">
      ✈️ {name}
    </div>
  );
}

// Mobile alternative to dragging a WfoChip onto the grid: a plain date + name
// form. Works the same on any screen size, so it doesn't rely on touch-drag.
function WfoQuickForm({ team, onMark }: { team: string[]; onMark: (name: string, ds: string) => Promise<void> }) {
  const [date, setDate] = useState(todayStr());
  const [name, setName] = useState(team[0] || "");
  const [saving, setSaving] = useState(false);

  async function submit() {
    if (!name || !date || saving) return;
    setSaving(true);
    try { await onMark(name, date); } finally { setSaving(false); }
  }

  return (
    <div className="wfo-quick-form">
      <div className="wfo-quick-row">
        <input type="date" value={date} onChange={e => setDate(e.target.value)} />
        <select value={name} onChange={e => setName(e.target.value)}>
          {team.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>
      <button type="button" className="btn" disabled={!name || !date || saving} onClick={submit}>
        {saving ? "Menandai…" : "🏢 Tandai WFO"}
      </button>
    </div>
  );
}

// Mobile alternative to dragging a LeaveChip onto the grid — same shape as WfoQuickForm.
function LeaveQuickForm({ team, onMark }: { team: string[]; onMark: (name: string, ds: string) => Promise<void> }) {
  const [date, setDate] = useState(todayStr());
  const [name, setName] = useState(team[0] || "");
  const [saving, setSaving] = useState(false);

  async function submit() {
    if (!name || !date || saving) return;
    setSaving(true);
    try { await onMark(name, date); } finally { setSaving(false); }
  }

  return (
    <div className="leave-quick-form">
      <div className="leave-quick-row">
        <input type="date" value={date} onChange={e => setDate(e.target.value)} />
        <select value={name} onChange={e => setName(e.target.value)}>
          {team.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>
      <button type="button" className="btn" disabled={!name || !date || saving} onClick={submit}>
        {saving ? "Menandai…" : "✈️ Tandai Cuti"}
      </button>
    </div>
  );
}

function AgendaDayCard({
  ds, day, y, m, today, isWeekend, holiday, dayVisits, dayEvents, clientName, isViewer, onEditVisit, onEditEvent,
}: {
  ds: string; day: number; y: number; m: number; today: string; isWeekend: boolean; holiday?: string; dayVisits: Visit[]; dayEvents: CalendarEvent[];
  clientName: (id: string) => string; isViewer?: boolean;
  onEditVisit: (v: Visit) => void; onEditEvent: (e: CalendarEvent) => void;
}) {
  const label = new Date(y, m, day).toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long" });
  return (
    <div className="agenda-day">
      <div className={`agenda-date${ds === today ? " is-today" : ""}${isWeekend ? " agenda-date-weekend" : ""}${holiday ? " agenda-date-holiday" : ""}`}>
        <span>{label}</span>
        {holiday && <span className="agenda-holiday-badge">🔴 {holiday}</span>}
      </div>
      <div className="agenda-items">
        {dayVisits.map(v => {
          const names = picList(v.pic);
          const color = colorForSales(names[0] || "—");
          const isReschedule = v.status === "Reschedule";
          const isTentative = v.status === "Tentative";
          const isCancel = v.status === "Cancel";
          const isRescheduledInto = !!v.rescheduled_from_id;
          return (
            <button key={v.id} type="button" className="agenda-item" style={{ background: isCancel ? "#FDE4E4" : isTentative ? "#FEF9C3" : "var(--paper)", border: isTentative ? "1px dashed #FDE047" : undefined, opacity: isCancel ? 0.7 : 1 }}
              onClick={() => { if (!isViewer) onEditVisit(v); }}>
              <span className="agenda-item-dot" style={{ background: color.bg }} />
              <span>
                <div className="agenda-item-title" style={{ textDecoration: isCancel ? "line-through" : "none" }}>{isReschedule ? "↻ " : isRescheduledInto ? "↩ " : isTentative ? "◐ " : isCancel ? "✕ " : ""}{clientName(v.client_id)}</div>
                <div className="agenda-item-sub">
                  {v.purpose}{names.length ? ` · ${names.join(" & ")}` : ""}
                  {v.status === "Done" ? " · Selesai" : ""}
                  {isReschedule ? ` · Reschedule${v.followup_date ? " ke " + fmtDate(v.followup_date) : ""}` : ""}
                  {isRescheduledInto ? " · Hasil reschedule" : ""}
                  {isTentative ? " · Tentative — janji dgn PIC blm fix" : ""}
                  {isCancel ? " · Dibatalkan" : ""}
                </div>
              </span>
            </button>
          );
        })}
        {dayEvents.map(ev => {
          const isWfo = ev.type === "WFO";
          const isLeave = ev.type === "Cuti";
          const isSpecial = isWfo || isLeave;
          const isPending = ev.id.startsWith("pending-");
          const isCancel = !isSpecial && ev.status === "Cancel";
          const isReschedule = !isSpecial && ev.status === "Reschedule";
          const isDone = !isSpecial && ev.status === "Done";
          const statusNote = isCancel ? " · Dibatalkan"
            : isReschedule ? ` · Reschedule${ev.followup_date ? " ke " + fmtDate(ev.followup_date) : ""}`
            : isDone ? " · Selesai" : "";
          return (
            <button key={ev.id} type="button" className="agenda-item"
              style={{ background: isWfo ? "var(--brand-soft)" : isLeave ? "#FEE2E2" : "var(--paper)", color: isLeave ? "#991B1B" : undefined, cursor: isPending ? "default" : "pointer", opacity: isPending ? 0.55 : (isCancel || isDone) ? 0.6 : 1 }}
              onClick={isPending ? undefined : () => { if (!isViewer) onEditEvent(ev); }}>
              <span className="agenda-item-dot" style={{ background: isWfo ? "var(--brand)" : isLeave ? "#991B1B" : "var(--gold)" }} />
              <span>
                <div className="agenda-item-title" style={{ textDecoration: isCancel ? "line-through" : "none" }}>
                  {isWfo ? `🏢 WFO — ${ev.created_by || "—"}` : isLeave ? `✈️ Cuti — ${ev.created_by || "—"}` : ev.title}{isPending ? "…" : ""}
                </div>
                {!isSpecial && <div className="agenda-item-sub">{ev.type}{ev.created_by ? ` · ${ev.created_by}` : ""}{statusNote}</div>}
              </span>
            </button>
          );
        })}
        {!dayVisits.length && !dayEvents.length && <div className="agenda-item-sub" style={{ padding: "2px 4px" }}>Tidak ada jadwal.</div>}
      </div>
    </div>
  );
}

function DayCell({
  ds, day, isToday, isWeekend, isWeekFocus, holiday, dayVisits, dayEvents, clientName, isViewer, activeDragKind, onOpenNewVisit, onEditVisit, onEditEvent,
}: {
  ds: string; day: number; isToday: boolean; isWeekend: boolean; isWeekFocus?: boolean; holiday?: string; dayVisits: Visit[]; dayEvents: CalendarEvent[];
  clientName: (id: string) => string; isViewer?: boolean; activeDragKind: "wfo" | "leave" | null;
  onOpenNewVisit: (ds: string) => void; onEditVisit: (v: Visit) => void; onEditEvent: (e: CalendarEvent) => void;
}) {
  const { isOver, setNodeRef } = useDroppable({ id: ds });
  const dropClass = isOver ? (activeDragKind === "leave" ? " leave-drop-target" : " wfo-drop-target") : "";
  return (
    <div ref={setNodeRef} className={`cell${isToday ? " today" : ""}${isWeekend ? " weekend" : ""}${holiday ? " cell-holiday" : ""}${isWeekFocus ? " cell-week-focus" : ""}${dropClass}`}
      onDoubleClick={() => { if (!isViewer) onOpenNewVisit(ds); }}
      title={holiday ? holiday : isViewer ? "" : "Double-klik untuk tambah visit, atau seret WFO/Cuti ke sini"}>
      <div className="dnum">{day}</div>
      {holiday && <div className="dnum-holiday" title={holiday}>{holiday}</div>}
      {dayVisits.map(v => {
        const names = picList(v.pic);
        const colors = (names.length ? names : ["—"]).map(colorForSales);
        const background = colors.length > 1
          ? `linear-gradient(90deg, ${colors[0].bg} 50%, ${colors[1].bg} 50%)`
          : colors[0].bg;
        const isReschedule = v.status === "Reschedule";
        const isTentative = v.status === "Tentative";
        const isCancel = v.status === "Cancel";
        const isRescheduledInto = !!v.rescheduled_from_id;
        const rescheduleNote = isReschedule ? ` · Reschedule ke ${v.followup_date ? fmtDate(v.followup_date) : "-"}` : isRescheduledInto ? " · Hasil reschedule" : isTentative ? " · Tentative — janji dgn PIC blm fix" : isCancel ? " · Dibatalkan" : "";
        return (
          <div key={v.id} className="vpill"
            style={{
              // Cancel overrides to red since it's no longer an active schedule, but
              // Tentative keeps the sales color as background (see below) — only a
              // small yellow "tentative" chip is added, so who it belongs to stays visible.
              background: isCancel ? "#FEE2E2" : background,
              color: isCancel ? "#991B1B" : colors[0].fg,
              opacity: v.status === "Done" ? 0.55 : isCancel ? 0.85 : isReschedule ? 0.8 : 1,
              textDecoration: v.status === "Done" || isCancel ? "line-through" : "none",
              border: isReschedule ? `1.5px dashed ${colors[0].fg}` : isRescheduledInto ? `1.5px solid ${colors[0].fg}` : isTentative ? "1.5px dotted #FDE047" : undefined,
            }}
            onClick={e => { e.stopPropagation(); if (!isViewer) onEditVisit(v); }}
            title={`${clientName(v.client_id)}: ${v.purpose} (${names.join(" & ") || "Tanpa sales"})${rescheduleNote}`}>
            {isReschedule ? "↻ " : isRescheduledInto ? "↩ " : isTentative ? "◐ " : isCancel ? "✕ " : ""}{clientName(v.client_id)}
            {isTentative && <span style={{ background: "#FDE047", color: "#713F12", borderRadius: 3, padding: "0 4px", fontSize: "0.72em", fontWeight: 600, fontStyle: "italic", marginLeft: 4 }}>tentative</span>}
          </div>
        );
      })}
      {dayEvents.map(ev => {
        const isWfo = ev.type === "WFO";
        const isLeave = ev.type === "Cuti";
        const isSpecial = isWfo || isLeave;
        const isPending = ev.id.startsWith("pending-");
        const isCancel = !isSpecial && ev.status === "Cancel";
        const isReschedule = !isSpecial && ev.status === "Reschedule";
        const isDone = !isSpecial && ev.status === "Done";
        const statusNote = isCancel ? " · Dibatalkan"
          : isReschedule ? ` · Reschedule${ev.followup_date ? " ke " + fmtDate(ev.followup_date) : ""}`
          : isDone ? " · Selesai" : "";
        return (
          <div key={ev.id} className={`vpill ${isWfo ? "vpill-wfo" : isLeave ? "vpill-leave" : "vpill-event"}`}
            style={{
              cursor: isPending ? "default" : "pointer",
              opacity: isPending ? 0.5 : (isCancel || isDone) ? 0.55 : 1,
              textDecoration: isCancel ? "line-through" : "none",
            }}
            onClick={isPending ? undefined : e => { e.stopPropagation(); if (!isViewer) onEditEvent(ev); }}
            title={isPending ? "Menyimpan…" : isWfo ? `WFO: ${ev.created_by || "—"}` : isLeave ? `Cuti: ${ev.created_by || "—"}` : `${ev.title}${statusNote}`}>
            {isWfo ? `🏢 ${ev.created_by || "WFO"}` : isLeave ? `✈️ ${ev.created_by || "Cuti"}` : `${isReschedule ? "↻ " : ""}${ev.title}`}{isPending ? "…" : ""}
          </div>
        );
      })}
    </div>
  );
}

export default function CalendarView({ data, currentUserName, isViewer, onSaveVisit, onDeleteVisit, onSaveEvent, onDeleteEvent, onCreateTask, onCreateDeal, onSaveContact, openVisitId, onOpenVisitHandled, weekFocus, onWeekFocusHandled }: Props) {
  const { clients, contacts, visits, events, deals, projects, profiles } = data;
  const team = profiles.filter(p => !["super_admin","admin","viewer"].includes(p.role)).map(p => p.name).filter(Boolean);
  const salesLegend = Array.from(new Set([...team, ...visits.flatMap(v => picList(v.pic))])).sort((a, b) => a.localeCompare(b));

  async function handleSaveVisit(v: Visit) {
    await onSaveVisit(v);
  }
  const [salesFilter, setSalesFilter] = useState("all");
  const [cursor, setCursor] = useState(() => { const d = new Date(); d.setDate(1); return d; });
  const [visitModal, setVisitModal] = useState(false);
  const [eventModal, setEventModal] = useState(false);
  const [editVisit, setEditVisit] = useState<Visit | null>(null);
  const [editEvent, setEditEvent] = useState<CalendarEvent | null>(null);
  const [preClientId, setPreClientId] = useState<string | undefined>();
  const [preDate, setPreDate] = useState<string | undefined>();
  const [showWfoPanel, setShowWfoPanel] = useState(false);
  const [activeWfoName, setActiveWfoName] = useState<string | null>(null);
  const [pendingWfo, setPendingWfo] = useState<Set<string>>(new Set());
  const [showLeavePanel, setShowLeavePanel] = useState(false);
  const [activeLeaveName, setActiveLeaveName] = useState<string | null>(null);
  const [pendingLeave, setPendingLeave] = useState<Set<string>>(new Set());
  const [localWeekFocus, setLocalWeekFocus] = useState<DateRange | null>(null);

  useEffect(() => {
    if (!weekFocus) return;
    setLocalWeekFocus(weekFocus);
    setCursor(new Date(weekFocus.start + "T00:00:00"));
    onWeekFocusHandled?.();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weekFocus]);

  const clientName = (id: string) => clients.find(c => c.id === id)?.name || "—";
  const y = cursor.getFullYear(), m = cursor.getMonth();
  const title = cursor.toLocaleDateString("id-ID", { month: "long", year: "numeric" });
  const firstDay = new Date(y, m, 1).getDay();
  const daysInMonth = new Date(y, m + 1, 0).getDate();
  const today = todayStr();
  const dows = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];

  function prevMonth() { setCursor(d => { const n = new Date(d); n.setMonth(n.getMonth() - 1); return n; }); }
  function nextMonth() { setCursor(d => { const n = new Date(d); n.setMonth(n.getMonth() + 1); return n; }); }

  function openNewVisit(dateStr?: string) { setEditVisit(null); setPreClientId(undefined); setPreDate(dateStr); setVisitModal(true); }
  function openEditVisit(v: Visit) { setEditVisit(v); setPreClientId(undefined); setPreDate(undefined); setVisitModal(true); }

  useEffect(() => {
    if (!openVisitId) return;
    const visit = visits.find(v => v.id === openVisitId);
    if (visit) openEditVisit(visit);
    onOpenVisitHandled?.();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openVisitId]);
  function openNewEvent(dateStr?: string) { setEditEvent(null); setPreDate(dateStr); setEventModal(true); }
  function openEditEvent(e: CalendarEvent) { setEditEvent(e); setPreDate(undefined); setEventModal(true); }

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  function handleDragStart(e: DragStartEvent) {
    const id = String(e.active.id);
    if (id.startsWith(WFO_DRAG_PREFIX)) setActiveWfoName(id.slice(WFO_DRAG_PREFIX.length));
    else if (id.startsWith(LEAVE_DRAG_PREFIX)) setActiveLeaveName(id.slice(LEAVE_DRAG_PREFIX.length));
  }

  async function markWfo(name: string, ds: string) {
    const key = `${name}::${ds}`;
    if (pendingWfo.has(key)) return;
    const exists = events.some(ev => ev.type === "WFO" && ev.date === ds && ev.created_by === name);
    if (exists) { toast(`${name} sudah ditandai WFO pada tanggal ${ds}.`, { type: "error" }); return; }
    setPendingWfo(prev => new Set(prev).add(key));
    try {
      await onSaveEvent({
        id: uuid(), title: "Work From Office", date: ds, type: "WFO",
        description: "", created_by: name, client_id: null, status: "Planned",
      });
    } catch {
      // useData's mutation helpers already surface the failure via error toast.
    } finally {
      setPendingWfo(prev => { const next = new Set(prev); next.delete(key); return next; });
    }
  }

  async function markLeave(name: string, ds: string) {
    const key = `${name}::${ds}`;
    if (pendingLeave.has(key)) return;
    const exists = events.some(ev => ev.type === "Cuti" && ev.date === ds && ev.created_by === name);
    if (exists) { toast(`${name} sudah ditandai Cuti pada tanggal ${ds}.`, { type: "error" }); return; }
    setPendingLeave(prev => new Set(prev).add(key));
    try {
      await onSaveEvent({
        id: uuid(), title: "Cuti", date: ds, type: "Cuti",
        description: "", created_by: name, client_id: null, status: "Planned",
      });
    } catch {
      // useData's mutation helpers already surface the failure via error toast.
    } finally {
      setPendingLeave(prev => { const next = new Set(prev); next.delete(key); return next; });
    }
  }

  async function handleDragEnd(e: DragEndEvent) {
    setActiveWfoName(null);
    setActiveLeaveName(null);
    const { over, active } = e;
    if (!over) return;
    const id = String(active.id);
    if (id.startsWith(WFO_DRAG_PREFIX)) await markWfo(id.slice(WFO_DRAG_PREFIX.length), String(over.id));
    else if (id.startsWith(LEAVE_DRAG_PREFIX)) await markLeave(id.slice(LEAVE_DRAG_PREFIX.length), String(over.id));
  }

  const filteredVisits = visits.filter(v => picMatches(v.pic, salesFilter));
  const sortedVisits = [...filteredVisits].sort((a, b) => b.date.localeCompare(a.date));
  const sortedEvents = [...events].sort((a, b) => b.date.localeCompare(a.date));

  // Drag-drop feels like it "snaps back" because the marker only appears once
  // the server round-trip resolves — the drag overlay/source chip resets the
  // instant you drop, leaving a gap before the real pill shows up. Render a
  // dimmed placeholder in the target cell right away (while pendingWfo/Leave
  // still holds the key) so something lands immediately; it's swapped out for
  // the real event pill the moment the save commits (see markWfo/markLeave).
  function pendingEventsFor(pending: Set<string>, type: "WFO" | "Cuti"): CalendarEvent[] {
    return Array.from(pending).map(key => {
      const idx = key.indexOf("::");
      const name = key.slice(0, idx), ds = key.slice(idx + 2);
      return { id: `pending-${type}-${key}`, title: type === "WFO" ? "Work From Office" : "Cuti", date: ds, type, description: "", created_by: name, client_id: null, status: "Planned" as const };
    }).filter(pe => !events.some(ev => ev.type === type && ev.date === pe.date && ev.created_by === pe.created_by));
  }
  const pendingWfoEvents = pendingEventsFor(pendingWfo, "WFO");
  const pendingLeaveEvents = pendingEventsFor(pendingLeave, "Cuti");

  const inWeekFocus = (ds: string) => !!localWeekFocus && ds >= localWeekFocus.start && ds <= localWeekFocus.end;

  const monthDays = Array.from({ length: daysInMonth }, (_, i) => {
    const day = i + 1;
    const ds = `${y}-${String(m + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    const dow = new Date(y, m, day).getDay();
    const dayEvents = [
      ...events.filter(e => e.date === ds),
      ...pendingWfoEvents.filter(e => e.date === ds),
      ...pendingLeaveEvents.filter(e => e.date === ds),
    ];
    return { ds, day, isWeekend: dow === 0 || dow === 6, isWeekFocus: inWeekFocus(ds), holiday: holidayName(ds), dayVisits: filteredVisits.filter(v => v.date === ds), dayEvents };
  });
  // Agenda mode only lists days with something scheduled, Google-Calendar-mobile style —
  // holidays surface even with nothing scheduled so a day off isn't mistaken for
  // an empty one — narrowed further to just the focused week when deep-linked in.
  const agendaDays = monthDays
    .filter(d => d.dayVisits.length || d.dayEvents.length || d.holiday)
    .filter(d => !localWeekFocus || inWeekFocus(d.ds));

  return (
    <section>
      <div className="toolbar">
        <div className="cal-head" style={{ margin: 0 }}>
          <button className="cal-nav-btn" onClick={prevMonth}>‹</button>
          <span className="mtitle">{title}</span>
          <button className="cal-nav-btn" onClick={nextMonth}>›</button>
        </div>
        <div className="cal-toolbar-actions">
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
          <button className="btn btn-ghost btn-sm" onClick={() => exportVisits(visits, id => clients.find(c => c.id === id)?.name || "—")}><Download size={13} /> Export Excel</button>
          {!isViewer && (
            <button className="btn btn-ghost" onClick={() => setShowWfoPanel(s => !s)}>
              {showWfoPanel ? "Tutup Panel WFO" : "🏢 Tandai WFO"}
            </button>
          )}
          {!isViewer && (
            <button className="btn btn-ghost" onClick={() => setShowLeavePanel(s => !s)}>
              {showLeavePanel ? "Tutup Panel Cuti" : "✈️ Tandai Cuti"}
            </button>
          )}
          {!isViewer && <button className="btn btn-ghost" onClick={() => openNewEvent()}>+ Event</button>}
          {!isViewer && <button className="btn add-btn-desktop" onClick={() => openNewVisit()}>+ Jadwalkan Visit</button>}
        </div>
      </div>

      {!isViewer && <button className="fab" onClick={() => openNewVisit()} aria-label="Jadwalkan Visit">+</button>}

      {localWeekFocus && (
        <div className="cal-week-focus-banner">
          <span>📅 Fokus minggu {fmtDate(localWeekFocus.start)} – {fmtDate(localWeekFocus.end)}</span>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => setLocalWeekFocus(null)}>Tampilkan Semua</button>
        </div>
      )}

      {/* Legend */}
      <div className="cal-legend">
        {salesLegend.map(name => {
          const c = colorForSales(name);
          return (
            <span key={name} className="cal-legend-item">
              <span className="cal-dot" style={{ background: c.bg, border: "1px solid rgba(0,0,0,0.15)" }} />
              {name}
            </span>
          );
        })}
        <span className="cal-legend-item"><span className="cal-dot cal-dot-event" />Event / Kegiatan</span>
        <span className="cal-legend-item"><span className="cal-dot cal-dot-wfo" />WFO (tidak visit)</span>
        <span className="cal-legend-item"><span className="cal-dot cal-dot-leave" />Cuti</span>
        <span className="cal-legend-item"><span className="cal-dot cal-dot-holiday" />Libur Nasional / Cuti Bersama</span>
      </div>

      {/* Mobile-only WFO/Cuti forms — plain date + name picker, no drag needed */}
      {showWfoPanel && !isViewer && (
        <div className="wfo-quick-form-wrap">
          <WfoQuickForm team={team} onMark={markWfo} />
        </div>
      )}
      {showLeavePanel && !isViewer && (
        <div className="leave-quick-form-wrap">
          <LeaveQuickForm team={team} onMark={markLeave} />
        </div>
      )}

      <div className="cal-grid-view">
        <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
          {showWfoPanel && !isViewer && (
            <div className="wfo-panel">
              <div className="wfo-panel-hint">🏢 Seret nama ke tanggal kalender untuk menandai hari itu WFO (tidak visit client)</div>
              <div className="wfo-panel-list">
                {team.map(name => <WfoChip key={name} name={name} />)}
              </div>
            </div>
          )}
          {showLeavePanel && !isViewer && (
            <div className="leave-panel">
              <div className="leave-panel-hint">✈️ Seret nama ke tanggal kalender untuk menandai hari itu Cuti</div>
              <div className="leave-panel-list">
                {team.map(name => <LeaveChip key={name} name={name} />)}
              </div>
            </div>
          )}

          <div className="panel">
            <div className="calendar">
              {dows.map((d, i) => <div key={d} className={`dow${i === 0 || i === 6 ? " dow-weekend" : ""}`}>{d}</div>)}
              {Array.from({ length: firstDay }, (_, i) => <div key={`e${i}`} className="cell empty" />)}
              {monthDays.map(({ ds, day, isWeekend, isWeekFocus, holiday, dayVisits, dayEvents }) => (
                <DayCell key={ds} ds={ds} day={day} isToday={ds === today} isWeekend={isWeekend} isWeekFocus={isWeekFocus} holiday={holiday} dayVisits={dayVisits} dayEvents={dayEvents}
                  clientName={clientName} isViewer={isViewer} activeDragKind={activeWfoName ? "wfo" : activeLeaveName ? "leave" : null}
                  onOpenNewVisit={openNewVisit} onEditVisit={openEditVisit} onEditEvent={openEditEvent} />
              ))}
            </div>
          </div>

          <DragOverlay>
            {activeWfoName && (
              <div className="wfo-chip" style={{ opacity: 0.9, cursor: "grabbing" }}>🏢 {activeWfoName}</div>
            )}
            {activeLeaveName && (
              <div className="leave-chip" style={{ opacity: 0.9, cursor: "grabbing" }}>✈️ {activeLeaveName}</div>
            )}
          </DragOverlay>
        </DndContext>
      </div>

      {/* Agenda list — mobile only, replaces the month grid above */}
      <div className="cal-agenda">
        {agendaDays.length === 0 ? (
          <EmptyState icon="🗓️" label="Tidak ada jadwal" sub="Belum ada visit atau event bulan ini" />
        ) : agendaDays.map(({ ds, day, isWeekend, holiday, dayVisits, dayEvents }) => (
          <AgendaDayCard key={ds} ds={ds} day={day} y={y} m={m} today={today} isWeekend={isWeekend} holiday={holiday} dayVisits={dayVisits} dayEvents={dayEvents}
            clientName={clientName} isViewer={isViewer}
            onEditVisit={openEditVisit} onEditEvent={openEditEvent} />
        ))}
      </div>

      {/* Visit table — desktop only; mobile already sees this via the agenda list above */}
      <div className="panel desktop-only">
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12, flexWrap: "wrap" }}>
          <h2 style={{ margin: 0 }}>Jadwal Visit <span className="count">({sortedVisits.length})</span></h2>
        </div>
        <table>
          <thead>
            <tr><th>Tanggal</th><th>Client</th><th>Tujuan / Approach</th><th>Status</th><th>PIC Client</th><th>Sales</th><th></th></tr>
          </thead>
          <tbody>
            {sortedVisits.length ? sortedVisits.map(v => (
              <tr key={v.id}>
                <td>{fmtDate(v.date)}</td>
                <td>{clientName(v.client_id)}</td>
                <td>{v.purpose}<br /><span className="muted" style={{ fontSize: 11 }}>{v.approach}</span></td>
                <td><VisitBadge status={v.status} /></td>
                <td style={{ fontWeight: 600 }}>{v.pic_client || <span className="muted">—</span>}</td>
                <td>{v.pic || <span className="muted">—</span>}</td>
                <td>{!isViewer && <button className="btn btn-ghost btn-sm" onClick={() => openEditVisit(v)}>Edit</button>}</td>
              </tr>
            )) : <tr><td colSpan={7}><EmptyState icon="🚗" label="Belum ada visit" /></td></tr>}
          </tbody>
        </table>
      </div>

      {/* Events table */}
      <div className="panel">
        <h2>Event & Kegiatan <span className="count">({sortedEvents.length})</span></h2>
        <table>
          <thead>
            <tr><th>Tanggal</th><th>Judul</th><th>Tipe</th><th>Peserta</th><th>Keterangan</th><th></th></tr>
          </thead>
          <tbody>
            {sortedEvents.length ? sortedEvents.map(ev => (
              <tr key={ev.id}>
                <td>{fmtDate(ev.date)}</td>
                <td style={{ fontWeight: 600 }}>{ev.title}</td>
                <td><span className="chip">{ev.type}</span></td>
                <td>{ev.created_by || <span className="muted">—</span>}</td>
                <td className="muted" style={{ fontSize: 12 }}>{ev.description || "—"}</td>
                <td>{!isViewer && <button className="btn btn-ghost btn-sm" onClick={() => openEditEvent(ev)}>Edit</button>}</td>
              </tr>
            )) : <tr><td colSpan={6}><EmptyState icon="📅" label="Belum ada event" /></td></tr>}
          </tbody>
        </table>
      </div>

      <VisitModal open={visitModal} visit={editVisit} preClientId={preClientId} preDate={preDate} clients={clients} contacts={contacts} deals={deals} projects={projects} visits={visits} team={team} defaultPic={currentUserName}
        onSave={handleSaveVisit} onDelete={onDeleteVisit} onCreateTask={onCreateTask} onCreateDeal={onCreateDeal} onSaveContact={onSaveContact} onClose={() => setVisitModal(false)} />
      <EventModal open={eventModal} event={editEvent} preDate={preDate} team={team} clients={clients} defaultMember={currentUserName}
        onSave={onSaveEvent} onDelete={onDeleteEvent} onClose={() => setEventModal(false)} />
    </section>
  );
}
