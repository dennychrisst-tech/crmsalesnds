"use client";
import { AppData } from "@/hooks/useData";
import { STAGE_PROB, fmtIDR, fmtDate, todayStr } from "@/lib/utils";
import { VisitBadge } from "./ui/Badge";

interface Props { data: AppData; }

export default function Dashboard({ data }: Props) {
  const { clients, visits, deals, projects, tasks } = data;
  const openDeals = deals.filter(d => d.stage !== "Won" && d.stage !== "Lost");
  const weighted = openDeals.reduce((s, d) => s + (d.value * STAGE_PROB[d.stage] / 100), 0);
  const won = deals.filter(d => d.stage === "Won").reduce((s, d) => s + d.value, 0);
  const openTasks = tasks.filter(t => t.status === "Open");
  const overdueTasks = openTasks.filter(t => t.due_date && t.due_date < todayStr());

  const kpis = [
    { label: "Pipeline aktif", num: openDeals.length, sub: "deal terbuka" },
    { label: "Weighted value", num: fmtIDR(Math.round(weighted)), sub: "prob. tertimbang" },
    { label: "Closed Won", num: fmtIDR(won), sub: `${deals.filter(d => d.stage === "Won").length} deal` },
    { label: "Client", num: clients.length, sub: "total akun" },
    { label: "Project berjalan", num: projects.filter(p => p.status === "In Progress").length, sub: "in progress" },
    { label: "Task open", num: openTasks.length, sub: overdueTasks.length > 0 ? `${overdueTasks.length} overdue` : "semua on track" },
  ];

  const clientName = (id: string) => clients.find(c => c.id === id)?.name || "—";
  const dealName = (id: string | null) => id ? (deals.find(d => d.id === id)?.name || "—") : "—";
  const today = todayStr();
  const upcoming = visits
    .filter(v => v.date >= today && v.status !== "Done" && v.status !== "No-go")
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 6);
  const followups = visits.filter(v => v.status === "Follow-up");

  const upcomingTasks = openTasks
    .filter(t => t.due_date)
    .sort((a, b) => a.due_date.localeCompare(b.due_date))
    .slice(0, 6);

  return (
    <section>
      <div className="kpis">
        {kpis.map((k, i) => (
          <div key={i} className={`kpi${i === 5 && overdueTasks.length > 0 ? " kpi-warn" : ""}`}>
            <div className="kpi-label">{k.label}</div>
            <div className="kpi-num">{k.num}</div>
            <div className="kpi-sub">{k.sub}</div>
          </div>
        ))}
      </div>
      <div className="grid2">
        <div className="panel">
          <h2>Visit mendatang <span className="count">({upcoming.length})</span></h2>
          {upcoming.length ? upcoming.map(v => (
            <div key={v.id} className="timeline-item">
              <div className="ti-date">{fmtDate(v.date)} · {clientName(v.client_id)}</div>
              <div className="ti-body">{v.purpose} <VisitBadge status={v.status} /></div>
            </div>
          )) : <div className="empty-state">Belum ada visit terjadwal.</div>}
        </div>
        <div className="panel">
          <h2>Butuh tindak lanjut</h2>
          {followups.length ? followups.map(v => (
            <div key={v.id} className="timeline-item">
              <div className="ti-date">{clientName(v.client_id)} · {fmtDate(v.date)}</div>
              <div className="ti-body">{v.summary || v.purpose}</div>
            </div>
          )) : <div className="empty-state">Tidak ada follow-up tertunda.</div>}
        </div>
      </div>
      <div className="panel">
        <h2>Task mendatang <span className="count">({upcomingTasks.length})</span>{overdueTasks.length > 0 && <span className="overdue-chip">{overdueTasks.length} overdue</span>}</h2>
        {!upcomingTasks.length ? (
          <div className="empty-state">Tidak ada task terjadwal.</div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(240px,1fr))", gap: 10 }}>
            {upcomingTasks.map(t => {
              const isOverdue = t.due_date < today;
              return (
                <div key={t.id} className={`task-item${isOverdue ? " task-item-overdue" : ""}`}>
                  <div className="task-item-title">{t.title}</div>
                  <div className="task-item-meta">
                    {fmtDate(t.due_date)} · {t.assigned_to || "—"}
                    {t.client_id && ` · ${clientName(t.client_id)}`}
                  </div>
                  {t.deal_id && <div className="task-item-meta">{dealName(t.deal_id)}</div>}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
