"use client";
import { useState, useMemo } from "react";
import { AppData } from "@/hooks/useData";
import { DateRange } from "@/types";
import { fmtIDR, fmtDate, picMatches, fmtDateStr, isWonStage, weeklyCount } from "@/lib/utils";
import { Sparkline } from "./ui/Sparkline";
import { PeriodDelta } from "./ui/PeriodDelta";

interface Props {
  data: AppData;
  onOpenVisit: (visitId: string) => void;
  onOpenCalendarWeek: (range: DateRange) => void;
  onOpenPipelineWeek: (range: DateRange, stage?: string) => void;
}

type Period = "week" | "month" | "quarter" | "custom";

function toDate(s: string) { return new Date(s + "T00:00:00"); }
function ymd(d: Date) { return fmtDateStr(d); }

function getWeekRange(offset: number) {
  const now = new Date();
  const mon = new Date(now);
  mon.setDate(now.getDate() - ((now.getDay() + 6) % 7) + offset * 7);
  const sun = new Date(mon); sun.setDate(mon.getDate() + 6);
  const fmt = (d: Date) => d.toLocaleDateString("id-ID", { day: "2-digit", month: "short" });
  return { start: ymd(mon), end: ymd(sun), label: `${fmt(mon)} – ${fmt(sun)} ${sun.getFullYear()}` };
}

function getMonthRange(offset: number) {
  const now = new Date();
  const first = new Date(now.getFullYear(), now.getMonth() + offset, 1);
  const last = new Date(first.getFullYear(), first.getMonth() + 1, 0);
  return {
    start: ymd(first), end: ymd(last),
    label: first.toLocaleDateString("id-ID", { month: "long", year: "numeric" }),
  };
}

function getQuarterRange(offset: number) {
  const now = new Date();
  const totalQ = now.getFullYear() * 4 + Math.floor(now.getMonth() / 3) + offset;
  const y = Math.floor(totalQ / 4);
  const q = ((totalQ % 4) + 4) % 4;
  const first = new Date(y, q * 3, 1);
  const last = new Date(y, q * 3 + 3, 0);
  return { start: ymd(first), end: ymd(last), label: `Q${q + 1} ${y}` };
}

// Custom range has no "previous period" concept the way week/month/quarter
// offsets do — this just takes the immediately preceding range of the same
// length, so the "vs periode lalu" hint still means something.
function getPrecedingRange(start: string, end: string) {
  const lengthMs = toDate(end).getTime() - toDate(start).getTime();
  const prevEnd = new Date(toDate(start).getTime() - 86_400_000);
  const prevStart = new Date(prevEnd.getTime() - lengthMs);
  return { start: ymd(prevStart), end: ymd(prevEnd) };
}

function inRange(dateStr: string | null | undefined, start: string, end: string) {
  if (!dateStr) return false;
  const d = dateStr.slice(0, 10);
  return d >= start && d <= end;
}

// Everything already in the CRM as of this point was bulk-imported from
// historical spreadsheets (revenue forecast, client approach log, talent
// trackers, etc.) — created_at on those reflects import time, not when the
// project/opportunity actually started, so counting them as "Project baru"
// in whatever week they happened to be imported is misleading. Only deals
// created after this cutoff (i.e. added through normal day-to-day CRM use)
// count toward "Project baru" going forward.
const HISTORICAL_DATA_CUTOFF = "2026-07-03T07:52:11.000Z";

interface FeedItem {
  date: string;
  icon: string;
  label: string;
  sub: string;
  who: string;
  type: "visit" | "task" | "activity" | "event" | "deal";
  onClick?: () => void;
}

export default function SummaryView({ data, onOpenVisit, onOpenCalendarWeek, onOpenPipelineWeek }: Props) {
  const { clients, deals, visits, tasks, activities, events, profiles } = data;
  const team = profiles.filter(p => !["super_admin","admin","viewer"].includes(p.role)).map(p => p.name).filter(Boolean);
  const [period, setPeriod] = useState<Period>("week");
  const [offset, setOffset] = useState(0);
  const [salesFilter, setSalesFilter] = useState("all");
  const [customStart, setCustomStart] = useState(() => getMonthRange(0).start);
  const [customEnd, setCustomEnd] = useState(() => getMonthRange(0).end);

  const range = period === "week" ? getWeekRange(offset)
    : period === "month" ? getMonthRange(offset)
    : period === "quarter" ? getQuarterRange(offset)
    : { start: customStart, end: customEnd, label: `${fmtDate(customStart)} – ${fmtDate(customEnd)}` };
  const { start, end, label } = range;

  const clientName = (id: string) => clients.find(c => c.id === id)?.name || "—";
  const clientSector = (id: string) => clients.find(c => c.id === id)?.sector || "Lainnya";

  const matchSales = (name: string | null | undefined) => salesFilter === "all" || (name || "").split(",").map(s => s.trim()).includes(salesFilter);

  const periodVisits   = visits.filter(v => inRange(v.date, start, end) && matchSales(v.pic));
  const periodTasks    = tasks.filter(t => inRange(t.due_date, start, end) && matchSales(t.assigned_to));
  const periodActivities = activities.filter(a => inRange(a.date || a.created_at, start, end) && matchSales(a.created_by));
  const periodEvents   = events.filter(e => inRange(e.date, start, end) && matchSales(e.created_by));
  const periodDeals    = deals.filter(d => (d.created_at || "") > HISTORICAL_DATA_CUTOFF && inRange(d.created_at, start, end) && matchSales(d.owner));
  const wonDeals       = deals.filter(d => isWonStage(d.stage) && inRange(d.stage_updated_at || d.created_at, start, end) && matchSales(d.owner));
  const lostDeals      = deals.filter(d => d.stage === "Dropped" && inRange(d.stage_updated_at || d.created_at, start, end) && matchSales(d.owner));
  const doneTasks      = periodTasks.filter(t => t.status === "Done");
  const doneVisits     = periodVisits.filter(v => v.status === "Done");
  const wonValue       = wonDeals.reduce((s, d) => s + d.value, 0);
  const newPipeline    = periodDeals.reduce((s, d) => s + d.value, 0);

  // Previous period's same-shape figures — only used for the "vs periode
  // lalu" hint under each KPI and (in week mode) the trailing-weeks sparkline.
  const prevRange = period === "week" ? getWeekRange(offset - 1)
    : period === "month" ? getMonthRange(offset - 1)
    : period === "quarter" ? getQuarterRange(offset - 1)
    : getPrecedingRange(customStart, customEnd);
  const prevDoneVisits = visits.filter(v => v.status === "Done" && inRange(v.date, prevRange.start, prevRange.end) && matchSales(v.pic));
  const prevDoneTasks  = tasks.filter(t => t.status === "Done" && inRange(t.due_date, prevRange.start, prevRange.end) && matchSales(t.assigned_to));
  const prevPeriodDeals = deals.filter(d => (d.created_at || "") > HISTORICAL_DATA_CUTOFF && inRange(d.created_at, prevRange.start, prevRange.end) && matchSales(d.owner));
  const prevWonDeals   = deals.filter(d => isWonStage(d.stage) && inRange(d.stage_updated_at || d.created_at, prevRange.start, prevRange.end) && matchSales(d.owner));
  const prevLostDeals  = deals.filter(d => d.stage === "Dropped" && inRange(d.stage_updated_at || d.created_at, prevRange.start, prevRange.end) && matchSales(d.owner));
  const prevActivities = activities.filter(a => inRange(a.date || a.created_at, prevRange.start, prevRange.end) && matchSales(a.created_by));

  // Trailing 7-week trend, anchored on the currently viewed week — month mode
  // skips the sparkline (a 7-week trend doesn't map cleanly onto "per bulan"),
  // the delta hint above still applies either way.
  const weekAnchor = period === "week" ? toDate(end) : null;
  const sparkVisitsDone = weekAnchor ? weeklyCount(visits.filter(v => v.status === "Done" && matchSales(v.pic)), v => v.date, 7, weekAnchor) : null;
  const sparkTasksDone  = weekAnchor ? weeklyCount(tasks.filter(t => t.status === "Done" && matchSales(t.assigned_to)), t => t.due_date || "", 7, weekAnchor) : null;
  const sparkNewDeals   = weekAnchor ? weeklyCount(deals.filter(d => (d.created_at || "") > HISTORICAL_DATA_CUTOFF && matchSales(d.owner)), d => (d.created_at || "").slice(0, 10), 7, weekAnchor) : null;
  const sparkWon        = weekAnchor ? weeklyCount(deals.filter(d => isWonStage(d.stage) && matchSales(d.owner)), d => (d.stage_updated_at || d.created_at || "").slice(0, 10), 7, weekAnchor) : null;
  const sparkLost       = weekAnchor ? weeklyCount(deals.filter(d => d.stage === "Dropped" && matchSales(d.owner)), d => (d.stage_updated_at || d.created_at || "").slice(0, 10), 7, weekAnchor) : null;
  const sparkActivities = weekAnchor ? weeklyCount(activities.filter(a => matchSales(a.created_by)), a => (a.date || a.created_at || "").slice(0, 10), 7, weekAnchor) : null;

  // Activity feed — merge all types
  const feed: FeedItem[] = useMemo(() => {
    const items: FeedItem[] = [];

    periodVisits.forEach(v => items.push({
      date: v.date, icon: "🤝", type: "visit",
      label: `Visit: ${clientName(v.client_id)}`,
      sub: [v.approach, v.purpose].filter(Boolean).join(" · ") || "—",
      who: v.pic || "—",
      onClick: () => onOpenVisit(v.id),
    }));

    periodTasks.forEach(t => items.push({
      date: t.due_date, icon: t.status === "Done" ? "✅" : "📋", type: "task",
      label: t.title,
      sub: `Task · ${t.status}${t.client_id ? " · " + clientName(t.client_id) : ""}`,
      who: t.assigned_to || "—",
    }));

    periodActivities.forEach(a => items.push({
      date: (a.date || a.created_at || "").slice(0, 10), icon: "💬", type: "activity",
      label: `${a.type}: ${a.description.slice(0, 60)}${a.description.length > 60 ? "…" : ""}`,
      sub: a.deal_id ? `Project · ${deals.find(d => d.id === a.deal_id)?.name || "—"}` : "Aktivitas",
      who: a.created_by || "—",
    }));

    periodEvents.forEach(e => items.push({
      date: e.date, icon: "📅", type: "event",
      label: e.title,
      sub: e.type,
      who: e.created_by || "—",
    }));

    periodDeals.forEach(d => items.push({
      date: (d.created_at || "").slice(0, 10), icon: "💼", type: "deal",
      label: `Project baru: ${d.name}`,
      sub: `${clientName(d.client_id)} · ${d.stage}`,
      who: d.owner || "—",
    }));

    return items.sort((a, b) => b.date.localeCompare(a.date));
  }, [periodVisits, periodTasks, periodActivities, periodEvents, periodDeals]);

  // Group feed by date
  const feedByDate = useMemo(() => {
    const map: Record<string, FeedItem[]> = {};
    feed.forEach(f => {
      if (!map[f.date]) map[f.date] = [];
      map[f.date].push(f);
    });
    return Object.entries(map).sort(([a], [b]) => b.localeCompare(a));
  }, [feed]);

  // Per-person breakdown
  const teamStats = (salesFilter === "all" ? team : team.filter(t => t === salesFilter)).map(name => ({
    name,
    visits: periodVisits.filter(v => picMatches(v.pic, name)).length,
    visitsDone: periodVisits.filter(v => picMatches(v.pic, name) && v.status === "Done").length,
    tasks: periodTasks.filter(t => t.assigned_to === name).length,
    tasksDone: doneTasks.filter(t => t.assigned_to === name).length,
    activities: periodActivities.filter(a => a.created_by === name).length,
    wonValue: wonDeals.filter(d => d.owner === name).reduce((s, d) => s + d.value, 0),
    pipeline: periodDeals.filter(d => d.owner === name).reduce((s, d) => s + d.value, 0),
  }));

  // Per-sector breakdown — every other cut in this report slices by "who"
  // (sales) or "when" (period); sector is the only "what kind of client"
  // lens, and Client.sector was already sitting there unused for this.
  const sectorStats = useMemo(() => {
    const map: Record<string, { visits: number; visitsDone: number; wonValue: number; newPipeline: number; clientIds: Set<string> }> = {};
    const ensure = (sector: string) => (map[sector] ||= { visits: 0, visitsDone: 0, wonValue: 0, newPipeline: 0, clientIds: new Set() });
    periodVisits.forEach(v => {
      const s = ensure(clientSector(v.client_id));
      s.visits++;
      if (v.status === "Done") s.visitsDone++;
      s.clientIds.add(v.client_id);
    });
    wonDeals.forEach(d => { ensure(clientSector(d.client_id)).wonValue += d.value; });
    periodDeals.forEach(d => { ensure(clientSector(d.client_id)).newPipeline += d.value; });
    return Object.entries(map)
      .map(([sector, v]) => ({ sector, ...v, clientCount: v.clientIds.size }))
      .sort((a, b) => b.wonValue - a.wonValue || b.visits - a.visits);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [periodVisits, wonDeals, periodDeals, clients]);

  const typeCls: Record<string, string> = {
    visit: "feed-type-visit", task: "feed-type-task",
    activity: "feed-type-activity", event: "feed-type-event", deal: "feed-type-deal",
  };
  const typeLabel: Record<string, string> = {
    visit: "Visit", task: "Task", activity: "Aktivitas", event: "Event", deal: "Project",
  };

  return (
    <section>
      {/* Period selector */}
      <div className="sum-header">
        <div className="sum-period-toggle">
          <button className={period === "week" ? "sum-toggle-active" : "sum-toggle"} onClick={() => { setPeriod("week"); setOffset(0); }}>Per Minggu</button>
          <button className={period === "month" ? "sum-toggle-active" : "sum-toggle"} onClick={() => { setPeriod("month"); setOffset(0); }}>Per Bulan</button>
          <button className={period === "quarter" ? "sum-toggle-active" : "sum-toggle"} onClick={() => { setPeriod("quarter"); setOffset(0); }}>Per Kuartal</button>
          <button className={period === "custom" ? "sum-toggle-active" : "sum-toggle"} onClick={() => setPeriod("custom")}>Custom</button>
        </div>
        {period === "custom" ? (
          <div className="sum-nav" style={{ gap: 6 }}>
            <input type="date" value={customStart} max={customEnd}
              onChange={e => setCustomStart(e.target.value)}
              style={{ fontSize: 13, padding: "4px 8px", borderRadius: 6, border: "1px solid var(--line)", background: "var(--card)", color: "var(--ink)" }} />
            <span className="muted">–</span>
            <input type="date" value={customEnd} min={customStart}
              onChange={e => setCustomEnd(e.target.value)}
              style={{ fontSize: 13, padding: "4px 8px", borderRadius: 6, border: "1px solid var(--line)", background: "var(--card)", color: "var(--ink)" }} />
          </div>
        ) : (
          <div className="sum-nav">
            <button className="cal-nav-btn" onClick={() => setOffset(o => o - 1)}>‹</button>
            <span className="sum-period-label">{label}</span>
            <button className="cal-nav-btn" onClick={() => setOffset(o => o + 1)} disabled={offset >= 0}>›</button>
            {offset !== 0 && <button className="btn btn-ghost btn-sm" onClick={() => setOffset(0)}>Sekarang</button>}
          </div>
        )}
        <select
          className="sum-sales-filter"
          value={salesFilter}
          onChange={e => setSalesFilter(e.target.value)}
          style={{ fontSize: 13, padding: "4px 10px", borderRadius: 6, border: "1px solid var(--line)", background: "var(--card)", color: "var(--ink)", cursor: "pointer" }}
        >
          <option value="all">Semua Sales</option>
          {team.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>

      {/* KPI Cards */}
      <div className="kpis" style={{ marginBottom: 20 }}>
        <div className="kpi kpi-v2" style={{ cursor: "pointer" }} onClick={() => onOpenCalendarWeek({ start, end })} title="Buka Calendar Visit · periode ini saja">
          <div className="kpi-label">Visit dilakukan</div>
          <div className="kpi-num">{doneVisits.length}</div>
          <div className="kpi-sub">dari {periodVisits.length} terjadwal</div>
          <PeriodDelta current={doneVisits.length} previous={prevDoneVisits.length} label="periode lalu" />
          {sparkVisitsDone && <Sparkline data={sparkVisitsDone} color="var(--brand)" />}
        </div>
        <div className="kpi">
          <div className="kpi-label">Task selesai</div>
          <div className="kpi-num">{doneTasks.length}</div>
          <div className="kpi-sub">dari {periodTasks.length} task</div>
          <PeriodDelta current={doneTasks.length} previous={prevDoneTasks.length} label="periode lalu" />
          {sparkTasksDone && <Sparkline data={sparkTasksDone} color="var(--gold)" />}
        </div>
        <div className="kpi kpi-v2" style={{ cursor: "pointer" }} onClick={() => onOpenPipelineWeek({ start, end })} title="Buka Pipeline · project baru periode ini saja">
          <div className="kpi-label">Project baru</div>
          <div className="kpi-num">{periodDeals.length}</div>
          <div className="kpi-sub">{fmtIDR(newPipeline)}</div>
          <PeriodDelta current={periodDeals.length} previous={prevPeriodDeals.length} label="periode lalu" />
          {sparkNewDeals && <Sparkline data={sparkNewDeals} color="var(--ink-soft)" />}
        </div>
        <div className="kpi kpi-v2" style={{ borderColor: wonDeals.length ? "var(--brand)" : "", cursor: "pointer" }} onClick={() => onOpenPipelineWeek({ start, end }, "Dealed")} title="Buka Pipeline · stage Dealed, periode ini saja">
          <div className="kpi-label">Project Won</div>
          <div className="kpi-num" style={{ color: wonDeals.length ? "var(--brand)" : "" }}>{wonDeals.length}</div>
          <div className="kpi-sub">{fmtIDR(wonValue)}</div>
          <PeriodDelta current={wonDeals.length} previous={prevWonDeals.length} label="periode lalu" />
          {sparkWon && <Sparkline data={sparkWon} color="var(--brand)" />}
        </div>
        <div className="kpi kpi-v2" style={{ borderColor: lostDeals.length ? "var(--danger)" : "", cursor: "pointer" }} onClick={() => onOpenPipelineWeek({ start, end }, "Dropped")} title="Buka Pipeline · stage Dropped, periode ini saja">
          <div className="kpi-label">Project Lost</div>
          <div className="kpi-num" style={{ color: lostDeals.length ? "var(--danger)" : "" }}>{lostDeals.length}</div>
          <div className="kpi-sub">{lostDeals.length ? lostDeals.map(d => d.name).join(", ").slice(0, 40) : "Tidak ada"}</div>
          <PeriodDelta current={lostDeals.length} previous={prevLostDeals.length} label="periode lalu" />
          {sparkLost && <Sparkline data={sparkLost} color="var(--danger)" warn />}
        </div>
        <div className="kpi">
          <div className="kpi-label">Aktivitas dicatat</div>
          <div className="kpi-num">{periodActivities.length}</div>
          <div className="kpi-sub">{periodEvents.length} event tambahan</div>
          <PeriodDelta current={periodActivities.length} previous={prevActivities.length} label="periode lalu" />
          {sparkActivities && <Sparkline data={sparkActivities} color="var(--accent)" />}
        </div>
      </div>

      <div className="grid2" style={{ alignItems: "start" }}>
        {/* Activity Feed */}
        <div className="panel" style={{ minHeight: 300 }}>
          <h2>Semua aktivitas <span className="count">({feed.length})</span></h2>
          {feed.length === 0 ? (
            <div className="empty-state">Belum ada aktivitas di periode ini.</div>
          ) : feedByDate.map(([date, items]) => (
            <div key={date} className="feed-day-group">
              <div className="feed-date-label">{fmtDate(date)}</div>
              {items.map((item, i) => (
                <div key={i} className={`feed-item${item.onClick ? " feed-item-clickable" : ""}`}
                  onClick={item.onClick} title={item.onClick ? "Buka detail visit" : undefined}>
                  <span className="feed-icon">{item.icon}</span>
                  <div className="feed-body">
                    <div className="feed-label">{item.label}</div>
                    <div className="feed-meta">
                      <span className={`feed-type ${typeCls[item.type]}`}>{typeLabel[item.type]}</span>
                      <span>{item.sub}</span>
                      {item.who && item.who !== "—" && <span>· 👤 {item.who}</span>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>

        {/* Per-person breakdown */}
        <div>
          <div className="panel">
            <h2>Performa per sales</h2>
            {teamStats.every(t => t.visits + t.tasks + t.activities + t.wonValue === 0) ? (
              <div className="empty-state">Belum ada data aktivitas di periode ini.</div>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table style={{ minWidth: 400 }}>
                  <thead>
                    <tr>
                      <th>Sales</th>
                      <th style={{ textAlign: "right" }}>Visit</th>
                      <th style={{ textAlign: "right" }}>Task ✓</th>
                      <th style={{ textAlign: "right" }}>Aktivitas</th>
                      <th style={{ textAlign: "right" }}>Won</th>
                    </tr>
                  </thead>
                  <tbody>
                    {teamStats.map(s => (
                      <tr key={s.name} style={{ cursor: "pointer", background: salesFilter === s.name ? "var(--brand-soft)" : undefined }}
                        onClick={() => setSalesFilter(f => f === s.name ? "all" : s.name)}
                        title={salesFilter === s.name ? "Klik untuk kembali ke semua sales" : `Klik untuk fokus ke ${s.name} saja`}>
                        <td style={{ fontWeight: 600 }}>{s.name}</td>
                        <td style={{ textAlign: "right" }}>
                          {s.visitsDone}<span className="muted">/{s.visits}</span>
                        </td>
                        <td style={{ textAlign: "right" }}>
                          {s.tasksDone}<span className="muted">/{s.tasks}</span>
                        </td>
                        <td style={{ textAlign: "right" }}>{s.activities}</td>
                        <td style={{ textAlign: "right", color: s.wonValue ? "var(--brand)" : undefined, fontWeight: s.wonValue ? 700 : undefined }}>
                          {s.wonValue ? fmtIDR(s.wonValue) : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Per-sector breakdown */}
          {sectorStats.length > 0 && (
            <div className="panel">
              <h2>Performa per Sektor</h2>
              <div style={{ overflowX: "auto" }}>
                <table style={{ minWidth: 380 }}>
                  <thead>
                    <tr>
                      <th>Sektor</th>
                      <th style={{ textAlign: "right" }}>Client</th>
                      <th style={{ textAlign: "right" }}>Visit</th>
                      <th style={{ textAlign: "right" }}>Won</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sectorStats.map(s => (
                      <tr key={s.sector}>
                        <td style={{ fontWeight: 600 }}>{s.sector}</td>
                        <td style={{ textAlign: "right" }}>{s.clientCount}</td>
                        <td style={{ textAlign: "right" }}>
                          {s.visitsDone}<span className="muted">/{s.visits}</span>
                        </td>
                        <td style={{ textAlign: "right", color: s.wonValue ? "var(--brand)" : undefined, fontWeight: s.wonValue ? 700 : undefined }}>
                          {s.wonValue ? fmtIDR(s.wonValue) : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Won deals detail */}
          {wonDeals.length > 0 && (
            <div className="panel">
              <h2>Project Won periode ini 🎉</h2>
              {wonDeals.map(d => (
                <div key={d.id} className="timeline-item">
                  <div className="ti-date">{clientName(d.client_id)}{d.owner ? ` · 👤 ${d.owner}` : ""}</div>
                  <div className="ti-body">
                    <span style={{ fontWeight: 700 }}>{d.name}</span>
                    <span style={{ marginLeft: "auto", color: "var(--brand)", fontWeight: 700 }}>{fmtIDR(d.value)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Visit completion rate */}
          {periodVisits.length > 0 && (
            <div className="panel">
              <h2>Visit per client</h2>
              {Array.from(new Set(periodVisits.map(v => v.client_id))).map(cid => {
                const cvs = periodVisits.filter(v => v.client_id === cid);
                const done = cvs.filter(v => v.status === "Done").length;
                const pct = Math.round((done / cvs.length) * 100);
                return (
                  <div key={cid} className="visit-stat-row">
                    <div className="visit-stat-name">{clientName(cid)}</div>
                    <div className="visit-stat-bar-wrap">
                      <div className="visit-stat-bar" style={{ width: `${pct}%` }} />
                    </div>
                    <div className="visit-stat-num">{done}/{cvs.length}</div>
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
