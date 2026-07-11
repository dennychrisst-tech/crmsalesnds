"use client";
import { useState } from "react";
import { Share2, Download, FileText, User, Briefcase, FolderKanban } from "lucide-react";
import { AppData } from "@/hooks/useData";
import { Project, DateRange } from "@/types";
import { fmtIDR, fmtDate, fmtDateStr, picMatches, STAGE_COLOR, isWonStage, onActivateKey } from "@/lib/utils";
import { exportWeeklyReport } from "@/lib/export";
import { exportWeeklyReportPdf } from "@/lib/pdf";
import { shareToWhatsApp } from "@/lib/share";
import Modal, { ModalActions } from "./ui/Modal";
import { PeriodDelta } from "./ui/PeriodDelta";

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

interface Props {
  data: AppData;
  onOpenDeal: (dealId: string) => void;
  onOpenCalendarWeek: (range: DateRange) => void;
  onOpenPipelineWeek: (range: DateRange, stage?: string) => void;
}

export default function WeeklyReport({ data, onOpenDeal, onOpenCalendarWeek, onOpenPipelineWeek }: Props) {
  const { clients, visits, deals, projects, profiles, activities } = data;
  const team = profiles.filter(p => !["super_admin", "admin", "viewer"].includes(p.role)).map(p => p.name).filter(Boolean);
  const [offset, setOffset] = useState(0);
  const [detailProject, setDetailProject] = useState<Project | null>(null);
  const [pdfSaving, setPdfSaving] = useState(false);
  const { start, end, label } = getWeekRange(offset);
  // Previous week's same-shape figures, purely for the "vs minggu lalu" hint
  // under each KPI — not otherwise rendered.
  const { start: prevStart, end: prevEnd } = getWeekRange(offset - 1);

  const clientName = (id: string) => clients.find(c => c.id === id)?.name || "—";

  const weekVisits = visits.filter(v => v.status === "Done" && inRange(v.date, start, end));
  const weekReschedules = visits.filter(v => v.status === "Reschedule" && inRange(v.date, start, end));
  const weekCancels = visits.filter(v => v.status === "Cancel" && inRange(v.date, start, end));
  const weekDealUpdates = deals.filter(d => d.stage_updated_at && inRange(d.stage_updated_at, start, end));
  const weekActivityLog = activities.filter(a => inRange(a.date, start, end));
  // Talent deals that reach Won are tracked as Project Talent revenue instead
  // (see Talent.tsx), so counting them here too would double-count the value.
  const weekWon = weekDealUpdates.filter(d => isWonStage(d.stage) && d.product !== "Talent");

  const prevWeekVisits = visits.filter(v => v.status === "Done" && inRange(v.date, prevStart, prevEnd));
  const prevWeekDealUpdates = deals.filter(d => d.stage_updated_at && inRange(d.stage_updated_at, prevStart, prevEnd));
  const prevWeekWon = prevWeekDealUpdates.filter(d => isWonStage(d.stage) && d.product !== "Talent");
  // Counts as "active" whether the update came from a visit or just a logged
  // activity (WA/phone follow-up with no visit) — both are real sales work.
  const activeSales = new Set([
    ...weekVisits.flatMap(v => v.pic ? v.pic.split(",").map(s => s.trim()) : []),
    ...weekActivityLog.map(a => a.created_by).filter(Boolean),
  ]);

  function relatedDeal(v: (typeof weekVisits)[number]) {
    return v.deal_id ? deals.find(d => d.id === v.deal_id) || null : null;
  }

  function relatedProjects(clientId: string) {
    return projects.filter(p => p.client_id === clientId);
  }

  // Activity updates (Oppty & Project) logged this week, attached to whichever
  // visit card references the same deal/project.
  function relatedActivities(v: (typeof weekVisits)[number]) {
    return weekActivityLog.filter(a =>
      (v.deal_id && a.deal_id === v.deal_id) || (v.project_id && a.project_id === v.project_id)
    ).sort((a, b) => (b.date || "").localeCompare(a.date || ""));
  }

  // Client name for an activity not tied to any visit — resolved via its Deal
  // or Project (whichever it's linked to), same as the deal/project themselves.
  function activityRef(a: (typeof weekActivityLog)[number]) {
    const deal = a.deal_id ? deals.find(d => d.id === a.deal_id) || null : null;
    if (deal) return { kind: "deal" as const, clientId: deal.client_id, label: deal.name, deal };
    const project = a.project_id ? projects.find(p => p.id === a.project_id) || null : null;
    if (project) return { kind: "project" as const, clientId: project.client_id, label: project.name, project };
    return null;
  }

  const salesData = team.map(name => {
    const salesVisits = weekVisits.filter(v => picMatches(v.pic, name)).sort((a, b) => b.date.localeCompare(a.date));
    const rescheduledVisits = weekReschedules.filter(v => picMatches(v.pic, name)).sort((a, b) => b.date.localeCompare(a.date));
    const cancelledVisits = weekCancels.filter(v => picMatches(v.pic, name)).sort((a, b) => b.date.localeCompare(a.date));
    const salesDealUpdates = weekDealUpdates.filter(d => d.owner === name);
    // Activities already shown on one of this week's visit cards don't repeat
    // here — this section is only for updates that had no visit at all.
    const attachedIds = new Set(weekVisits.flatMap(v => relatedActivities(v).map(a => a.id)));
    const standaloneActivities = weekActivityLog
      .filter(a => a.created_by === name && !attachedIds.has(a.id))
      .sort((a, b) => (b.date || "").localeCompare(a.date || ""));
    return { name, visits: salesVisits, rescheduledVisits, cancelledVisits, dealUpdates: salesDealUpdates, standaloneActivities };
  });

  function buildShareText() {
    const lines: string[] = [
      "*Laporan Mingguan Sales NDS*",
      `Periode: ${label}`,
      "",
      `Visit selesai: ${weekVisits.length} (${new Set(weekVisits.map(v => v.client_id)).size} client)`,
      `Update pipeline: ${weekDealUpdates.length}`,
      `Closed Won: ${weekWon.length}${weekWon.length ? ` — ${fmtIDR(weekWon.reduce((s, d) => s + d.value, 0))}` : ""}`,
    ];
    if (weekReschedules.length) lines.push(`Reschedule: ${weekReschedules.length}`);
    if (weekCancels.length) lines.push(`Cancel: ${weekCancels.length}`);
    for (const s of salesData) {
      if (!s.visits.length && !s.rescheduledVisits.length && !s.cancelledVisits.length) continue;
      lines.push("", `*${s.name}* — ${s.visits.length} visit`);
      for (const v of s.visits) {
        const summary = (v.summary || "").trim().replace(/\s+/g, " ");
        const short = summary.length > 120 ? summary.slice(0, 117) + "…" : summary;
        lines.push(`• ${fmtDate(v.date)} ${clientName(v.client_id)}${short ? ` — ${short}` : ""}`);
      }
      for (const v of s.rescheduledVisits) {
        const reason = (v.reschedule_reason || "").trim().replace(/\s+/g, " ");
        lines.push(`• ↻ ${fmtDate(v.date)} ${clientName(v.client_id)} — Reschedule${reason ? `: ${reason}` : ""}`);
      }
      for (const v of s.cancelledVisits) {
        const reason = (v.cancel_reason || "").trim().replace(/\s+/g, " ");
        lines.push(`• ✕ ${fmtDate(v.date)} ${clientName(v.client_id)} — Cancel${reason ? `: ${reason}` : ""}`);
      }
    }
    return lines.join("\n");
  }

  async function handleExportPdf() {
    if (pdfSaving) return;
    setPdfSaving(true);
    try {
      await exportWeeklyReportPdf(salesData, clientName, label, {
        visitDone: weekVisits.length,
        clientCount: new Set(weekVisits.map(v => v.client_id)).size,
        pipelineUpdates: weekDealUpdates.length,
        wonCount: weekWon.length,
        wonValue: weekWon.reduce((s, d) => s + d.value, 0),
      });
    } finally {
      setPdfSaving(false);
    }
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
        <button className="btn btn-ghost btn-sm" onClick={() => shareToWhatsApp(buildShareText())}><Share2 size={13} /> Share WA</button>
        <button className="btn btn-ghost btn-sm" onClick={() => exportWeeklyReport(salesData, clientName, relatedDeal, label)}><Download size={13} /> Export Excel</button>
        <button className="btn btn-ghost btn-sm" onClick={handleExportPdf} disabled={pdfSaving}>
          {pdfSaving ? <span className="btn-spinner" /> : <FileText size={13} />} {pdfSaving ? "Membuat PDF…" : "Export PDF"}
        </button>
      </div>

      <div className="kpis" style={{ marginBottom: 20 }}>
        <div className="kpi kpi-v2" style={{ cursor: "pointer" }} onClick={() => onOpenCalendarWeek({ start, end })}
          onKeyDown={onActivateKey(() => onOpenCalendarWeek({ start, end }))} role="button" tabIndex={0} title="Buka Calendar Visit · minggu ini saja">
          <div className="kpi-label">Visit Selesai</div>
          <div className="kpi-num">{weekVisits.length}</div>
          <div className="kpi-sub">{new Set(weekVisits.map(v => v.client_id)).size} client dikunjungi</div>
          <PeriodDelta current={weekVisits.length} previous={prevWeekVisits.length} label="minggu lalu" />
        </div>
        <div className="kpi kpi-v2" style={{ cursor: "pointer" }} onClick={() => onOpenPipelineWeek({ start, end })}
          onKeyDown={onActivateKey(() => onOpenPipelineWeek({ start, end }))} role="button" tabIndex={0} title="Buka Pipeline · deal update minggu ini saja">
          <div className="kpi-label">Update Pipeline</div>
          <div className="kpi-num">{weekDealUpdates.length}</div>
          <div className="kpi-sub">deal berpindah stage</div>
          <PeriodDelta current={weekDealUpdates.length} previous={prevWeekDealUpdates.length} label="minggu lalu" />
        </div>
        <div className="kpi kpi-v2" style={{ borderColor: weekWon.length ? "var(--brand)" : "", cursor: "pointer" }} onClick={() => onOpenPipelineWeek({ start, end }, "Dealed")}
          onKeyDown={onActivateKey(() => onOpenPipelineWeek({ start, end }, "Dealed"))} role="button" tabIndex={0} title="Buka Pipeline · stage Dealed, minggu ini saja">
          <div className="kpi-label">Closed Won</div>
          <div className="kpi-num" style={{ color: weekWon.length ? "var(--brand)" : "" }}>{weekWon.length}</div>
          <div className="kpi-sub">{fmtIDR(weekWon.reduce((s, d) => s + d.value, 0))}</div>
          <PeriodDelta current={weekWon.length} previous={prevWeekWon.length} label="minggu lalu" />
        </div>
        <div className="kpi">
          <div className="kpi-label">Sales Aktif</div>
          <div className="kpi-num">{activeSales.size}<span className="muted">/{team.length}</span></div>
          <div className="kpi-sub">visit atau update aktivitas minggu ini</div>
        </div>
      </div>

      {salesData.map(s => (
        <div key={s.name} className="panel wr-sales-panel">
          <div className="wr-sales-header">
            <div className="wr-sales-name"><User size={15} /> {s.name}</div>
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
              {s.rescheduledVisits.length > 0 && (
                <>
                  <span>·</span>
                  <span>{s.rescheduledVisits.length} reschedule</span>
                </>
              )}
              {s.cancelledVisits.length > 0 && (
                <>
                  <span>·</span>
                  <span>{s.cancelledVisits.length} cancel</span>
                </>
              )}
            </div>
          </div>

          {s.visits.length === 0 && s.rescheduledVisits.length === 0 && s.cancelledVisits.length === 0 && s.standaloneActivities.length === 0 ? (
            <div className="empty-state" style={{ padding: "14px 0" }}>Belum ada visit atau update aktivitas minggu ini.</div>
          ) : (
            <>
            {s.visits.length === 0 ? (
              <div className="empty-state" style={{ padding: "14px 0" }}>Belum ada visit selesai minggu ini.</div>
            ) : (
            <div className="wr-card-list">
              {s.visits.map(v => {
                const deal = relatedDeal(v);
                const dealUpdatedThisWeek = deal?.stage_updated_at ? inRange(deal.stage_updated_at, start, end) : false;
                const clientProjects = relatedProjects(v.client_id);
                const weekActivities = relatedActivities(v);
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
                            className="wr-update-chip wr-update-chip-clickable stage-text"
                            style={{ borderColor: STAGE_COLOR[deal.stage] || "var(--brand)", color: STAGE_COLOR[deal.stage] || "var(--brand)" }}
                            onClick={() => onOpenDeal(deal.id)}
                            title="Buka detail pipeline"
                          >
                            <Briefcase size={12} /> {deal.name} → {deal.stage}
                            {dealUpdatedThisWeek && " · update minggu ini"}
                          </span>
                        )}
                        {clientProjects.map(p => (
                          <span
                            key={p.id}
                            className="wr-update-chip wr-update-chip-clickable"
                            onClick={() => setDetailProject(p)}
                            title="Lihat detail project"
                          >
                            <FolderKanban size={12} /> {p.name} · {p.status}
                          </span>
                        ))}
                      </div>
                    )}
                    {weekActivities.length > 0 && (
                      <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 4 }}>
                        {weekActivities.map(a => (
                          <div key={a.id} style={{ fontSize: 11.5, color: "var(--ink-soft)", borderLeft: "2px solid var(--line)", paddingLeft: 8 }}>
                            <b>{a.type}</b>{a.date ? ` · ${fmtDate(a.date)}` : ""}{a.created_by ? ` · ${a.created_by}` : ""}
                            {a.description ? ` — ${a.description}` : ""}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            )}

            {(s.rescheduledVisits.length > 0 || s.cancelledVisits.length > 0) && (
              <div className="wr-card-list" style={{ marginTop: s.visits.length ? 10 : 0 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "var(--ink-soft)", textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 2 }}>
                  Reschedule & Cancel Minggu Ini
                </div>
                {s.rescheduledVisits.map(v => (
                  <div key={v.id} className="wr-card" style={{ borderLeftColor: "#CA8A04" }}>
                    <div className="wr-card-top">
                      <span className="wr-date">{fmtDate(v.date)}</span>
                      <span className="wr-client">{clientName(v.client_id)}</span>
                      <span className="wr-approach" style={{ background: "#FEF9C3", color: "#854D0E" }}>↻ Reschedule</span>
                    </div>
                    <div className="wr-summary">
                      {v.reschedule_reason || <em className="muted">Alasan reschedule belum diisi.</em>}
                    </div>
                  </div>
                ))}
                {s.cancelledVisits.map(v => (
                  <div key={v.id} className="wr-card" style={{ borderLeftColor: "#991B1B" }}>
                    <div className="wr-card-top">
                      <span className="wr-date">{fmtDate(v.date)}</span>
                      <span className="wr-client">{clientName(v.client_id)}</span>
                      <span className="wr-approach" style={{ background: "#FEE2E2", color: "#991B1B" }}>✕ Cancel</span>
                    </div>
                    <div className="wr-summary">
                      {v.cancel_reason || <em className="muted">Alasan cancel belum diisi.</em>}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {s.standaloneActivities.length > 0 && (
              <div className="wr-card-list" style={{ marginTop: s.visits.length ? 10 : 0 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "var(--ink-soft)", textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 2 }}>
                  Update Aktivitas (di Luar Visit)
                </div>
                {s.standaloneActivities.map(a => {
                  const ref = activityRef(a);
                  return (
                    <div key={a.id} className="wr-card">
                      <div className="wr-card-top">
                        <span className="wr-date">{a.date ? fmtDate(a.date) : "—"}</span>
                        <span className="wr-client">{ref ? clientName(ref.clientId) : "—"}</span>
                        <span className="wr-approach">{a.type}</span>
                      </div>
                      <div className="wr-summary">
                        {a.description || <em className="muted">Tidak ada catatan.</em>}
                      </div>
                      {ref && (
                        <div className="wr-updates">
                          {ref.kind === "deal" ? (
                            <span
                              className="wr-update-chip wr-update-chip-clickable stage-text"
                              style={{ borderColor: STAGE_COLOR[ref.deal.stage] || "var(--brand)", color: STAGE_COLOR[ref.deal.stage] || "var(--brand)" }}
                              onClick={() => onOpenDeal(ref.deal.id)}
                              title="Buka detail pipeline"
                            >
                              <Briefcase size={12} /> {ref.deal.name} → {ref.deal.stage}
                            </span>
                          ) : (
                            <span
                              className="wr-update-chip wr-update-chip-clickable"
                              onClick={() => setDetailProject(ref.project)}
                              title="Lihat detail project"
                            >
                              <FolderKanban size={12} /> {ref.project.name} · {ref.project.status}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
            </>
          )}
        </div>
      ))}

      <Modal open={!!detailProject} onClose={() => setDetailProject(null)} title="Detail Project">
        {detailProject && (
          <>
            <div className="dd-title-row">
              <div>
                <div className="dd-name">{detailProject.name}</div>
                <div className="dd-client">{clientName(detailProject.client_id)}</div>
              </div>
              <span className="badge">{detailProject.status}</span>
            </div>
            <div className="dd-grid">
              <div className="dd-item"><div className="dd-label">Produk / Solusi</div><div className="dd-value">{detailProject.product || "—"}</div></div>
              <div className="dd-item"><div className="dd-label">Partner</div><div className="dd-value">{detailProject.partner || "—"}</div></div>
              <div className="dd-item"><div className="dd-label">Target Go-Live</div><div className="dd-value">{detailProject.golive ? fmtDate(detailProject.golive) : "—"}</div></div>
              <div className="dd-item"><div className="dd-label">Nilai</div><div className="dd-value dd-value-brand">{fmtIDR(detailProject.value)}</div></div>
            </div>
            <div className="dd-block">
              <div className="dd-label">Catatan</div>
              <div className="dd-text">{detailProject.notes || "—"}</div>
            </div>
            <ModalActions>
              <button className="btn btn-ghost" onClick={() => setDetailProject(null)}>Tutup</button>
            </ModalActions>
          </>
        )}
      </Modal>
    </section>
  );
}
