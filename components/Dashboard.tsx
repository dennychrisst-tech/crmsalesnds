"use client";
import { AppData } from "@/hooks/useData";
import { ActiveView } from "@/types";
import { STAGES, STAGE_PROB, fmtIDR, fmtDate, todayStr } from "@/lib/utils";
import { VisitBadge } from "./ui/Badge";

interface Props {
  data: AppData;
  onNavigate: (view: ActiveView) => void;
}

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

export default function Dashboard({ data, onNavigate }: Props) {
  const { clients, visits, deals, projects, tasks, activities, profiles } = data;
  const today = todayStr();
  const [thisYear, thisMonth] = today.slice(0, 7).split("-");
  const monthPrefix = `${thisYear}-${thisMonth}`;

  // ── Deals ────────────────────────────────────────────────────────────────
  const openDeals = deals.filter(d => d.stage !== "Won" && d.stage !== "Lost");
  const wonDeals  = deals.filter(d => d.stage === "Won");
  const lostDeals = deals.filter(d => d.stage === "Lost");
  const closedTotal = wonDeals.length + lostDeals.length;
  const winRate  = closedTotal > 0 ? Math.round((wonDeals.length / closedTotal) * 100) : null;
  const weighted = openDeals.reduce((s, d) => s + (d.value * STAGE_PROB[d.stage] / 100), 0);
  const wonValue = wonDeals.reduce((s, d) => s + d.value, 0);
  const pipelineValue = openDeals.reduce((s, d) => s + d.value, 0);

  const in30 = new Date();
  in30.setDate(in30.getDate() + 30);
  const in30Str = in30.toISOString().slice(0, 10);
  const closingSoon = openDeals
    .filter(d => d.close_date && d.close_date >= today && d.close_date <= in30Str)
    .sort((a, b) => a.close_date.localeCompare(b.close_date));

  const closingThisMonth = openDeals.filter(d => d.close_date?.startsWith(monthPrefix));

  // Pipeline per stage
  const stageData = STAGES.filter(s => s !== "Won" && s !== "Lost").map(stage => {
    const stageDeals = openDeals.filter(d => d.stage === stage);
    return { stage, count: stageDeals.length, value: stageDeals.reduce((s, d) => s + d.value, 0) };
  });
  const maxStageValue = Math.max(...stageData.map(s => s.value), 1);

  // ── Visits ───────────────────────────────────────────────────────────────
  const visitsThisMonth = visits.filter(v => v.date?.startsWith(monthPrefix));
  const upcoming = visits
    .filter(v => v.date >= today && v.status !== "Done" && v.status !== "No-go")
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 5);
  const followups = visits.filter(v => v.status === "Follow-up").slice(0, 5);

  // ── Tasks ────────────────────────────────────────────────────────────────
  const openTasks    = tasks.filter(t => t.status === "Open");
  const overdueTasks = openTasks.filter(t => t.due_date && t.due_date < today);
  const upcomingTasks = openTasks
    .filter(t => t.due_date)
    .sort((a, b) => a.due_date.localeCompare(b.due_date))
    .slice(0, 5);

  // ── Activities ───────────────────────────────────────────────────────────
  const activitiesThisMonth = activities.filter(a => (a.created_at || "").startsWith(monthPrefix));

  // ── Projects ─────────────────────────────────────────────────────────────
  const activeProjects = projects.filter(p => p.status === "In Progress" || p.status === "Initiation");

  // ── Top clients by deal value ─────────────────────────────────────────────
  const clientDealValue: Record<string, number> = {};
  openDeals.forEach(d => { clientDealValue[d.client_id] = (clientDealValue[d.client_id] || 0) + d.value; });
  const topClients = Object.entries(clientDealValue)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([id, val]) => ({ id, name: clients.find(c => c.id === id)?.name || "—", value: val }));

  // ── Team activity this month ──────────────────────────────────────────────
  const teamActivity: Record<string, { visits: number; tasks: number }> = {};
  profiles.filter(p => !["super_admin", "admin"].includes(p.role)).forEach(p => {
    if (!p.name) return;
    teamActivity[p.name] = {
      visits: visitsThisMonth.filter(v => v.pic === p.name).length,
      tasks: tasks.filter(t => t.assigned_to === p.name && t.status === "Open").length,
    };
  });

  const clientName = (id: string) => clients.find(c => c.id === id)?.name || "—";

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
      label: "Closing Bulan Ini", num: closingThisMonth.length,
      sub: fmtIDR(closingThisMonth.reduce((s, d) => s + d.value, 0)),
      color: closingThisMonth.length > 0 ? "var(--gold)" : "var(--ink-soft)", view: "pipeline" as ActiveView,
    },
    {
      label: "Visit Bulan Ini", num: visitsThisMonth.length,
      sub: `${visitsThisMonth.filter(v => v.status === "Done").length} selesai`,
      color: "var(--brand)", view: "calendar" as ActiveView,
    },
    {
      label: "Follow-up Pending", num: followups.length,
      sub: "butuh tindak lanjut",
      color: followups.length > 0 ? "var(--danger)" : "#16a34a", view: "calendar" as ActiveView,
    },
    {
      label: "Project Aktif", num: activeProjects.length,
      sub: `${projects.length} total project`,
      color: "var(--brand)", view: "projects" as ActiveView,
    },
    {
      label: "Task Open", num: openTasks.length,
      sub: overdueTasks.length > 0 ? `⚠ ${overdueTasks.length} overdue` : "semua on track",
      color: overdueTasks.length > 0 ? "var(--danger)" : "#16a34a", view: "tasks" as ActiveView,
      warn: overdueTasks.length > 0,
    },
  ];

  const STAGE_COLOR: Record<string, string> = {
    Lead: "#94a3b8", Discovery: "#60a5fa", Proposal: "#f59e0b",
    Negotiation: "#f97316", Won: "#16a34a", Lost: "#ef4444",
  };

  return (
    <section>
      {/* ── KPI Strip ── */}
      <div className="kpis">
        {kpis.map((k, i) => (
          <div key={i} className={`kpi${k.warn ? " kpi-warn" : ""}`}
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
              <div style={{ width: 40, fontSize: 12, textAlign: "right", color: "var(--ink-soft)", flexShrink: 0 }}>{s.count} deal</div>
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
          )) : <div className="empty-state" style={{ color: "#16a34a" }}>Tidak ada follow-up tertunda. 🎉</div>}
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
      {Object.keys(teamActivity).length > 0 && (
        <div className="panel">
          <SectionHeader title="Aktivitas Tim Bulan Ini" />
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 12 }}>
            {Object.entries(teamActivity).map(([name, stat]) => (
              <div key={name} style={{
                background: "var(--bg)", border: "1px solid var(--line)", borderRadius: 10,
                padding: "12px 14px",
              }}>
                <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8, color: "var(--ink)" }}>{name}</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  <div style={{ fontSize: 12, color: "var(--ink-soft)" }}>
                    <span style={{ fontWeight: 700, color: "var(--brand)", marginRight: 4 }}>{stat.visits}</span>visit bulan ini
                  </div>
                  <div style={{ fontSize: 12, color: "var(--ink-soft)" }}>
                    <span style={{
                      fontWeight: 700, marginRight: 4,
                      color: stat.tasks > 0 ? "var(--gold)" : "#16a34a",
                    }}>{stat.tasks}</span>task open
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
