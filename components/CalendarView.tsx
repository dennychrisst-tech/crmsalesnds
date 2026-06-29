"use client";
import { useState } from "react";
import { AppData } from "@/hooks/useData";
import { Visit } from "@/types";
import { fmtDate, todayStr, visitStatusClass } from "@/lib/utils";
import { VisitBadge } from "./ui/Badge";
import VisitModal from "./VisitModal";

interface Props { data: AppData; onSaveVisit: (v: Visit) => Promise<void>; onDeleteVisit: (id: string) => Promise<void>; }

export default function CalendarView({ data, onSaveVisit, onDeleteVisit }: Props) {
  const { clients, visits } = data;
  const [cursor, setCursor] = useState(() => { const d = new Date(); d.setDate(1); return d; });
  const [modalOpen, setModalOpen] = useState(false);
  const [editVisit, setEditVisit] = useState<Visit | null>(null);
  const [preClientId, setPreClientId] = useState<string | undefined>();

  const clientName = (id: string) => clients.find(c => c.id === id)?.name || "—";
  const y = cursor.getFullYear(), m = cursor.getMonth();
  const title = cursor.toLocaleDateString("id-ID", { month: "long", year: "numeric" });
  const firstDay = new Date(y, m, 1).getDay();
  const daysInMonth = new Date(y, m + 1, 0).getDate();
  const today = todayStr();
  const dows = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];

  function prevMonth() { setCursor(d => { const n = new Date(d); n.setMonth(n.getMonth() - 1); return n; }); }
  function nextMonth() { setCursor(d => { const n = new Date(d); n.setMonth(n.getMonth() + 1); return n; }); }

  function openNew(preClient?: string) { setEditVisit(null); setPreClientId(preClient); setModalOpen(true); }
  function openEdit(v: Visit) { setEditVisit(v); setPreClientId(undefined); setModalOpen(true); }

  const sorted = [...visits].sort((a, b) => b.date.localeCompare(a.date));

  return (
    <section>
      <div className="toolbar">
        <div className="cal-head" style={{ margin: 0 }}>
          <button className="cal-nav-btn" onClick={prevMonth}>‹</button>
          <span className="mtitle">{title}</span>
          <button className="cal-nav-btn" onClick={nextMonth}>›</button>
        </div>
        <button className="btn" style={{ marginLeft: "auto" }} onClick={() => openNew()}>+ Jadwalkan Visit</button>
      </div>
      <div className="panel">
        <div className="calendar">
          {dows.map(d => <div key={d} className="dow">{d}</div>)}
          {Array.from({ length: firstDay }, (_, i) => <div key={`e${i}`} className="cell empty" />)}
          {Array.from({ length: daysInMonth }, (_, i) => {
            const day = i + 1;
            const ds = `${y}-${String(m + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
            const dayVisits = visits.filter(v => v.date === ds);
            return (
              <div key={ds} className={`cell${ds === today ? " today" : ""}`}>
                <div className="dnum">{day}</div>
                {dayVisits.map(v => (
                  <div key={v.id} className={`vpill${v.status === "Done" ? " done" : ""}`}
                    onClick={() => openEdit(v)} title={`${clientName(v.client_id)}: ${v.purpose}`}>
                    {clientName(v.client_id)}
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      </div>
      <div className="panel">
        <h2>Semua visit <span className="count">({sorted.length})</span></h2>
        <table>
          <thead><tr><th>Tanggal</th><th>Client</th><th>Tujuan / Approach</th><th>Status</th><th>PIC</th><th></th></tr></thead>
          <tbody>
            {sorted.length ? sorted.map(v => (
              <tr key={v.id}>
                <td>{fmtDate(v.date)}</td>
                <td>{clientName(v.client_id)}</td>
                <td>{v.purpose}<br /><span className="muted" style={{ fontSize: 11 }}>{v.approach}</span></td>
                <td><VisitBadge status={v.status} /></td>
                <td>{v.pic || "-"}</td>
                <td><button className="btn btn-ghost btn-sm" onClick={() => openEdit(v)}>Edit</button></td>
              </tr>
            )) : <tr><td colSpan={6} className="empty-state">Belum ada visit.</td></tr>}
          </tbody>
        </table>
      </div>
      <VisitModal open={modalOpen} visit={editVisit} preClientId={preClientId} clients={clients}
        onSave={onSaveVisit} onDelete={onDeleteVisit} onClose={() => setModalOpen(false)} />
    </section>
  );
}
