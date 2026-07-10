"use client";
import { useState, useMemo } from "react";
import { AppData } from "@/hooks/useData";
import { ActiveView, Client, Deal, Visit, Project, Task, Contact, CRMDocument, Activity } from "@/types";
import { STAGES, STAGE_COLOR, fmtIDR, fmtDate, todayStr, picMatches, picList, fmtDateStr, isWonStage, isClosedStage, isDealAtRisk, weeklyCount } from "@/lib/utils";
import { VisitBadge } from "./ui/Badge";
import { Sparkline } from "./ui/Sparkline";
import EmptyState from "./ui/EmptyState";
import ClientModal from "./ClientModal";
import DealModal from "./DealModal";
import VisitModal from "./VisitModal";
import ProjectModal from "./ProjectModal";
import TaskModal from "./TaskModal";

interface Props {
  data: AppData;
  onNavigate: (view: ActiveView) => void;
  onOpenStage?: (stage: string) => void;
  onSaveClient: (c: Client) => Promise<void>;
  onDeleteClient: (id: string) => Promise<void>;
  onUploadLogo: (file: File, clientId: string) => Promise<string>;
  onDeleteLogo: (url: string) => Promise<void>;
  onSaveDeal: (d: Deal) => Promise<void>;
  onDeleteDeal: (id: string) => Promise<void>;
  onAddDocument: (d: CRMDocument) => Promise<void>;
  onDeleteDocument: (id: string) => Promise<void>;
  onUploadAttachment: (file: File, dealId: string) => Promise<void>;
  onDeleteAttachment: (id: string) => Promise<void>;
  onAddActivity: (a: Activity) => Promise<void>;
  onDeleteActivity: (id: string) => Promise<void>;
  onSaveVisit: (v: Visit) => Promise<void>;
  onDeleteVisit: (id: string) => Promise<void>;
  onCreateTask: (t: Task) => Promise<void>;
  onCreateDeal: (d: Deal) => Promise<void>;
  onSaveContact: (c: Contact) => Promise<void>;
  onSaveProject: (p: Project) => Promise<void>;
  onDeleteProject: (id: string) => Promise<void>;
  onSaveTask: (t: Task) => Promise<void>;
  onDeleteTask: (id: string) => Promise<void>;
}

type Period = "daily" | "weekly" | "monthly";

function SectionHeader({ title, accent, action, onClick }: { title: string; icon?: string; accent?: string; action?: string; onClick?: () => void }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14, flexWrap: "wrap", gap: 8 }}>
      <h2 style={{ margin: 0, fontSize: 13.5, fontWeight: 700, color: "var(--ink)", display: "flex", alignItems: "center", gap: 8, minWidth: 0, flex: "1 1 auto" }}>
        <span style={{ width: 3, height: 14, background: accent || "var(--brand)", borderRadius: 999, display: "inline-block", flexShrink: 0 }} />
        {title}
      </h2>
      {action && (
        <button onClick={onClick} style={{
          background: "none", border: "none", cursor: "pointer", fontSize: 12,
          color: "var(--ink-soft)", fontWeight: 600, padding: "2px 6px", flexShrink: 0,
        }}>{action} →</button>
      )}
    </div>
  );
}

const PANEL_ACCENTS = {
  pipeline: "#2563EB", visit: "#0F766E", reschedule: "#E11D48", reschedule_ok: "#16A34A",
  deal: "#D97706", task: "#EA580C", task_ok: "#16A34A", client: "#7C3AED", project: "#0891B2", team: "#DB2777",
};

function panelStyle(accent: string): React.CSSProperties {
  return { borderTop: `3px solid ${accent}` };
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
  const active: React.CSSProperties = { background: "var(--surface-strong)", color: "#fff", border: "1px solid var(--surface-strong)" };
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
          border: "1px solid var(--line)", background: salesFilter !== "all" ? "var(--surface-strong)" : "var(--paper)",
          color: salesFilter !== "all" ? "#fff" : "var(--ink)", cursor: "pointer",
        }}
      >
        <option value="all">Semua Sales</option>
        {salesList.map(s => <option key={s} value={s}>{s}</option>)}
      </select>
    </div>
  );
}

export default function Dashboard({
  data, onNavigate, onOpenStage,
  onSaveClient, onDeleteClient, onUploadLogo, onDeleteLogo,
  onSaveDeal, onDeleteDeal, onAddDocument, onDeleteDocument, onUploadAttachment, onDeleteAttachment, onAddActivity, onDeleteActivity,
  onSaveVisit, onDeleteVisit, onCreateTask, onCreateDeal, onSaveContact,
  onSaveProject, onDeleteProject, onSaveTask, onDeleteTask,
}: Props) {
  const { clients, contacts, visits, deals, projects, tasks, products, documents, attachments, activities, profiles } = data;
  const today = todayStr();

  const [period, setPeriod] = useState<Period>("monthly");
  const [salesFilter, setSalesFilter] = useState("all");

  // Clicking a dashboard row shows that record's detail modal right here
  // instead of navigating away — keeps the user oriented on the dashboard.
  const [peekClientId, setPeekClientId] = useState<string | null>(null);
  const [peekDealId, setPeekDealId] = useState<string | null>(null);
  const [peekVisitId, setPeekVisitId] = useState<string | null>(null);
  const [peekProjectId, setPeekProjectId] = useState<string | null>(null);
  const [peekTaskId, setPeekTaskId] = useState<string | null>(null);

  const salesList = profiles
    .filter(p => !["super_admin", "admin", "viewer"].includes(p.role))
    .map(p => p.name)
    .filter(Boolean) as string[];

  // ── Period range ────────────────────────────────────────────────────────
  const { periodStart, periodEnd, periodLabel } = useMemo(() => {
    const d = new Date(today + "T00:00:00");
    if (period === "daily") {
      return { periodStart: today, periodEnd: today, periodLabel: "Hari Ini" };
    }
    if (period === "weekly") {
      const dow = d.getDay(); // 0=Sun
      const mon = new Date(d); mon.setDate(d.getDate() - ((dow + 6) % 7));
      const sun = new Date(mon); sun.setDate(mon.getDate() + 6);
      return {
        periodStart: fmtDateStr(mon),
        periodEnd: fmtDateStr(sun),
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
  const filteredDeals = deals.filter(d => bySales(d.owner) && !d.archived);
  const filteredVisits = visits.filter(v => picMatches(v.pic, salesFilter));
  const filteredTasks = tasks.filter(t => bySales(t.assigned_to));

  // Deals
  const openDeals   = filteredDeals.filter(d => !isClosedStage(d.stage));
  const atRiskDeals = openDeals.filter(isDealAtRisk);
  const wonDeals    = filteredDeals.filter(d => isWonStage(d.stage));
  const lostDeals   = filteredDeals.filter(d => d.stage === "Dropped");
  const closedTotal = wonDeals.length + lostDeals.length;
  const winRate     = closedTotal > 0 ? Math.round((wonDeals.length / closedTotal) * 100) : null;
  const wonValue    = wonDeals.reduce((s, d) => s + d.value, 0);
  const pipelineValue = openDeals.reduce((s, d) => s + d.value, 0);

  const closingInPeriod = openDeals.filter(d => d.close_date && inPeriod(d.close_date));

  const in30 = new Date(today + "T00:00:00"); in30.setDate(in30.getDate() + 30);
  const in30Str = fmtDateStr(in30);
  const closingSoon = openDeals
    .filter(d => d.close_date && d.close_date >= today && d.close_date <= in30Str)
    .sort((a, b) => (a.close_date || "").localeCompare(b.close_date || ""));

  // Pipeline per stage
  const stageData = STAGES.filter(s => !isWonStage(s)).map(stage => {
    const sd = openDeals.filter(d => d.stage === stage);
    return { stage, count: sd.length, value: sd.reduce((s, d) => s + d.value, 0) };
  });
  const maxStageValue = Math.max(...stageData.map(s => s.value), 1);

  // Visits
  const periodVisits = filteredVisits.filter(v => v.date && inPeriod(v.date));
  const upcoming = filteredVisits
    .filter(v => v.date >= today && v.status !== "Done" && v.status !== "Cancel")
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 5);
  const followups = filteredVisits.filter(v => v.status === "Reschedule").slice(0, 5);

  // Tasks
  const openTasks    = filteredTasks.filter(t => t.status === "Open");
  const overdueTasks = openTasks.filter(t => t.due_date && t.due_date < today);
  const upcomingTasks = openTasks
    .filter(t => t.due_date)
    .sort((a, b) => a.due_date.localeCompare(b.due_date))
    .slice(0, 5);

  // Activities
  const periodActivities = activities
    .filter(a => inPeriod((a.date || a.created_at || "").slice(0, 10)) && bySales(a.created_by));

  // Projects (not filtered by sales — shared resource)
  const activeProjects = projects.filter(p => p.status === "In Progress" || p.status === "Initiation");

  // Top clients
  const clientDealValue: Record<string, number> = {};
  openDeals.forEach(d => { clientDealValue[d.client_id] = (clientDealValue[d.client_id] || 0) + d.value; });
  const topClients = Object.entries(clientDealValue)
    .sort((a, b) => b[1] - a[1]).slice(0, 5)
    .map(([id, val]) => ({ id, name: clients.find(c => c.id === id)?.name || "—", value: val }));

  // Team activity for period — rostered from salesList plus anyone who
  // actually shows up in this period's visits/tasks/activities, so an admin
  // account doing real sales work isn't silently excluded (salesList itself
  // stays admin-free since it also feeds the sales-filter dropdown and the
  // "assign to" pickers in the peek modals below).
  const teamActivity: Record<string, { visits: number; tasks: number; activities: number }> = {};
  const teamActivityNames = Array.from(new Set([
    ...salesList,
    ...filteredVisits.flatMap(v => picList(v.pic)),
    ...activities.map(a => a.created_by),
    ...tasks.map(t => t.assigned_to),
  ].filter(Boolean)));
  teamActivityNames.forEach(name => {
    teamActivity[name] = {
      visits: filteredVisits.filter(v => picMatches(v.pic, name) && v.date && inPeriod(v.date)).length,
      tasks: tasks.filter(t => t.assigned_to === name && t.status === "Open").length,
      activities: activities.filter(a => a.created_by === name && inPeriod((a.date || a.created_at || "").slice(0, 10))).length,
    };
  });

  const clientName = (id: string) => clients.find(c => c.id === id)?.name || "—";

  const sparkDeals   = weeklyCount(deals.filter(d => bySales(d.owner)), d => (d.created_at || "").slice(0, 10));
  const sparkWon     = weeklyCount(wonDeals, d => (d.stage_updated_at || d.created_at || "").slice(0, 10));
  const sparkVisits  = weeklyCount(filteredVisits, v => v.date);
  const sparkActivities = weeklyCount(activities.filter(a => bySales(a.created_by)), a => (a.date || a.created_at || "").slice(0, 10));
  const sparkTasks   = weeklyCount(filteredTasks, t => t.due_date || "");
  const sparkReschedule = weeklyCount(filteredVisits.filter(v => v.status === "Reschedule"), v => v.date);

  const kpis = [
    {
      label: "Pipeline Aktif", num: openDeals.length, sub: fmtIDR(pipelineValue),
      accent: "var(--brand)", view: "pipeline" as ActiveView,
      spark: sparkDeals, warn: false,
    },
    {
      label: "Closed Won", num: fmtIDR(wonValue), sub: `${wonDeals.length} project`,
      accent: "var(--brand)", view: "pipeline" as ActiveView, stage: "Won",
      spark: sparkWon, warn: false,
    },
    {
      label: "Win Rate", num: winRate !== null ? `${winRate}%` : "—",
      sub: closedTotal > 0 ? `dari ${closedTotal} closed` : "belum ada closed",
      accent: "var(--brand)", view: "pipeline" as ActiveView, stage: "Won",
      spark: sparkWon, warn: false,
    },
    {
      label: "Deal Macet", num: atRiskDeals.length,
      sub: atRiskDeals.length > 0 ? "30+ hari tanpa perpindahan stage" : "semua deal bergerak",
      accent: atRiskDeals.length > 0 ? "var(--danger)" : "var(--brand)",
      view: "pipeline" as ActiveView,
      spark: sparkDeals, warn: atRiskDeals.length > 0,
    },
    {
      label: `Closing ${periodLabel}`, num: closingInPeriod.length,
      sub: fmtIDR(closingInPeriod.reduce((s, d) => s + d.value, 0)),
      accent: "#8B6914", view: "pipeline" as ActiveView,
      spark: sparkDeals, warn: false,
    },
    {
      label: `Visit ${periodLabel}`, num: periodVisits.length,
      sub: `${periodVisits.filter(v => v.status === "Done").length} selesai`,
      accent: "var(--brand)", view: "calendar" as ActiveView,
      spark: sparkVisits, warn: false,
    },
    {
      label: "Reschedule Pending", num: followups.length,
      sub: "butuh tindak lanjut",
      accent: followups.length > 0 ? "var(--danger)" : "var(--brand)",
      view: "calendar" as ActiveView,
      spark: sparkReschedule, warn: followups.length > 0,
    },
    {
      label: `Aktivitas ${periodLabel}`, num: periodActivities.length,
      sub: "log aktivitas",
      accent: "var(--brand)", view: "clients" as ActiveView,
      spark: sparkActivities, warn: false,
    },
    {
      label: "Task Open", num: openTasks.length,
      sub: overdueTasks.length > 0 ? `${overdueTasks.length} overdue` : "semua on track",
      accent: overdueTasks.length > 0 ? "var(--danger)" : "var(--brand)",
      view: "tasks" as ActiveView,
      spark: sparkTasks, warn: overdueTasks.length > 0,
    },
  ];

  const peekClient = peekClientId ? clients.find(c => c.id === peekClientId) || null : null;
  const peekDeal = peekDealId ? deals.find(d => d.id === peekDealId) || null : null;
  const peekVisit = peekVisitId ? visits.find(v => v.id === peekVisitId) || null : null;
  const peekProject = peekProjectId ? projects.find(p => p.id === peekProjectId) || null : null;
  const peekTask = peekTaskId ? tasks.find(t => t.id === peekTaskId) || null : null;
  const peekDealDocuments = peekDealId ? documents.filter(d => d.deal_id === peekDealId) : [];
  const peekDealAttachments = peekDealId ? attachments.filter(a => a.deal_id === peekDealId) : [];
  const peekDealActivities = peekDealId ? activities.filter(a => a.deal_id === peekDealId) : [];

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
          <div key={i} className="kpi-v2"
            style={{
              cursor: "pointer", background: "var(--card)", border: "1px solid var(--line)",
              borderRadius: 12, padding: "16px 18px", boxShadow: "var(--shadow)",
              borderTop: `2px solid ${k.accent}`,
              display: "flex", flexDirection: "column", gap: 0,
            }}
            onClick={() => k.stage && onOpenStage ? onOpenStage(k.stage) : onNavigate(k.view)}
          >
            <div className="kpi-label" style={{ margin: "0 0 8px" }}>{k.label}</div>
            <div className="kpi-num" style={{ color: k.accent, marginBottom: 2 }}>{k.num}</div>
            <div className="kpi-sub" style={{ marginBottom: 10 }}>{k.sub}</div>
            <Sparkline data={k.spark} color={k.accent} warn={k.warn} />
          </div>
        ))}
      </div>

      {/* ── Pipeline Funnel ── */}
      <div className="panel" style={{ marginBottom: 16, ...panelStyle(PANEL_ACCENTS.pipeline) }}>
        <SectionHeader title="Pipeline per Stage" icon="📊" accent={PANEL_ACCENTS.pipeline} action="Buka Pipeline" onClick={() => onNavigate("pipeline")} />
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {stageData.map(s => (
            <div key={s.stage} className="funnel-row" style={{ cursor: "pointer" }}
              onClick={() => onOpenStage ? onOpenStage(s.stage) : onNavigate("pipeline")}>
              <div className="funnel-stage" style={{
                color: STAGE_COLOR[s.stage] || "var(--brand)", background: `${STAGE_COLOR[s.stage] || "var(--brand)"}1A`,
              }}>{s.stage}</div>
              <div className="funnel-track">
                <div className="funnel-fill" style={{
                  width: `${(s.value / maxStageValue) * 100}%`,
                  background: STAGE_COLOR[s.stage] || "var(--brand)",
                  minWidth: s.count > 0 ? 4 : 0,
                }} />
              </div>
              <div className="funnel-value">{fmtIDR(s.value)}</div>
              <div className="funnel-count">{s.count} project</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Row 2: Visit + Follow-up ── */}
      <div className="grid2">
        <div className="panel" style={panelStyle(PANEL_ACCENTS.visit)}>
          <SectionHeader title={`Visit Mendatang (${upcoming.length})`} icon="🚗" accent={PANEL_ACCENTS.visit} action="Buka Calendar" onClick={() => onNavigate("calendar")} />
          {upcoming.length ? upcoming.map(v => (
            <div key={v.id} className="timeline-item hoverable" style={{ cursor: "pointer" }} onClick={() => setPeekVisitId(v.id)}>
              <div className="ti-date">{fmtDate(v.date)} · <b>{clientName(v.client_id)}</b></div>
              <div className="ti-body">{v.purpose} <VisitBadge status={v.status} /></div>
              {v.pic && <div className="muted" style={{ fontSize: 11 }}>PIC: {v.pic}</div>}
            </div>
          )) : <EmptyState icon="🗓️" label="Belum ada visit terjadwal" sub="Tambah visit dari tab Calendar" />}
        </div>

        <div className="panel" style={panelStyle(followups.length > 0 ? PANEL_ACCENTS.reschedule : PANEL_ACCENTS.reschedule_ok)}>
          <SectionHeader title={`Reschedule Pending (${followups.length})`} icon="🔄" accent={followups.length > 0 ? PANEL_ACCENTS.reschedule : PANEL_ACCENTS.reschedule_ok} action="Buka Calendar" onClick={() => onNavigate("calendar")} />
          {followups.length ? followups.map(v => (
            <div key={v.id} className="timeline-item hoverable" style={{ cursor: "pointer" }} onClick={() => setPeekVisitId(v.id)}>
              <div className="ti-date"><b>{clientName(v.client_id)}</b> · {fmtDate(v.date)}</div>
              <div className="ti-body">{v.summary || v.purpose}</div>
              {v.pic && <div className="muted" style={{ fontSize: 11 }}>PIC: {v.pic}</div>}
            </div>
          )) : <EmptyState icon="✅" label="Tidak ada follow-up tertunda" />}
        </div>
      </div>

      {/* ── Row 3: Deal Closing + Tasks ── */}
      <div className="grid2">
        <div className="panel" style={panelStyle(PANEL_ACCENTS.deal)}>
          <SectionHeader title={`Project Closing 30 Hari (${closingSoon.length})`} icon="📅" accent={PANEL_ACCENTS.deal} action="Buka Pipeline" onClick={() => onNavigate("pipeline")} />
          {closingSoon.length ? closingSoon.map(d => {
            const daysLeft = Math.ceil((new Date(d.close_date).getTime() - new Date(today).getTime()) / 86400000);
            return (
              <div key={d.id} className="timeline-item hoverable" style={{ cursor: "pointer" }} onClick={() => setPeekDealId(d.id)}>
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
          }) : <EmptyState icon="📭" label="Tidak ada project closing 30 hari ke depan" />}
        </div>

        <div className="panel" style={panelStyle(overdueTasks.length > 0 ? PANEL_ACCENTS.task : PANEL_ACCENTS.task_ok)}>
          <SectionHeader
            title={`Task Open (${upcomingTasks.length})${overdueTasks.length > 0 ? ` · ⚠ ${overdueTasks.length} overdue` : ""}`}
            icon="✅" accent={overdueTasks.length > 0 ? PANEL_ACCENTS.task : PANEL_ACCENTS.task_ok}
            action="Buka Tasks" onClick={() => onNavigate("tasks")}
          />
          {!upcomingTasks.length ? (
            <EmptyState icon="🎉" label="Semua task beres!" />
          ) : upcomingTasks.map(t => {
            const isOverdue = t.due_date < today;
            return (
              <div key={t.id} className={`task-item${isOverdue ? " task-item-overdue" : ""}`}
                style={{ cursor: "pointer" }} onClick={() => setPeekTaskId(t.id)}>
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
        <div className="panel" style={panelStyle(PANEL_ACCENTS.client)}>
          <SectionHeader title="Top Client (Pipeline Value)" icon="⭐" accent={PANEL_ACCENTS.client} action="Buka Client" onClick={() => onNavigate("clients")} />
          {topClients.length ? topClients.map((c, i) => {
            const rankColors = ["#D97706", "#94A3B8", "#B45309", "#7C3AED", "#7C3AED"];
            return (
              <div key={c.id} style={{
                display: "flex", alignItems: "center", gap: 12, padding: "8px 0",
                borderBottom: i < topClients.length - 1 ? "1px solid var(--line)" : "none",
                cursor: "pointer",
              }} onClick={() => setPeekClientId(c.id)}>
                <div style={{
                  width: 28, height: 28, borderRadius: "50%", background: rankColors[i] || "var(--brand)",
                  color: "#fff", display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 12, fontWeight: 800, flexShrink: 0,
                }}>{i + 1}</div>
                <div style={{ flex: 1, fontSize: 13, fontWeight: 600 }}>{c.name}</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: PANEL_ACCENTS.client }}>{fmtIDR(c.value)}</div>
              </div>
            );
          }) : <EmptyState icon="💰" label="Belum ada project pipeline" sub="Tambah project dari tab Pipeline" />}
        </div>

        <div className="panel" style={panelStyle(PANEL_ACCENTS.project)}>
          <SectionHeader title={`Project Aktif (${activeProjects.length})`} icon="🏗️" accent={PANEL_ACCENTS.project} action="Buka Project" onClick={() => onNavigate("projects")} />
          {activeProjects.length ? activeProjects.slice(0, 5).map(p => (
            <div key={p.id} style={{
              display: "flex", alignItems: "flex-start", gap: 10, padding: "8px 0",
              borderBottom: "1px solid var(--line)", cursor: "pointer",
            }} onClick={() => setPeekProjectId(p.id)}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{p.name}</div>
                <div className="muted" style={{ fontSize: 11 }}>
                  {clients.find(c => c.id === p.client_id)?.name || "—"} · {p.product || "—"}
                </div>
              </div>
              <span style={{
                fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 999,
                background: p.status === "In Progress" ? "#DBEAFE" : "#FEF9C3",
                color: p.status === "In Progress" ? "#1D4ED8" : "#854D0E",
                flexShrink: 0,
              }}>{p.status}</span>
            </div>
          )) : <EmptyState icon="🏗️" label="Tidak ada project aktif" />}
        </div>
      </div>

      {/* ── Row 5: Team Activity ── */}
      {teamActivityNames.length > 0 && (
        <div className="panel" style={panelStyle(PANEL_ACCENTS.team)}>
          <SectionHeader title={`Aktivitas Tim — ${periodLabel}`} icon="👥" accent={PANEL_ACCENTS.team} />
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(170px, 1fr))", gap: 12 }}>
            {(salesFilter === "all" ? teamActivityNames : [salesFilter]).map((name, i) => {
              const stat = teamActivity[name] || { visits: 0, tasks: 0, activities: 0 };
              const avatarColors = ["#2563EB", "#7C3AED", "#DB2777", "#0F766E", "#D97706", "#0891B2"];
              const avatarColor = avatarColors[i % avatarColors.length];
              return (
                <div key={name} style={{
                  background: "var(--bg)", border: "1px solid var(--line)", borderRadius: 10,
                  padding: "12px 14px",
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                    <div style={{
                      width: 24, height: 24, borderRadius: "50%", background: `${avatarColor}22`, color: avatarColor,
                      display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 800, flexShrink: 0,
                    }}>{name[0]}</div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "var(--ink)" }}>{name}</div>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                    <div style={{ fontSize: 12, color: "var(--ink-soft)", display: "flex", justifyContent: "space-between" }}>
                      <span>Visit</span>
                      <span style={{ fontWeight: 700, color: PANEL_ACCENTS.visit }}>{stat.visits}</span>
                    </div>
                    <div style={{ fontSize: 12, color: "var(--ink-soft)", display: "flex", justifyContent: "space-between" }}>
                      <span>Aktivitas</span>
                      <span style={{ fontWeight: 700, color: PANEL_ACCENTS.team }}>{stat.activities}</span>
                    </div>
                    <div style={{ fontSize: 12, color: "var(--ink-soft)", display: "flex", justifyContent: "space-between" }}>
                      <span>Task Open</span>
                      <span style={{ fontWeight: 700, color: stat.tasks > 0 ? "#D97706" : "#16a34a" }}>{stat.tasks}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Peek modals — clicking a row opens that record's detail right here
          instead of navigating to its menu, so the user stays on the dashboard. */}
      <ClientModal open={!!peekClientId} client={peekClient} team={salesList}
        onSave={onSaveClient} onDelete={onDeleteClient} onUploadLogo={onUploadLogo} onDeleteLogo={onDeleteLogo}
        onClose={() => setPeekClientId(null)} />
      <DealModal open={!!peekDealId} deal={peekDeal} clients={clients} products={products} team={salesList}
        documents={peekDealDocuments} attachments={peekDealAttachments} activities={peekDealActivities}
        onSave={onSaveDeal} onDelete={onDeleteDeal}
        onAddDocument={onAddDocument} onDeleteDocument={onDeleteDocument}
        onUploadAttachment={onUploadAttachment} onDeleteAttachment={onDeleteAttachment}
        onAddActivity={onAddActivity} onDeleteActivity={onDeleteActivity}
        onClose={() => setPeekDealId(null)} />
      <VisitModal open={!!peekVisitId} visit={peekVisit} clients={clients} contacts={contacts} deals={deals} projects={projects} visits={visits} team={salesList}
        onSave={onSaveVisit} onDelete={onDeleteVisit} onCreateTask={onCreateTask} onCreateDeal={onCreateDeal} onSaveContact={onSaveContact}
        onClose={() => setPeekVisitId(null)} />
      <ProjectModal open={!!peekProjectId} project={peekProject} clients={clients} team={salesList}
        activities={peekProject ? activities.filter(a => a.project_id === peekProject.id) : []}
        onSave={onSaveProject} onDelete={onDeleteProject}
        onAddActivity={onAddActivity} onDeleteActivity={onDeleteActivity}
        onClose={() => setPeekProjectId(null)} />
      <TaskModal open={!!peekTaskId} task={peekTask} clients={clients} contacts={contacts} deals={deals} team={salesList}
        onSave={onSaveTask} onDelete={onDeleteTask} onCreateDeal={onCreateDeal} onClose={() => setPeekTaskId(null)} />
    </section>
  );
}
