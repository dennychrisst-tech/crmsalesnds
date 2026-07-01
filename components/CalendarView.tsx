"use client";
import { useState } from "react";
import { DndContext, DragEndEvent, DragOverlay, DragStartEvent, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { useDroppable, useDraggable } from "@dnd-kit/core";
import { AppData } from "@/hooks/useData";
import { Visit, CalendarEvent, Task, Deal } from "@/types";
import { fmtDate, todayStr, picList, picMatches } from "@/lib/utils";
import { VisitBadge } from "./ui/Badge";
import VisitModal from "./VisitModal";
import EventModal from "./EventModal";
import { exportVisits } from "@/lib/export";
import { v4 as uuid } from "uuid";

const WFO_DRAG_PREFIX = "wfo:";

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
}

const SALES_COLOR_PALETTE = [
  { bg: "#2563EB", fg: "#FFFFFF" },
  { bg: "#16A34A", fg: "#FFFFFF" },
  { bg: "#F59E0B", fg: "#1F2937" },
  { bg: "#DB2777", fg: "#FFFFFF" },
  { bg: "#7C3AED", fg: "#FFFFFF" },
  { bg: "#0D9488", fg: "#FFFFFF" },
  { bg: "#E11D48", fg: "#FFFFFF" },
  { bg: "#EA580C", fg: "#FFFFFF" },
  { bg: "#0891B2", fg: "#FFFFFF" },
  { bg: "#65A30D", fg: "#FFFFFF" },
  { bg: "#9333EA", fg: "#FFFFFF" },
  { bg: "#CA8A04", fg: "#1F2937" },
];

function colorForSales(name: string) {
  const key = name || "—";
  let hash = 0;
  for (let i = 0; i < key.length; i++) hash = (hash * 31 + key.charCodeAt(i)) >>> 0;
  return SALES_COLOR_PALETTE[hash % SALES_COLOR_PALETTE.length];
}

function WfoChip({ name }: { name: string }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: `${WFO_DRAG_PREFIX}${name}` });
  const style = transform ? { transform: `translate3d(${transform.x}px,${transform.y}px,0)`, opacity: isDragging ? 0.4 : 1 } : {};
  return (
    <div ref={setNodeRef} {...listeners} {...attributes} style={style} className="wfo-chip">
      🏠 {name}
    </div>
  );
}

function DayCell({
  ds, day, isToday, dayVisits, dayEvents, clientName, isViewer, onOpenNewVisit, onEditVisit, onEditEvent,
}: {
  ds: string; day: number; isToday: boolean; dayVisits: Visit[]; dayEvents: CalendarEvent[];
  clientName: (id: string) => string; isViewer?: boolean;
  onOpenNewVisit: (ds: string) => void; onEditVisit: (v: Visit) => void; onEditEvent: (e: CalendarEvent) => void;
}) {
  const { isOver, setNodeRef } = useDroppable({ id: ds });
  return (
    <div ref={setNodeRef} className={`cell${isToday ? " today" : ""}${isOver ? " wfo-drop-target" : ""}`}
      onDoubleClick={() => { if (!isViewer) onOpenNewVisit(ds); }}
      title={isViewer ? "" : "Double-klik untuk tambah visit, atau seret WFO ke sini"}>
      <div className="dnum">{day}</div>
      {dayVisits.map(v => {
        const names = picList(v.pic);
        const colors = (names.length ? names : ["—"]).map(colorForSales);
        const background = colors.length > 1
          ? `linear-gradient(90deg, ${colors[0].bg} 50%, ${colors[1].bg} 50%)`
          : colors[0].bg;
        return (
          <div key={v.id} className="vpill"
            style={{ background, color: colors[0].fg, opacity: v.status === "Done" ? 0.55 : 1, textDecoration: v.status === "Done" ? "line-through" : "none" }}
            onClick={e => { e.stopPropagation(); if (!isViewer) onEditVisit(v); }}
            title={`${clientName(v.client_id)}: ${v.purpose} (${names.join(" & ") || "Tanpa sales"})`}>
            {clientName(v.client_id)}
          </div>
        );
      })}
      {dayEvents.map(ev => {
        const isWfo = ev.type === "WFO";
        return (
          <div key={ev.id} className={`vpill ${isWfo ? "vpill-wfo" : "vpill-event"}`}
            style={isWfo ? { cursor: "default" } : undefined}
            onClick={isWfo ? undefined : e => { e.stopPropagation(); if (!isViewer) onEditEvent(ev); }}
            title={isWfo ? `WFO: ${ev.created_by || "—"}` : ev.title}>
            {isWfo ? `🏠 ${ev.created_by || "WFO"}` : ev.title}
          </div>
        );
      })}
    </div>
  );
}

export default function CalendarView({ data, currentUserName, isViewer, onSaveVisit, onDeleteVisit, onSaveEvent, onDeleteEvent, onCreateTask, onCreateDeal }: Props) {
  const { clients, contacts, visits, events, deals, profiles } = data;
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
  function openNewEvent(dateStr?: string) { setEditEvent(null); setPreDate(dateStr); setEventModal(true); }
  function openEditEvent(e: CalendarEvent) { setEditEvent(e); setPreDate(undefined); setEventModal(true); }

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  function handleDragStart(e: DragStartEvent) {
    const id = String(e.active.id);
    if (id.startsWith(WFO_DRAG_PREFIX)) setActiveWfoName(id.slice(WFO_DRAG_PREFIX.length));
  }

  async function handleDragEnd(e: DragEndEvent) {
    setActiveWfoName(null);
    const { over, active } = e;
    if (!over) return;
    const id = String(active.id);
    if (!id.startsWith(WFO_DRAG_PREFIX)) return;
    const name = id.slice(WFO_DRAG_PREFIX.length);
    const ds = String(over.id);
    const key = `${name}::${ds}`;
    if (pendingWfo.has(key)) return;
    const exists = events.some(ev => ev.type === "WFO" && ev.date === ds && ev.created_by === name);
    if (exists) { alert(`${name} sudah ditandai WFO pada tanggal ${ds}.`); return; }
    setPendingWfo(prev => new Set(prev).add(key));
    try {
      await onSaveEvent({
        id: uuid(), title: "Work From Office", date: ds, type: "WFO",
        description: "", created_by: name, client_id: null,
      });
    } catch (err) {
      alert(err instanceof Error ? err.message : "Gagal menandai WFO.");
    } finally {
      setPendingWfo(prev => { const next = new Set(prev); next.delete(key); return next; });
    }
  }

  const sortedVisits = [...visits]
    .filter(v => picMatches(v.pic, salesFilter))
    .sort((a, b) => b.date.localeCompare(a.date));
  const sortedEvents = [...events].sort((a, b) => b.date.localeCompare(a.date));

  return (
    <section>
      <div className="toolbar">
        <div className="cal-head" style={{ margin: 0 }}>
          <button className="cal-nav-btn" onClick={prevMonth}>‹</button>
          <span className="mtitle">{title}</span>
          <button className="cal-nav-btn" onClick={nextMonth}>›</button>
        </div>
        <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
          <button className="btn btn-ghost btn-sm" onClick={() => exportVisits(visits, id => clients.find(c => c.id === id)?.name || "—")}>↓ Export CSV</button>
          {!isViewer && (
            <button className="btn btn-ghost" onClick={() => setShowWfoPanel(s => !s)}>
              {showWfoPanel ? "Tutup Panel WFO" : "🏠 Tandai WFO"}
            </button>
          )}
          {!isViewer && <button className="btn btn-ghost" onClick={() => openNewEvent()}>+ Event</button>}
          {!isViewer && <button className="btn" onClick={() => openNewVisit()}>+ Jadwalkan Visit</button>}
        </div>
      </div>

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
      </div>

      <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        {showWfoPanel && !isViewer && (
          <div className="wfo-panel">
            <div className="wfo-panel-hint">🏠 Seret nama ke tanggal kalender untuk menandai hari itu WFO (tidak visit client)</div>
            <div className="wfo-panel-list">
              {team.map(name => <WfoChip key={name} name={name} />)}
            </div>
          </div>
        )}

        <div className="panel">
          <div className="calendar">
            {dows.map(d => <div key={d} className="dow">{d}</div>)}
            {Array.from({ length: firstDay }, (_, i) => <div key={`e${i}`} className="cell empty" />)}
            {Array.from({ length: daysInMonth }, (_, i) => {
              const day = i + 1;
              const ds = `${y}-${String(m + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
              const dayVisits = visits.filter(v => v.date === ds);
              const dayEvents = events.filter(e => e.date === ds);
              return (
                <DayCell key={ds} ds={ds} day={day} isToday={ds === today} dayVisits={dayVisits} dayEvents={dayEvents}
                  clientName={clientName} isViewer={isViewer}
                  onOpenNewVisit={openNewVisit} onEditVisit={openEditVisit} onEditEvent={openEditEvent} />
              );
            })}
          </div>
        </div>

        <DragOverlay>
          {activeWfoName && (
            <div className="wfo-chip" style={{ opacity: 0.9, cursor: "grabbing" }}>🏠 {activeWfoName}</div>
          )}
        </DragOverlay>
      </DndContext>

      {/* Visit table */}
      <div className="panel">
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12, flexWrap: "wrap" }}>
          <h2 style={{ margin: 0 }}>Jadwal Visit <span className="count">({sortedVisits.length})</span></h2>
          <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 13, color: "var(--ink-soft)" }}>Sales:</span>
            <select
              value={salesFilter}
              onChange={e => setSalesFilter(e.target.value)}
              style={{ fontSize: 13, padding: "4px 10px", borderRadius: 6, border: "1px solid var(--line)", background: "var(--card)", color: "var(--ink)", cursor: "pointer" }}
            >
              <option value="all">Semua</option>
              {team.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
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
            )) : <tr><td colSpan={7} className="empty-state">Belum ada visit.</td></tr>}
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
            )) : <tr><td colSpan={6} className="empty-state">Belum ada event.</td></tr>}
          </tbody>
        </table>
      </div>

      <VisitModal open={visitModal} visit={editVisit} preClientId={preClientId} preDate={preDate} clients={clients} contacts={contacts} deals={deals} team={team} defaultPic={currentUserName}
        onSave={handleSaveVisit} onDelete={onDeleteVisit} onCreateTask={onCreateTask} onCreateDeal={onCreateDeal} onClose={() => setVisitModal(false)} />
      <EventModal open={eventModal} event={editEvent} preDate={preDate} team={team} clients={clients} defaultMember={currentUserName}
        onSave={onSaveEvent} onDelete={onDeleteEvent} onClose={() => setEventModal(false)} />
    </section>
  );
}
