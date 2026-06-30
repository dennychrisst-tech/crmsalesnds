"use client";
import { useState } from "react";
import { AppData } from "@/hooks/useData";
import { Visit, CalendarEvent } from "@/types";
import { fmtDate, todayStr, visitStatusClass } from "@/lib/utils";
import { VisitBadge } from "./ui/Badge";
import VisitModal from "./VisitModal";
import EventModal from "./EventModal";

interface Props {
  data: AppData;
  onSaveVisit: (v: Visit) => Promise<void>;
  onDeleteVisit: (id: string) => Promise<void>;
  onSaveEvent: (e: CalendarEvent) => Promise<void>;
  onDeleteEvent: (id: string) => Promise<void>;
}

export default function CalendarView({ data, onSaveVisit, onDeleteVisit, onSaveEvent, onDeleteEvent }: Props) {
  const { clients, visits, events } = data;
  const [cursor, setCursor] = useState(() => { const d = new Date(); d.setDate(1); return d; });
  const [visitModal, setVisitModal] = useState(false);
  const [eventModal, setEventModal] = useState(false);
  const [editVisit, setEditVisit] = useState<Visit | null>(null);
  const [editEvent, setEditEvent] = useState<CalendarEvent | null>(null);
  const [preClientId, setPreClientId] = useState<string | undefined>();
  const [preDate, setPreDate] = useState<string | undefined>();

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

  const sortedVisits = [...visits].sort((a, b) => b.date.localeCompare(a.date));
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
          <button className="btn btn-ghost" onClick={() => openNewEvent()}>+ Event</button>
          <button className="btn" onClick={() => openNewVisit()}>+ Jadwalkan Visit</button>
        </div>
      </div>

      {/* Legend */}
      <div className="cal-legend">
        <span className="cal-legend-item"><span className="cal-dot cal-dot-visit" />Visit Client</span>
        <span className="cal-legend-item"><span className="cal-dot cal-dot-event" />Event / Kegiatan</span>
      </div>

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
              <div key={ds} className={`cell${ds === today ? " today" : ""}`}
                onDoubleClick={() => openNewVisit(ds)} title="Double-klik untuk tambah visit">
                <div className="dnum">{day}</div>
                {dayVisits.map(v => (
                  <div key={v.id} className={`vpill${v.status === "Done" ? " done" : ""}`}
                    onClick={e => { e.stopPropagation(); openEditVisit(v); }}
                    title={`${clientName(v.client_id)}: ${v.purpose}`}>
                    {clientName(v.client_id)}
                  </div>
                ))}
                {dayEvents.map(ev => (
                  <div key={ev.id} className="vpill vpill-event"
                    onClick={e => { e.stopPropagation(); openEditEvent(ev); }}
                    title={ev.title}>
                    {ev.title}
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      </div>

      {/* Visit table */}
      <div className="panel">
        <h2>Jadwal Visit <span className="count">({sortedVisits.length})</span></h2>
        <table>
          <thead>
            <tr><th>Tanggal</th><th>Client</th><th>Tujuan / Approach</th><th>Status</th><th>PIC Client</th><th>PIC NDS</th><th></th></tr>
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
                <td><button className="btn btn-ghost btn-sm" onClick={() => openEditVisit(v)}>Edit</button></td>
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
                <td><button className="btn btn-ghost btn-sm" onClick={() => openEditEvent(ev)}>Edit</button></td>
              </tr>
            )) : <tr><td colSpan={6} className="empty-state">Belum ada event.</td></tr>}
          </tbody>
        </table>
      </div>

      <VisitModal open={visitModal} visit={editVisit} preClientId={preClientId} clients={clients}
        onSave={onSaveVisit} onDelete={onDeleteVisit} onClose={() => setVisitModal(false)} />
      <EventModal open={eventModal} event={editEvent} preDate={preDate}
        onSave={onSaveEvent} onDelete={onDeleteEvent} onClose={() => setEventModal(false)} />
    </section>
  );
}
