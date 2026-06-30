"use client";
import { useState, useMemo } from "react";
import { AppData } from "@/hooks/useData";
import { ActiveView } from "@/types";
import { STAGES, STAGE_PROB, fmtIDR, fmtDate, todayStr } from "@/lib/utils";
import { VisitBadge } from "./ui/Badge";

interface Props {
  data: AppData;
  onNavigate: (view: ActiveView) => void;
}

type Period = "daily" | "weekly" | "monthly";

function SectionHeader({ title, action, onClick }: { title: string; action?: string; onClick?: () => void }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
      <h2 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: "var(--ink)" }}>{title}</h2>
      {action && (
        <button onClick={onClick} style={{
          background: "none", border: "none", cursor: "pointer", fontSize: 12,
          color: "var(--brand)", fontWeight: 600, padding: "2px 6px",
        }}>{action} →</button>
      )}
    </div>
  );
}

function FilterBar({
  period, setPeriod, salesList, salesFilter, setSalesFilter,
}: {
  period: Period; setPeriod: (p: Period) => void;
  salesList: string[]; salesFilter: string; setSalesFilter: (s: string) => void;
}) {
  const btnBase: React.CSSProperties = {
    padding: "6px 14px", borderRadius: 6, fontSize: 12, fontWeight: 700,
    cursor: "pointer", border: "1px solid var(--line)", transition: "all .15s",
  };
  const active: React.CSSProperties = { background: "var(--ink)", color: "#fff", border: "1px solid var(--ink)" };
  const inactive: React.CSSProperties = { background: "var(--paper)", color: "var(--ink-soft)" };

  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap",
      background: "var(--card)", border: "1px solid var(--line)", borderRadius: 10,
      padding: "12px 16px", marginBottom: 16,
    }}>
      <span style={{ fontSize: 12, fontWeight: 700, color: "var(--ink-soft)", marginRight: 4 }}>Periode:</span>
      {(["daily", "weekly", "monthly"] as Period[]).map(p => (
        <button key={p} style={{ ...btnBase, ...(period === p ? active : inactive) }}
          onClick={() => setPeriod(p)}>
          {p === "daily" ? "Hari Ini" : p === "weekly" ? "Minggu Ini" : "Bulan Ini"}
        </button>
      ))}
      <div style={{ width: 1, height: 20, background: "var(--line)", margin: "0 4px" }} />
      <span style={{ fontSize: 12, fontWeight: 700, color: "var(--ink-soft)", marginRight: 4 }}>Sales:</span>
      <select
        value={salesFilter}
        onChange={e => setSalesFilter(e.target.value)}
        style={{
          padding: "5px 10px", borderRadius: 6, fontSize: 12, fontWeight: 600,
          border: "1px solid var(--line)", background: salesFilter !== "all" ? "var(--ink)" : "var(--paper)",
          color: salesFilter !== "all" ? "#fff" : "var(--ink)", cursor: "pointer",
        }}
      >
        <option value="all">Semua Sales</option>
        {salesList.map(s => <option key={s} value={s}>{s}</option>)}
      </select>
    </div>
  );
}

export default function Dashboard({ data, onNavigate }: Props) {
  const { clients, visits, deals, projects, tasks, activities, profiles } = data;
  const today = todayStr();

  const [period, setPeriod] = useState<Period>("monthly");
  const [salesFilter, setSalesFilter] = useState("all");

  const salesList = profiles
    .filter(p => !["super_admin", "admin", "viewer"].includes(p.role))
    .map(p => p.name)
    .filter(Boolean) as string[];

  // ── Period range ────────────────────────────────────────────────────────
  const { periodStart, periodEnd, periodLabel } = useMemo(() => {
    const d = new Date(today);
    if (period === "daily") {
      return { periodStart: today, periodEnd: today, periodLabel: "Hari Ini" };
    }
    if (period === "weekly") {
      const dow = d.getDay(); // 0=Sun
      const mon = new Date(d); mon.setDate(d.getDate() - ((dow + 6) % 7));
      const sun = new Date(mon); sun.setDate(mon.getDate() + 6);
      return {
        periodStart: mon.toISOString().slice(0, 10),
        periodEnd: sun.toISOString().slice(0, 10),
        periodLabel: "Minggu Ini",
      };
    }
    // monthly
    const [y, m] = today.slice(0, 7).split("-");
    const lastDay = new Date(Number(y), Number(m), 0).getDate();
    return {
      periodStart: `${y}-${m}-01`,
      periodEnd: `${y}-${m}-${String(lastDay).padStart(2, "0")}`,
      periodLabel: "Bulan Ini",
    };
  }, [period, today]);

  const inPeriod = (dateStr: string) => dateStr >= periodStart && dateStr <= periodEnd;
  const bySales = (owner: string) => salesFilter === "all" || owner === salesFilter;

  // ── Filtered data ──────────────────────────────────────────────────────
  const filteredDeals = deals.filter(d => bySales(d.owner));
  const filteredVisits = visits.filter(v => bySales(v.pic));
  const filteredTasks = tasks.filter(t => bySales(t.assigned_to));

  // Deals
  const openDeals   = filteredDeals.filter(d => d.stage !== "Won" && d.stage !== "Lost");
  const wonDeals    = filteredDeals.filter(d => d.stage === "Won");
  const lostDeals   = filteredDeals.filter(d => d.stage === "Lost");
  const closedTotal = wonDeals.length + lostDeals.length;
  const winRate     = closedTotal > 0 ? Math.round((wonDeals.length / closedTotal) * 100) : null;
  const weighted    = openDeals.reduce((s, d) => s + (d.value * STAGE_PROB[d.stage] / 100), 0);
  const wonValue    = wonDeals.reduce((s, d) => s + d.value, 0);
  const pipelineValue = openDeals.reduce((s, d) => s + d.value, 0);

  const closingInPeriod = openDeals.filter(d => d.close_date && inPeriod(d.close_date));

  const in30 = new Date(today); in30.setDate(in30.getDate() + 30);
  const in30Str = in30.toISOString().slice(0, 10);
  const closingSoon = openDeals
    .filter(d => d.close_date && d.close_date >= today && d.close_date <= in30Str)
    .sort((a, b) => (a.close_date || "").localeCompare(b.close_date || ""));

  // Pipeline per stage
  const stageData = STAGES.filter(s => s !== "Won").map(stage => {
    const sd = openDeals.filter(d => d.stage === stage);
    return { stage, count: sd.length, value: sd.reduce((s, d) => s + d.value, 0) };
  });
  const maxStageValue = Math.max(...stageData.map(s => s.value), 1);

  // Visits
  const periodVisits = filteredVisits.filter(v => v.date && inPeriod(v.date));
  const upcoming = filteredVisits
    .filter(v => v.date >= today && v.status !== "Done" && v.status !== "No-go")
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 5);
  const followups = filteredVisits.filter(v => v.status === "Follow-up").slice(0, 5);

  // Tasks
  const openTasks    = filteredTasks.filter(t => t.status === "Open");
  const overdueTasks = openTasks.filter(t => t.due_date && t.due_date < today);
  const upcomingTasks = openTasks
    .filter(t => t.due_date)
    .sort((a, b) => a.due_date.localeCompare(b.due_date))
    .slice(0, 5);

  // Activities
  const periodActivities = activities
    .filter(a => inPeriod((a.created_at || "").slice(0, 10)) && bySales(a.created_by));

  // Projects (not filtered by sales — shared resource)
  const activeProjects = projects.filter(p => p.status === "In Progress" || p.status === "Initiation");

  // Top clients
  const clientDealValue: Record<string, number> = {};
  openDeals.forEach(d => { clientDealValue[d.client_id] = (clientDealValue[d.client_id] || 0) + d.value; });
  const topClients = Object.entries(clientDealValue)
    .sort((a, b) => b[1] - a[1]).slice(0, 5)
    .map(([id, val]) => ({ id, name: clients.find(c => c.id === id)?.name || "—", value: val }));

  // Team activity for period
  const teamActivity: Record<string, { visits: number; tasks: number; activities: number }> = {};
  salesList.forEach(name => {
    teamActivity[name] = {
      visits: filteredVisits.filter(v => v.pic === name && v.date && inPeriod(v.date)).length,
      tasks: tasks.filter(t => t.assigned_to === name && t.status === "Open").length,
      activities: activities.filter(a => a.created_by === name && inPeriod((a.created_at || "").slice(0, 10))).length,
    };
  });

  const clientName = (id: string) => clients.find(c => c.id === id)?.name || "—";

  const STAGE_COLOR: Record<string, string> = {
    Lead: "#94a3b8", Discovery: "#60a5fa", Proposal: "#f59e0b",
    Negotiation: "#f97316", Won: "#16a34a", Lost: "#ef4444",
  };

  const kpis = [
    {
      label: "Pipeline Aktif", num: openDeals.length, sub: fmtIDR(pipelineValue),
      color: "var(--brand)", view: "pipeline" as ActiveView,
    },
    {
      label: "Weighted Value", num: fmtIDR(Math.round(weighted)), sub: "prob. tertimbang",
      color: "var(--brand)", view: "pipeline" as ActiveView,
    },
    {
      label: "Closed Won", num: fmtIDR(wonValue), sub: `${wonDeals.length} deal`,
      color: "#16a34a", view: "pipeline" as ActiveView,
    },
    {
      label: "Win Rate", num: winRate !== null ? `${winRate}%` : "—",
      sub: closedTotal > 0 ? `dari ${closedTotal} closed` : "belum ada closed",
      color: winRate !== null && winRate >= 50 ? "#16a34a" : "var(--gold)", view: "pipeline" as ActiveView,
    },
    {
      label: `Closing ${periodLabel}`, num: closingInPeriod.length,
      sub: fmtIDR(closingInPeriod.reduce((s, d) => s + d.value, 0)),
      color: closingInPeriod.length > 0 ? "var(--gold)" : "var(--ink-soft)", view: "pipeline" as ActiveView,
    },
    {
      label: `Visit ${periodLabel}`, num: periodVisits.length,
      sub: `${periodVisits.filter(v => v.status === "Done").length} selesai`,
      color: "var(--brand)", view: "calendar" as ActiveView,
    },
    {
      label: "Follow-up Pending", num: followups.length,
      sub: "butuh tindak lanjut",
      color: followups.length > 0 ? "var(--danger)" : "#16a34a", view: "calendar" as ActiveView,
    },
    {
      label: `Aktivitas ${periodLabel}`, num: periodActivities.length,
      sub: "log aktivitas",
      color: "var(--brand)", view: "clients" as ActiveView,
    },
    {
      label: "Task Open", num: openTasks.length,
      sub: overdueTasks.length > 0 ? `⚠ ${overdueTasks.length} overdue` : "semua on track",
      color: overdueTasks.length > 0 ? "var(--danger)" : "#16a34a", view: "tasks" as ActiveView,
      warn: overdueTasks.length > 0,
    },
  ];

  return (
    <section>
      {/* ── Filter Bar ── */}
      <FilterBar
        period={period} setPeriod={setPeriod}
        salesList={salesList} salesFilter={salesFilter} setSalesFilter={setSalesFilter}
      />

      {/* ── KPI Strip ── */}
      <div className="kpis">
        {kpis.map((k, i) => (
          <div key={i} className={`kpi${(k as {warn?: boolean}).warn ? " kpi-warn" : ""}`}
            style={{ cursor: "pointer" }}
            onClick={() => onNavigate(k.view)}
            title={`Buka ${k.view}`}
          >
            <div className="kpi-label">{k.label}</div>
            <div className="kpi-num" style={{ color: k.color }}>{k.num}</div>
            <div className="kpi-sub">{k.sub}</div>
          </div>
        ))}
      </div>

      {/* ── Pipeline Funnel ── */}
      <div className="panel" style={{ marginBottom: 16, cursor: "pointer" }} onClick={() => onNavigate("pipeline")}>
        <SectionHeader title="Pipeline per Stage" action="Buka Pipeline" onClick={() => onNavigate("pipeline")} />
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {stageData.map(s => (
            <div key={s.stage} style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 90, fontSize: 12, fontWeight: 600, color: "var(--ink-soft)", flexShrink: 0 }}>{s.stage}</div>
              <div style={{ flex: 1, background: "var(--line)", borderRadius: 4, height: 20, overflow: "hidden" }}>
                <div style={{
                  width: `${(s.value / maxStageValue) * 100}%`,
                  background: STAGE_COLOR[s.stage] || "var(--brand)",
                  height: "100%", borderRadius: 4,
                  transition: "width .4s ease",
                  minWidth: s.count > 0 ? 4 : 0,
                }} />
              </div>
              <div style={{ width: 110, fontSize: 12, textAlign: "right", color: "var(--ink)", fontWeight: 600, flexShrink: 0 }}>{fmtIDR(s.value)}</div>
              <div style={{ width: 50, fontSize: 12, textAlign: "right", color: "var(--ink-soft)", flexShrink: 0 }}>{s.count} deal</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Row 2: Visit + Follow-up ── */}
      <div className="grid2">
        <div className="panel">
          <SectionHeader title={`Visit Mendatang (${upcoming.length})`} action="Buka Calendar" onClick={() => onNavigate("calendar")} />
          {upcoming.length ? upcoming.map(v => (
            <div key={v.id} className="timeline-item" style={{ cursor: "pointer" }} onClick={() => onNavigate("calendar")}>
              <div className="ti-date">{fmtDate(v.date)} · <b>{clientName(v.client_id)}</b></div>
              <div className="ti-body">{v.purpose} <VisitBadge status={v.status} /></div>
              {v.pic && <div className="muted" style={{ fontSize: 11 }}>PIC: {v.pic}</div>}
            </div>
          )) : <div className="empty-state">Belum ada visit terjadwal.</div>}
        </div>

        <div className="panel">
          <SectionHeader title={`Follow-up Pending (${followups.length})`} action="Buka Calendar" onClick={() => onNavigate("calendar")} />
          {followups.length ? followups.map(v => (
            <div key={v.id} className="timeline-item" style={{ cursor: "pointer" }} onClick={() => onNavigate("calendar")}>
              <div className="ti-date"><b>{clientName(v.client_id)}</b> · {fmtDate(v.date)}</div>
              <div className="ti-body">{v.summary || v.purpose}</div>
              {v.pic && <div className="muted" style={{ fontSize: 11 }}>PIC: {v.pic}</div>}
            </div>
          )) : <div className="empty-state" style={{ color: "#16a34a" }}>Tidak ada follow-up tertunda.</div>}
        </div>
      </div>

      {/* ── Row 3: Deal Closing + Tasks ── */}
      <div className="grid2">
        <div className="panel">
          <SectionHeader title={`Deal Closing 30 Hari (${closingSoon.length})`} action="Buka Pipeline" onClick={() => onNavigate("pipeline")} />
          {closingSoon.length ? closingSoon.map(d => {
            const daysLeft = Math.ceil((new Date(d.close_date).getTime() - new Date(today).getTime()) / 86400000);
            return (
              <div key={d.id} className="timeline-item" style={{ cursor: "pointer" }} onClick={() => onNavigate("pipeline")}>
                <div className="ti-date" style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  {fmtDate(d.close_date)}
                  <span style={{
                    background: daysLeft <= 7 ? "#fef2f2" : "#fffbeb",
                    color: daysLeft <= 7 ? "var(--danger)" : "var(--gold)",
                    padding: "1px 6px", borderRadius: 4, fontSize: 11, fontWeight: 700,
                  }}>{daysLeft}h lagi</span>
                </div>
                <div className="ti-body">
                  <span style={{ fontWeight: 700 }}>{d.name}</span>
                  <span className="muted"> · {clientName(d.client_id)}</span>
                  <span style={{ marginLeft: "auto", color: "var(--brand)", fontWeight: 700, fontSize: 13 }}>{fmtIDR(d.value)}</span>
                </div>
                <div className="muted" style={{ fontSize: 11 }}>Stage: {d.stage} · PIC: {d.owner || "—"}</div>
              </div>
            );
          }) : <div className="empty-state">Tidak ada deal jatuh tempo 30 hari ke depan.</div>}
        </div>

        <div className="panel">
          <SectionHeader
            title={`Task Open (${upcomingTasks.length})${overdueTasks.length > 0 ? ` · ⚠ ${overdueTasks.length} overdue` : ""}`}
            action="Buka Tasks" onClick={() => onNavigate("tasks")}
          />
          {!upcomingTasks.length ? (
            <div className="empty-state">Tidak ada task terjadwal.</div>
          ) : upcomingTasks.map(t => {
            const isOverdue = t.due_date < today;
            return (
              <div key={t.id} className={`task-item${isOverdue ? " task-item-overdue" : ""}`}
                style={{ cursor: "pointer" }} onClick={() => onNavigate("tasks")}>
                <div className="task-item-title">{t.title}</div>
                <div className="task-item-meta">
                  {fmtDate(t.due_date)} · {t.assigned_to || "—"}
                  {t.client_id && ` · ${clientName(t.client_id)}`}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Row 4: Top Clients + Project Aktif ── */}
      <div className="grid2">
        <div className="panel">
          <SectionHeader title="Top Client (Pipeline Value)" action="Buka Client" onClick={() => onNavigate("clients")} />
          {topClients.length ? topClients.map((c, i) => (
            <div key={c.id} style={{
              display: "flex", alignItems: "center", gap: 12, padding: "8px 0",
              borderBottom: i < topClients.length - 1 ? "1px solid var(--line)" : "none",
              cursor: "pointer",
            }} onClick={() => onNavigate("clients")}>
              <div style={{
                width: 28, height: 28, borderRadius: "50%", background: "var(--brand)",
                color: "#fff", display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 12, fontWeight: 800, flexShrink: 0,
              }}>{i + 1}</div>
              <div style={{ flex: 1, fontSize: 13, fontWeight: 600 }}>{c.name}</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: "var(--brand)" }}>{fmtIDR(c.value)}</div>
            </div>
          )) : <div className="empty-state">Belum ada deal pipeline.</div>}
        </div>

        <div className="panel">
          <SectionHeader title={`Project Aktif (${activeProjects.length})`} action="Buka Project" onClick={() => onNavigate("projects")} />
          {activeProjects.length ? activeProjects.slice(0, 5).map(p => (
            <div key={p.id} style={{
              display: "flex", alignItems: "flex-start", gap: 10, padding: "8px 0",
              borderBottom: "1px solid var(--line)", cursor: "pointer",
            }} onClick={() => onNavigate("projects")}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{p.name}</div>
                <div className="muted" style={{ fontSize: 11 }}>
                  {clients.find(c => c.id === p.client_id)?.name || "—"} · {p.product || "—"}
                </div>
              </div>
              <span style={{
                fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 4,
                background: p.status === "In Progress" ? "#dbeafe" : "#fef9c3",
                color: p.status === "In Progress" ? "#1d4ed8" : "#854d0e",
                flexShrink: 0,
              }}>{p.status}</span>
            </div>
          )) : <div className="empty-state">Tidak ada project aktif.</div>}
        </div>
      </div>

      {/* ── Row 5: Team Activity ── */}
      {salesList.length > 0 && (
        <div className="panel">
          <SectionHeader title={`Aktivitas Tim — ${periodLabel}`} />
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(170px, 1fr))", gap: 12 }}>
            {(salesFilter === "all" ? salesList : [salesFilter]).map(name => {
              const stat = teamActivity[name] || { visits: 0, tasks: 0, activities: 0 };
              return (
                <div key={name} style={{
                  background: "var(--bg)", border: "1px solid var(--line)", borderRadius: 10,
                  padding: "12px 14px",
                }}>
                  <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 10, color: "var(--ink)" }}>{name}</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                    <div style={{ fontSize: 12, color: "var(--ink-soft)", display: "flex", justifyContent: "space-between" }}>
                      <span>Visit</span>
                      <span style={{ fontWeight: 700, color: "var(--brand)" }}>{stat.visits}</span>
                    </div>
                    <div style={{ fontSize: 12, color: "var(--ink-soft)", display: "flex", justifyContent: "space-between" }}>
                      <span>Aktivitas</span>
                      <span style={{ fontWeight: 700, color: "var(--brand)" }}>{stat.activities}</span>
                    </div>
                    <div style={{ fontSize: 12, color: "var(--ink-soft)", display: "flex", justifyContent: "space-between" }}>
                      <span>Task Open</span>
                      <span style={{ fontWeight: 700, color: stat.tasks > 0 ? "var(--gold)" : "#16a34a" }}>{stat.tasks}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
}
