"use client";
import { useState } from "react";
import { AppData } from "@/hooks/useData";
import { RevenueLine, RevenueOpportunity, RevenueTarget } from "@/types";
import {
  fmtIDR, fmtDate, REVENUE_LINE_CATEGORIES, REVENUE_OPP_STATUS,
  REVENUE_OPP_CATEGORY_COLOR, REVENUE_OPP_STATUS_COLOR, REVENUE_MILESTONE_STATUS_COLOR,
} from "@/lib/utils";
import RevenueLineModal from "./RevenueLineModal";
import RevenueOpportunityModal from "./RevenueOpportunityModal";
import RevenueTargetModal from "./RevenueTargetModal";
import EmptyState from "./ui/EmptyState";

interface Props {
  data: AppData;
  isViewer?: boolean;
  onSaveTarget: (t: RevenueTarget) => Promise<void>;
  onSaveLine: (l: RevenueLine) => Promise<void>;
  onDeleteLine: (id: string) => Promise<void>;
  onSaveOpportunity: (o: RevenueOpportunity) => Promise<void>;
  onDeleteOpportunity: (id: string) => Promise<void>;
}

const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Ags", "Sep", "Okt", "Nov", "Des"];
const CATEGORY_LABELS: Record<string, string> = { Project: "Project (Contracted)", Maintenance: "Support Maintenance", Other: "Others" };

function KpiCard({ label, value, sub, accent }: { label: string; value: string; sub?: string; accent: string }) {
  return (
    <div className="kpi-v2" style={{
      background: "var(--card)", border: "1px solid var(--line)", borderRadius: 12, padding: "16px 18px",
      boxShadow: "var(--shadow)", borderTop: `2px solid ${accent}`,
    }}>
      <div className="kpi-label" style={{ marginBottom: 8 }}>{label}</div>
      <div className="kpi-num" style={{ color: accent, marginBottom: 2 }}>{value}</div>
      {sub && <div className="kpi-sub">{sub}</div>}
    </div>
  );
}

export default function RevenueForecastView({ data, isViewer, onSaveTarget, onSaveLine, onDeleteLine, onSaveOpportunity, onDeleteOpportunity }: Props) {
  const { revenue_targets, revenue_lines, revenue_opportunities, profiles } = data;
  const team = profiles.filter(p => !["super_admin", "admin", "viewer"].includes(p.role)).map(p => p.name).filter(Boolean);

  const currentYear = new Date().getFullYear();
  const years = Array.from(new Set([
    currentYear,
    ...revenue_targets.map(t => t.year),
    ...revenue_lines.map(l => l.year),
    ...revenue_opportunities.map(o => o.year),
  ])).sort((a, b) => b - a);

  const [year, setYear] = useState(currentYear);
  const [targetModalOpen, setTargetModalOpen] = useState(false);
  const [lineModalOpen, setLineModalOpen] = useState(false);
  const [editLine, setEditLine] = useState<RevenueLine | null>(null);
  const [oppModalOpen, setOppModalOpen] = useState(false);
  const [editOpp, setEditOpp] = useState<RevenueOpportunity | null>(null);
  const [oppFilter, setOppFilter] = useState<"Active" | "Hold" | "Drop">("Active");

  const target = revenue_targets.find(t => t.year === year) || null;
  const yearLines = revenue_lines.filter(l => l.year === year);
  const yearOpps = revenue_opportunities.filter(o => o.year === year);

  const allMilestones = yearLines.flatMap(l => l.milestones.map(m => ({ ...m, lineId: l.id })));
  const contractedTotal = allMilestones.reduce((s, m) => s + (m.amount || 0), 0);
  const oppActiveTotal = yearOpps.filter(o => o.status === "Active").reduce((s, o) => s + o.amount, 0);
  const totalEstimated = contractedTotal + oppActiveTotal;
  const targetRevenue = target?.target_revenue || 0;
  const remaining = Math.max(targetRevenue - totalEstimated, 0);
  const pctContracted = targetRevenue > 0 ? Math.min((contractedTotal / targetRevenue) * 100, 100) : 0;
  const pctOppty = targetRevenue > 0 ? Math.min((oppActiveTotal / targetRevenue) * 100, 100) : 0;

  const statusTotals: Record<string, number> = {};
  for (const m of allMilestones) statusTotals[m.status] = (statusTotals[m.status] || 0) + (m.amount || 0);

  const monthlyTotals = Array.from({ length: 12 }, (_, i) => {
    const monthKey = `${year}-${String(i + 1).padStart(2, "0")}`;
    return allMilestones.filter(m => m.target_month === monthKey).reduce((s, m) => s + (m.amount || 0), 0);
  });
  const maxMonthly = Math.max(...monthlyTotals, 1);

  function openNewLine() { setEditLine(null); setLineModalOpen(true); }
  function openEditLine(l: RevenueLine) { setEditLine(l); setLineModalOpen(true); }
  function openNewOpp() { setEditOpp(null); setOppModalOpen(true); }
  function openEditOpp(o: RevenueOpportunity) { setEditOpp(o); setOppModalOpen(true); }

  const filteredOpps = yearOpps.filter(o => o.status === oppFilter);

  return (
    <section>
      <div className="toolbar">
        <select className="search" style={{ flex: "none", width: "auto" }} value={year} onChange={e => setYear(Number(e.target.value))}>
          {years.map(y => <option key={y} value={y}>{y}</option>)}
        </select>
        {!isViewer && <button className="btn btn-ghost btn-sm" onClick={() => setTargetModalOpen(true)}>Edit Target</button>}
      </div>

      {/* KPI Summary */}
      <div className="kpis">
        <KpiCard label="Target Revenue" value={fmtIDR(targetRevenue)} accent="var(--ink)" />
        <KpiCard label="Contracted" value={fmtIDR(contractedTotal)}
          sub={targetRevenue > 0 ? `${pctContracted.toFixed(1)}% dari target` : undefined} accent="var(--brand)" />
        <KpiCard label="Oppty Active" value={fmtIDR(oppActiveTotal)}
          sub={`${yearOpps.filter(o => o.status === "Active").length} opportunity`} accent="#D97706" />
        <KpiCard label="Total Estimated" value={fmtIDR(totalEstimated)}
          sub={targetRevenue > 0 ? `${(pctContracted + pctOppty).toFixed(1)}% dari target` : undefined} accent="#2563EB" />
        <KpiCard label="Remaining to Target" value={fmtIDR(remaining)} accent={remaining > 0 ? "var(--danger)" : "var(--brand)"} />
      </div>

      {/* Progress bar: Contracted + Oppty vs Target */}
      {targetRevenue > 0 && (
        <div className="panel">
          <h2 style={{ marginBottom: 12 }}>Pencapaian vs Target</h2>
          <div className="funnel-track" style={{ display: "flex", height: 22 }}>
            <div className="funnel-fill" style={{ width: `${pctContracted}%`, background: "var(--brand)" }} title="Contracted" />
            <div className="funnel-fill" style={{ width: `${pctOppty}%`, background: "#D97706" }} title="Oppty Active" />
          </div>
          <div style={{ display: "flex", gap: 16, marginTop: 8, fontSize: 12, color: "var(--ink-soft)" }}>
            <span><span style={{ display: "inline-block", width: 8, height: 8, borderRadius: 2, background: "var(--brand)", marginRight: 5 }} />Contracted ({pctContracted.toFixed(1)}%)</span>
            <span><span style={{ display: "inline-block", width: 8, height: 8, borderRadius: 2, background: "#D97706", marginRight: 5 }} />Oppty Active ({pctOppty.toFixed(1)}%)</span>
          </div>
        </div>
      )}

      <div className="grid2">
        {/* Billing status breakdown */}
        <div className="panel">
          <h2 style={{ marginBottom: 12 }}>Status Billing</h2>
          {allMilestones.length === 0 ? <EmptyState icon="📭" label="Belum ada milestone." /> : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {Object.entries(statusTotals).map(([status, amount]) => {
                const c = REVENUE_MILESTONE_STATUS_COLOR[status] || { bg: "var(--paper)", fg: "var(--ink-soft)" };
                const pct = contractedTotal > 0 ? (amount / contractedTotal) * 100 : 0;
                return (
                  <div key={status}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, marginBottom: 3 }}>
                      <span style={{ fontWeight: 600, color: c.fg }}>{status}</span>
                      <span style={{ fontWeight: 700 }}>{fmtIDR(amount)}</span>
                    </div>
                    <div style={{ background: "var(--line)", borderRadius: 999, height: 8, overflow: "hidden" }}>
                      <div style={{ width: `${pct}%`, height: "100%", background: c.fg, borderRadius: 999 }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Monthly cash-in */}
        <div className="panel">
          <h2 style={{ marginBottom: 12 }}>Invoicing per Bulan</h2>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 4, height: 110 }}>
            {monthlyTotals.map((amt, i) => (
              <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-end", height: "100%" }}
                title={`${MONTH_LABELS[i]} ${year}: ${fmtIDR(amt)}`}>
                <div style={{
                  width: "100%", borderRadius: "4px 4px 0 0", background: amt > 0 ? "var(--brand)" : "var(--line)",
                  height: `${Math.max((amt / maxMonthly) * 90, amt > 0 ? 4 : 2)}%`,
                }} />
                <div style={{ fontSize: 9.5, color: "var(--ink-soft)", marginTop: 4 }}>{MONTH_LABELS[i]}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Kontrak list */}
      <div className="panel">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <h2 style={{ margin: 0 }}>Kontrak</h2>
          {!isViewer && <button className="btn btn-sm" onClick={openNewLine}>+ Tambah Kontrak</button>}
        </div>
        {yearLines.length === 0 ? <EmptyState icon="📄" label="Belum ada kontrak untuk tahun ini." /> : (
          REVENUE_LINE_CATEGORIES.map(cat => {
            const lines = yearLines.filter(l => l.category === cat);
            if (!lines.length) return null;
            const catTotal = lines.reduce((s, l) => s + l.milestones.reduce((ss, m) => ss + (m.amount || 0), 0), 0);
            return (
              <div key={cat} style={{ marginBottom: 16 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, fontWeight: 700, color: "var(--ink-soft)", textTransform: "uppercase", letterSpacing: ".04em", marginBottom: 8 }}>
                  <span>{CATEGORY_LABELS[cat]}</span>
                  <span>{fmtIDR(catTotal)}</span>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {lines.map(l => {
                    const lineTotal = l.milestones.reduce((s, m) => s + (m.amount || 0), 0);
                    const billedCount = l.milestones.filter(m => m.status === "Paid" || m.status === "Billed").length;
                    return (
                      <div key={l.id} className="ccard" style={{ padding: "10px 14px", cursor: "pointer" }} onClick={() => openEditLine(l)}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                          <div>
                            <div style={{ fontWeight: 700, fontSize: 13.5 }}>{l.project_name}</div>
                            <div style={{ fontSize: 11.5, color: "var(--ink-soft)", marginTop: 2 }}>
                              {l.pic ? `PIC: ${l.pic} · ` : ""}{l.milestones.length} milestone ({billedCount} billed/paid)
                            </div>
                          </div>
                          <div style={{ fontWeight: 700, fontSize: 13, color: "var(--brand)", whiteSpace: "nowrap" }}>{fmtIDR(lineTotal)}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Opportunity list */}
      <div className="panel">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14, flexWrap: "wrap", gap: 8 }}>
          <h2 style={{ margin: 0 }}>Opportunity</h2>
          <div style={{ display: "flex", gap: 6 }}>
            {REVENUE_OPP_STATUS.map(s => (
              <button key={s} type="button"
                style={{
                  border: "1.5px solid var(--line)", background: oppFilter === s ? "var(--ink)" : "var(--card)",
                  color: oppFilter === s ? "#fff" : "var(--ink-soft)", padding: "6px 12px", borderRadius: 999,
                  fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
                }}
                onClick={() => setOppFilter(s)}>
                {s} ({yearOpps.filter(o => o.status === s).length})
              </button>
            ))}
          </div>
          {!isViewer && <button className="btn btn-sm" onClick={openNewOpp}>+ Tambah Opportunity</button>}
        </div>

        {filteredOpps.length === 0 ? <EmptyState icon="💼" label={`Belum ada opportunity berstatus ${oppFilter}.`} /> : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {filteredOpps.map(o => {
              const catStyle = REVENUE_OPP_CATEGORY_COLOR[o.category] || { bg: "var(--paper)", fg: "var(--ink-soft)" };
              const statusStyle = REVENUE_OPP_STATUS_COLOR[o.status] || { bg: "var(--paper)", fg: "var(--ink-soft)" };
              return (
                <div key={o.id} className="ccard" style={{ padding: "10px 14px", cursor: "pointer" }} onClick={() => openEditOpp(o)}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <span style={{ fontSize: 10.5, fontWeight: 800, padding: "1px 7px", borderRadius: 999, background: catStyle.bg, color: catStyle.fg }}>{o.category}</span>
                        <span style={{ fontWeight: 700, fontSize: 13.5 }}>{o.project_name}</span>
                      </div>
                      <div style={{ fontSize: 11.5, color: "var(--ink-soft)", marginTop: 4 }}>
                        {o.pic ? `PIC: ${o.pic}` : ""}
                        {o.target_closing_date ? ` · Target Closing: ${fmtDate(o.target_closing_date)}` : ""}
                        {o.product ? ` · ${o.product}` : ""}
                      </div>
                      {o.status !== "Active" && o.reason && (
                        <div style={{ fontSize: 11.5, color: "var(--danger)", marginTop: 4 }}>{o.reason}</div>
                      )}
                    </div>
                    <div style={{ textAlign: "right", flexShrink: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: 13, color: "var(--brand)" }}>{fmtIDR(o.amount)}</div>
                      <span style={{ fontSize: 10.5, fontWeight: 700, padding: "1px 7px", borderRadius: 999, background: statusStyle.bg, color: statusStyle.fg, marginTop: 3, display: "inline-block" }}>
                        {o.status}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <RevenueTargetModal open={targetModalOpen} target={target} year={year} onSave={onSaveTarget} onClose={() => setTargetModalOpen(false)} />
      <RevenueLineModal open={lineModalOpen} line={editLine} year={year} team={team} onSave={onSaveLine} onDelete={onDeleteLine} onClose={() => setLineModalOpen(false)} />
      <RevenueOpportunityModal open={oppModalOpen} opportunity={editOpp} year={year} team={team} onSave={onSaveOpportunity} onDelete={onDeleteOpportunity} onClose={() => setOppModalOpen(false)} />
    </section>
  );
}
