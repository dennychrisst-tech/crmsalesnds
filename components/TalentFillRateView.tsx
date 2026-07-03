"use client";
import { useState } from "react";
import { AppData } from "@/hooks/useData";
import { TalentRole } from "@/types";
import EmptyState from "./ui/EmptyState";

interface Props {
  data: AppData;
  onOpenClient: (clientId: string) => void;
}

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

function FillRateBadge({ rate }: { rate: number }) {
  const style = rate >= 20 ? { bg: "#DCFCE7", fg: "#15803D" } : rate > 0 ? { bg: "#FEF3C7", fg: "#B45309" } : { bg: "#F1EFE8", fg: "#5C5440" };
  return (
    <span style={{ fontWeight: 700, fontSize: 12, padding: "2px 8px", borderRadius: 999, background: style.bg, color: style.fg }}>
      {rate.toFixed(1)}%
    </span>
  );
}

function pct(n: number, d: number) { return d > 0 ? (n / d) * 100 : 0; }

type Agg = { count: number; req_cv: number; cv_submitted: number; cv_reject: number; cv_not_response: number; po_issued: number };
const emptyAgg = (): Agg => ({ count: 0, req_cv: 0, cv_submitted: 0, cv_reject: 0, cv_not_response: 0, po_issued: 0 });
function addRole(agg: Agg, r: TalentRole) {
  agg.count += 1; agg.req_cv += r.req_cv; agg.cv_submitted += r.cv_submitted;
  agg.cv_reject += r.cv_reject; agg.cv_not_response += r.cv_not_response; agg.po_issued += r.po_issued;
}

export default function TalentFillRateView({ data, onOpenClient }: Props) {
  const { talent_roles, projects, clients } = data;
  const [clientFilter, setClientFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "Open" | "Close">("all");

  const talentProjects = projects.filter(p => p.product === "Talent");
  const projectClientId: Record<string, string> = {};
  talentProjects.forEach(p => { projectClientId[p.id] = p.client_id; });

  const clientName = (id: string) => clients.find(c => c.id === id)?.name.trim() || "—";

  const allRoles = talent_roles.filter(r => projectClientId[r.project_id]);
  const filteredRoles = allRoles.filter(r => {
    if (statusFilter !== "all" && r.status !== statusFilter) return false;
    if (clientFilter !== "all" && projectClientId[r.project_id] !== clientFilter) return false;
    return true;
  });

  const totals = emptyAgg();
  filteredRoles.forEach(r => addRole(totals, r));
  const fillRate = pct(totals.po_issued, totals.cv_submitted);
  const rejectRate = pct(totals.cv_reject, totals.cv_submitted);
  const notResponseRate = pct(totals.cv_not_response, totals.cv_submitted);

  const byClient: Record<string, Agg> = {};
  filteredRoles.forEach(r => {
    const cid = projectClientId[r.project_id];
    (byClient[cid] ||= emptyAgg());
    addRole(byClient[cid], r);
  });
  const clientRows = Object.entries(byClient)
    .map(([clientId, v]) => ({ clientId, name: clientName(clientId), ...v, fillRate: pct(v.po_issued, v.cv_submitted) }))
    .sort((a, b) => b.cv_submitted - a.cv_submitted);

  const byRole: Record<string, Agg> = {};
  filteredRoles.forEach(r => {
    const key = r.role_name.trim() || "—";
    (byRole[key] ||= emptyAgg());
    addRole(byRole[key], r);
  });
  const roleRows = Object.entries(byRole)
    .map(([role, v]) => ({ role, ...v, fillRate: pct(v.po_issued, v.cv_submitted) }))
    .sort((a, b) => b.cv_submitted - a.cv_submitted)
    .slice(0, 12);

  const maxFunnel = Math.max(totals.req_cv, totals.cv_submitted, 1);
  const funnelRows = [
    { label: "Req CV", value: totals.req_cv, color: "var(--ink-soft)" },
    { label: "CV Submitted", value: totals.cv_submitted, color: "var(--brand)" },
    { label: "CV Reject", value: totals.cv_reject, color: "#DC2626" },
    { label: "Not Response", value: totals.cv_not_response, color: "#D97706" },
    { label: "PO Issued", value: totals.po_issued, color: "#16A34A" },
  ];

  return (
    <section>
      <div className="toolbar">
        <select className="search" style={{ flex: "none", width: "auto" }} value={clientFilter} onChange={e => setClientFilter(e.target.value)}>
          <option value="all">Semua Client</option>
          {talentProjects.map(p => <option key={p.id} value={p.client_id}>{clientName(p.client_id)}</option>)}
        </select>
        <select className="search" style={{ flex: "none", width: "auto" }} value={statusFilter} onChange={e => setStatusFilter(e.target.value as "all" | "Open" | "Close")}>
          <option value="all">Semua Status</option>
          <option value="Open">Open</option>
          <option value="Close">Close</option>
        </select>
      </div>

      {allRoles.length === 0 ? (
        <EmptyState icon="🧑‍💼" label="Belum ada data Talent." sub="Requisition akan muncul di sini setelah ada Project dengan produk Talent." />
      ) : (
        <>
          <div className="kpis">
            <KpiCard label="Total Requisition" value={String(filteredRoles.length)} sub={`${clientRows.length} client`} accent="var(--ink)" />
            <KpiCard label="CV Submitted" value={String(totals.cv_submitted)} sub={`dari ${totals.req_cv} Req CV`} accent="var(--brand)" />
            <KpiCard label="PO Issued" value={String(totals.po_issued)} sub={`Fill rate ${fillRate.toFixed(1)}%`} accent="#16A34A" />
            <KpiCard label="CV Reject" value={String(totals.cv_reject)} sub={`${rejectRate.toFixed(1)}% dari submitted`} accent="#DC2626" />
            <KpiCard label="Not Response" value={String(totals.cv_not_response)} sub={`${notResponseRate.toFixed(1)}% dari submitted`} accent="#D97706" />
          </div>

          <div className="panel">
            <h2 style={{ marginBottom: 12 }}>Funnel CV</h2>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {funnelRows.map(row => (
                <div key={row.label}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, marginBottom: 3 }}>
                    <span style={{ fontWeight: 600 }}>{row.label}</span>
                    <span style={{ fontWeight: 700 }}>{row.value}</span>
                  </div>
                  <div style={{ background: "var(--line)", borderRadius: 999, height: 8, overflow: "hidden" }}>
                    <div style={{ width: `${pct(row.value, maxFunnel)}%`, height: "100%", background: row.color, borderRadius: 999 }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="panel">
            <h2 style={{ marginBottom: 12 }}>Fill Rate per Client</h2>
            {clientRows.length === 0 ? <EmptyState icon="📭" label="Tidak ada data untuk filter ini." /> : (
              <>
                <table className="data-table">
                  <thead>
                    <tr><th>Client</th><th>Requisition</th><th>Req CV</th><th>Submitted</th><th>Reject</th><th>Not Response</th><th>PO Issued</th><th>Fill Rate</th></tr>
                  </thead>
                  <tbody>
                    {clientRows.map(row => (
                      <tr key={row.clientId} style={{ cursor: "pointer" }} onClick={() => onOpenClient(row.clientId)}>
                        <td><b>{row.name}</b></td>
                        <td>{row.count}</td>
                        <td>{row.req_cv}</td>
                        <td>{row.cv_submitted}</td>
                        <td>{row.cv_reject}</td>
                        <td>{row.cv_not_response}</td>
                        <td>{row.po_issued}</td>
                        <td><FillRateBadge rate={row.fillRate} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="mobile-cards">
                  {clientRows.map(row => (
                    <div key={row.clientId} className="mcard" onClick={() => onOpenClient(row.clientId)}>
                      <div className="mcard-head">
                        <div className="mcard-title">{row.name}</div>
                        <FillRateBadge rate={row.fillRate} />
                      </div>
                      <div className="mcard-row"><span>Requisition</span><b>{row.count}</b></div>
                      <div className="mcard-row"><span>Req CV / Submitted</span><b>{row.req_cv} / {row.cv_submitted}</b></div>
                      <div className="mcard-row"><span>Reject / Not Response</span><b>{row.cv_reject} / {row.cv_not_response}</b></div>
                      <div className="mcard-row"><span>PO Issued</span><b>{row.po_issued}</b></div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>

          <div className="panel">
            <h2 style={{ marginBottom: 12 }}>Fill Rate per Role (Top 12)</h2>
            {roleRows.length === 0 ? <EmptyState icon="📭" label="Tidak ada data untuk filter ini." /> : (
              <>
                <table className="data-table">
                  <thead>
                    <tr><th>Role</th><th>Requisition</th><th>Submitted</th><th>Reject</th><th>Not Response</th><th>PO Issued</th><th>Fill Rate</th></tr>
                  </thead>
                  <tbody>
                    {roleRows.map(row => (
                      <tr key={row.role}>
                        <td><b>{row.role}</b></td>
                        <td>{row.count}</td>
                        <td>{row.cv_submitted}</td>
                        <td>{row.cv_reject}</td>
                        <td>{row.cv_not_response}</td>
                        <td>{row.po_issued}</td>
                        <td><FillRateBadge rate={row.fillRate} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="mobile-cards">
                  {roleRows.map(row => (
                    <div key={row.role} className="mcard">
                      <div className="mcard-head">
                        <div className="mcard-title">{row.role}</div>
                        <FillRateBadge rate={row.fillRate} />
                      </div>
                      <div className="mcard-row"><span>Requisition</span><b>{row.count}</b></div>
                      <div className="mcard-row"><span>Submitted</span><b>{row.cv_submitted}</b></div>
                      <div className="mcard-row"><span>Reject / Not Response</span><b>{row.cv_reject} / {row.cv_not_response}</b></div>
                      <div className="mcard-row"><span>PO Issued</span><b>{row.po_issued}</b></div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </>
      )}
    </section>
  );
}
