"use client";
import { AppData } from "@/hooks/useData";
import { STAGE_PROB, fmtIDR, fmtDate, todayStr } from "@/lib/utils";
import { VisitBadge } from "./ui/Badge";

interface Props { data: AppData; }

export default function Dashboard({ data }: Props) {
  const { clients, visits, deals, projects, tasks, activities } = data;
  const today = todayStr();
  const [thisYear, thisMonth] = today.slice(0, 7).split("-");
  const monthPrefix = `${thisYear}-${thisMonth}`;

  // Deals
  const openDeals = deals.filter(d => d.stage !== "Won" && d.stage !== "Lost");
  const wonDeals = deals.filter(d => d.stage === "Won");
  const lostDeals = deals.filter(d => d.stage === "Lost");
  const closedTotal = wonDeals.length + lostDeals.length;
  const winRate = closedTotal > 0 ? Math.round((wonDeals.length / closedTotal) * 100) : null;
  const weighted = openDeals.reduce((s, d) => s + (d.value * STAGE_PROB[d.stage] / 100), 0);
  const wonValue = wonDeals.reduce((s, d) => s + d.value, 0);
  const avgDeal = openDeals.length > 0
    ? Math.round(openDeals.reduce((s, d) => s + d.value, 0) / openDeals.length)
    : 0;

  // Deals closing this month
  const closingThisMonth = openDeals.filter(d => d.close_date?.startsWith(monthPrefix));

  // Deals closing in 30 days (for panel)
  const in30 = new Date();
  in30.setDate(in30.getDate() + 30);
  const in30Str = in30.toISOString().slice(0, 10);
  const closingSoon = openDeals
    .filter(d => d.close_date && d.close_date >= today && d.close_date <= in30Str)
    .sort((a, b) => a.close_date.localeCompare(b.close_date));

  // Tasks
  const openTasks = tasks.filter(t => t.status === "Open");
  const overdueTasks = openTasks.filter(t => t.due_date && t.due_date < today);

  // Visits
  const visitsThisMonth = visits.filter(v => v.date?.startsWith(monthPrefix));
  const upcoming = visits
    .filter(v => v.date >= today && v.status !== "Done" && v.status !== "No-go")
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 6);
  const followups = visits.filter(v => v.status === "Follow-up");

  // Activities this month
  const activitiesThisMonth = activities.filter(a =>
    (a.created_at || "").startsWith(monthPrefix)
  );

  const upcomingTasks = openTasks
    .filter(t => t.due_date)
    .sort((a, b) => a.due_date.localeCompare(b.due_date))
    .slice(0, 6);

  const clientName = (id: string) => clients.find(c => c.id === id)?.name || "—";
  const dealName = (id: string | null) => id ? (deals.find(d => d.id === id)?.name || "—") : "—";

  const kpis = [
    { label: "Pipeline aktif", num: openDeals.length, sub: "deal terbuka" },
    { label: "Weighted value", num: fmtIDR(Math.round(weighted)), sub: "prob. tertimbang" },
    { label: "Closed Won", num: fmtIDR(wonValue), sub: `${wonDeals.length} deal` },
    { label: "Win Rate", num: winRate !== null ? `${winRate}%` : "—", sub: closedTotal > 0 ? `dari ${closedTotal} closed` : "belum ada closed deal" },
    { label: "Avg deal size", num: fmtIDR(avgDeal), sub: "rata-rata pipeline" },
    { label: "Closing bulan ini", num: closingThisMonth.length, sub: fmtIDR(closingThisMonth.reduce((s, d) => s + d.value, 0)) },
    { label: "Visit bulan ini", num: visitsThisMonth.length, sub: `${visitsThisMonth.filter(v => v.status === "Done").length} selesai` },
    { label: "Aktivitas bulan ini", num: activitiesThisMonth.length, sub: "log aktivitas" },
    { label: "Task open", num: openTasks.length, sub: overdueTasks.length > 0 ? `${overdueTasks.length} overdue` : "semua on track", warn: overdueTasks.length > 0 },
  ];

  return (
    <section>
      <div className="kpis">
        {kpis.map((k, i) => (
          <div key={i} className={`kpi${k.warn ? " kpi-warn" : ""}`}>
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

      <div className="grid2">
        <div className="panel">
          <h2>Deal closing dalam 30 hari <span className="count">({closingSoon.length})</span></h2>
          {closingSoon.length ? closingSoon.map(d => {
            const daysLeft = Math.ceil((new Date(d.close_date).getTime() - new Date(today).getTime()) / 86400000);
            const client = clientName(d.client_id);
            return (
              <div key={d.id} className="timeline-item">
                <div className="ti-date">{fmtDate(d.close_date)} · <span style={{ color: daysLeft <= 7 ? "var(--danger)" : "var(--gold)" }}>{daysLeft}h lagi</span></div>
                <div className="ti-body">
                  <span style={{ fontWeight: 700 }}>{d.name}</span>
                  <span className="muted">· {client}</span>
                  <span style={{ marginLeft: "auto", color: "var(--brand)", fontWeight: 700 }}>{fmtIDR(d.value)}</span>
                </div>
              </div>
            );
          }) : <div className="empty-state">Tidak ada deal jatuh tempo dalam 30 hari.</div>}
        </div>
        <div className="panel">
          <h2>Task mendatang <span className="count">({upcomingTasks.length})</span>{overdueTasks.length > 0 && <span className="overdue-chip">{overdueTasks.length} overdue</span>}</h2>
          {!upcomingTasks.length ? (
            <div className="empty-state">Tidak ada task terjadwal.</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
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
      </div>
    </section>
  );
}
