"use client";
import { useState } from "react";
import { AppData } from "@/hooks/useData";
import { fmtIDR, fmtDate, fmtDateStr, picMatches, STAGE_COLOR } from "@/lib/utils";
import { exportWeeklyReport } from "@/lib/export";

function getWeekRange(offset: number) {
  const now = new Date();
  const mon = new Date(now);
  mon.setDate(now.getDate() - ((now.getDay() + 6) % 7) + offset * 7);
  const sun = new Date(mon); sun.setDate(mon.getDate() + 6);
  const fmt = (d: Date) => d.toLocaleDateString("id-ID", { day: "2-digit", month: "short" });
  return { start: fmtDateStr(mon), end: fmtDateStr(sun), label: `${fmt(mon)} – ${fmt(sun)} ${sun.getFullYear()}` };
}

function inRange(dateStr: string | null | undefined, start: string, end: string) {
  if (!dateStr) return false;
  const d = dateStr.slice(0, 10);
  return d >= start && d <= end;
}

interface Props { data: AppData; onOpenProject: (projectId: string) => void; }

export default function WeeklyReport({ data, onOpenProject }: Props) {
  const { clients, visits, deals, projects, profiles } = data;
  const team = profiles.filter(p => !["super_admin", "admin", "viewer"].includes(p.role)).map(p => p.name).filter(Boolean);
  const [offset, setOffset] = useState(0);
  const { start, end, label } = getWeekRange(offset);

  const clientName = (id: string) => clients.find(c => c.id === id)?.name || "—";

  const weekVisits = visits.filter(v => v.status === "Done" && inRange(v.date, start, end));
  const weekDealUpdates = deals.filter(d => d.stage_updated_at && inRange(d.stage_updated_at, start, end));
  const weekWon = weekDealUpdates.filter(d => d.stage === "Won");
  const activeSales = new Set(weekVisits.flatMap(v => v.pic ? v.pic.split(",").map(s => s.trim()) : []));

  const salesData = team.map(name => {
    const salesVisits = weekVisits.filter(v => picMatches(v.pic, name)).sort((a, b) => b.date.localeCompare(a.date));
    const salesDealUpdates = weekDealUpdates.filter(d => d.owner === name);
    return { name, visits: salesVisits, dealUpdates: salesDealUpdates };
  });

  function relatedDeal(v: (typeof weekVisits)[number]) {
    return v.deal_id ? deals.find(d => d.id === v.deal_id) || null : null;
  }

  function relatedProjects(clientId: string) {
    return projects.filter(p => p.client_id === clientId);
  }

  return (
    <section>
      <div className="sum-header">
        <h2 style={{ margin: 0 }}>Laporan Mingguan</h2>
        <div className="sum-nav">
          <button className="cal-nav-btn" onClick={() => setOffset(o => o - 1)}>‹</button>
          <span className="sum-period-label">{label}</span>
          <button className="cal-nav-btn" onClick={() => setOffset(o => o + 1)} disabled={offset >= 0}>›</button>
          {offset !== 0 && <button className="btn btn-ghost btn-sm" onClick={() => setOffset(0)}>Minggu Ini</button>}
        </div>
        <button className="btn btn-ghost btn-sm" onClick={() => exportWeeklyReport(salesData, clientName, relatedDeal, label)}>↓ Export CSV</button>
      </div>

      <div className="kpis" style={{ marginBottom: 20 }}>
        <div className="kpi">
          <div className="kpi-label">Visit Selesai</div>
          <div className="kpi-num">{weekVisits.length}</div>
          <div className="kpi-sub">{new Set(weekVisits.map(v => v.client_id)).size} client dikunjungi</div>
        </div>
        <div className="kpi">
          <div className="kpi-label">Update Pipeline</div>
          <div className="kpi-num">{weekDealUpdates.length}</div>
          <div className="kpi-sub">deal berpindah stage</div>
        </div>
        <div className="kpi" style={{ borderColor: weekWon.length ? "var(--brand)" : "" }}>
          <div className="kpi-label">Closed Won</div>
          <div className="kpi-num" style={{ color: weekWon.length ? "var(--brand)" : "" }}>{weekWon.length}</div>
          <div className="kpi-sub">{fmtIDR(weekWon.reduce((s, d) => s + d.value, 0))}</div>
        </div>
        <div className="kpi">
          <div className="kpi-label">Sales Aktif</div>
          <div className="kpi-num">{activeSales.size}<span className="muted">/{team.length}</span></div>
          <div className="kpi-sub">melakukan visit minggu ini</div>
        </div>
      </div>

      {salesData.map(s => (
        <div key={s.name} className="panel wr-sales-panel">
          <div className="wr-sales-header">
            <div className="wr-sales-name">👤 {s.name}</div>
            <div className="wr-sales-stats">
              <span>{s.visits.length} visit</span>
              <span>·</span>
              <span>{new Set(s.visits.map(v => v.client_id)).size} client</span>
              {s.dealUpdates.length > 0 && (
                <>
                  <span>·</span>
                  <span>{s.dealUpdates.length} update pipeline</span>
                </>
              )}
            </div>
          </div>

          {s.visits.length === 0 ? (
            <div className="empty-state" style={{ padding: "14px 0" }}>Belum ada visit selesai minggu ini.</div>
          ) : (
            <div className="wr-card-list">
              {s.visits.map(v => {
                const deal = relatedDeal(v);
                const dealUpdatedThisWeek = deal?.stage_updated_at ? inRange(deal.stage_updated_at, start, end) : false;
                const clientProjects = relatedProjects(v.client_id);
                return (
                  <div key={v.id} className="wr-card">
                    <div className="wr-card-top">
                      <span className="wr-date">{fmtDate(v.date)}</span>
                      <span className="wr-client">{clientName(v.client_id)}</span>
                      {v.approach && <span className="wr-approach">{v.approach}</span>}
                    </div>
                    <div className="wr-summary">
                      {v.summary || <em className="muted">Belum ada ringkasan hasil.</em>}
                    </div>
                    {(deal || clientProjects.length > 0) && (
                      <div className="wr-updates">
                        {deal && (
                          <span
                            className="wr-update-chip"
                            style={{ borderColor: STAGE_COLOR[deal.stage] || "var(--brand)", color: STAGE_COLOR[deal.stage] || "var(--brand)" }}
                          >
                            💼 {deal.name} → {deal.stage}
                            {dealUpdatedThisWeek && " · update minggu ini"}
                          </span>
                        )}
                        {clientProjects.map(p => (
                          <span
                            key={p.id}
                            className="wr-update-chip wr-update-chip-clickable"
                            onClick={() => onOpenProject(p.id)}
                            title="Buka detail project"
                          >
                            🏗️ {p.name} · {p.status}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ))}
    </section>
  );
}
