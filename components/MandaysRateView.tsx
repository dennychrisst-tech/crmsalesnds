"use client";
import { useState } from "react";
import { AppData } from "@/hooks/useData";
import { MandaysRole, MandaysClientRate } from "@/types";
import { fmtIDR } from "@/lib/utils";
import EmptyState from "./ui/EmptyState";
import MandaysRoleModal from "./MandaysRoleModal";
import MandaysClientRateModal from "./MandaysClientRateModal";

interface Props {
  data: AppData;
  isViewer?: boolean;
  onSaveRole: (r: MandaysRole) => Promise<void>;
  onDeleteRole: (id: string) => Promise<void>;
  onSaveClientRate: (r: MandaysClientRate) => Promise<void>;
  onDeleteClientRate: (id: string) => Promise<void>;
}

const CLASS_COLOR: Record<string, { bg: string; fg: string }> = {
  "< Low": { bg: "#DBEAFE", fg: "#1D4ED8" },
  "Low": { bg: "#DCFCE7", fg: "#15803D" },
  "< Medium": { bg: "#D1FAE5", fg: "#047857" },
  "Medium": { bg: "#FEF3C7", fg: "#B45309" },
  "< Max": { bg: "#FFEDD5", fg: "#C2410C" },
  "> Max": { bg: "#FEE2E2", fg: "#B91C1C" },
};

function ClassBadge({ classification }: { classification: string }) {
  if (!classification) return null;
  const style = CLASS_COLOR[classification] || { bg: "#F1EFE8", fg: "#5C5440" };
  return (
    <span style={{ fontWeight: 700, fontSize: 11, padding: "1px 7px", borderRadius: 999, background: style.bg, color: style.fg, whiteSpace: "nowrap" }}>
      {classification}
    </span>
  );
}

export default function MandaysRateView({ data, isViewer, onSaveRole, onDeleteRole, onSaveClientRate, onDeleteClientRate }: Props) {
  const { mandays_roles, mandays_client_rates } = data;
  const [clientFilter, setClientFilter] = useState("all");
  const [roleModalOpen, setRoleModalOpen] = useState(false);
  const [editRole, setEditRole] = useState<MandaysRole | null>(null);
  const [rateModalOpen, setRateModalOpen] = useState(false);
  const [editRate, setEditRate] = useState<MandaysClientRate | null>(null);
  const [defaultRoleId, setDefaultRoleId] = useState<string | undefined>(undefined);

  const roles = [...mandays_roles].sort((a, b) => a.role_name.localeCompare(b.role_name));
  const roleName = (id: string) => roles.find(r => r.id === id)?.role_name || "—";

  const clients = Array.from(new Set(mandays_client_rates.map(r => r.client_label))).sort();
  const filteredRates = clientFilter === "all" ? mandays_client_rates : mandays_client_rates.filter(r => r.client_label === clientFilter);

  const overCount = mandays_client_rates.filter(r => r.classification === "> Max").length;
  const underCount = mandays_client_rates.filter(r => r.classification === "< Low").length;

  function openNewRole() { setEditRole(null); setRoleModalOpen(true); }
  function openEditRole(r: MandaysRole) { if (isViewer) return; setEditRole(r); setRoleModalOpen(true); }
  function openNewRate(roleId?: string) { setEditRate(null); setDefaultRoleId(roleId); setRateModalOpen(true); }
  function openEditRate(r: MandaysClientRate) { if (isViewer) return; setEditRate(r); setDefaultRoleId(undefined); setRateModalOpen(true); }

  // Group client rates into per-client pivot tables: rows = roles that have
  // an entry for that client, columns = distinct rate labels for that client
  // (in first-seen order), mirroring the source rate-card spreadsheet layout.
  const byClient: Record<string, MandaysClientRate[]> = {};
  filteredRates.forEach(r => { (byClient[r.client_label] ||= []).push(r); });

  return (
    <section>
      <div className="toolbar">
        <select className="search" style={{ flex: "none", width: "auto" }} value={clientFilter} onChange={e => setClientFilter(e.target.value)}>
          <option value="all">Semua Client</option>
          {clients.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        {!isViewer && <button className="btn btn-sm" onClick={() => openNewRate()}>+ Tambah Rate Client</button>}
        {!isViewer && <button className="btn btn-ghost btn-sm" onClick={openNewRole}>+ Tambah Role</button>}
      </div>

      {roles.length === 0 ? (
        <EmptyState icon="💰" label="Belum ada Rate Card." sub="Tambahkan role beserta COGS/Low/Medium/Max Rate untuk mulai." />
      ) : (
        <>
          <div className="kpis">
            <div className="kpi-v2" style={{ background: "var(--card)", border: "1px solid var(--line)", borderRadius: 12, padding: "16px 18px", boxShadow: "var(--shadow)", borderTop: "2px solid var(--ink)" }}>
              <div className="kpi-label" style={{ marginBottom: 8 }}>Total Role</div>
              <div className="kpi-num" style={{ marginBottom: 2 }}>{roles.length}</div>
            </div>
            <div className="kpi-v2" style={{ background: "var(--card)", border: "1px solid var(--line)", borderRadius: 12, padding: "16px 18px", boxShadow: "var(--shadow)", borderTop: "2px solid var(--brand)" }}>
              <div className="kpi-label" style={{ marginBottom: 8 }}>Total Client</div>
              <div className="kpi-num" style={{ color: "var(--brand)", marginBottom: 2 }}>{clients.length}</div>
            </div>
            <div className="kpi-v2" style={{ background: "var(--card)", border: "1px solid var(--line)", borderRadius: 12, padding: "16px 18px", boxShadow: "var(--shadow)", borderTop: "2px solid var(--ink)" }}>
              <div className="kpi-label" style={{ marginBottom: 8 }}>Total Rate Entries</div>
              <div className="kpi-num" style={{ marginBottom: 2 }}>{mandays_client_rates.length}</div>
            </div>
            <div className="kpi-v2" style={{ background: "var(--card)", border: "1px solid var(--line)", borderRadius: 12, padding: "16px 18px", boxShadow: "var(--shadow)", borderTop: "2px solid #B91C1C" }}>
              <div className="kpi-label" style={{ marginBottom: 8 }}>{"Overpriced (> Max)"}</div>
              <div className="kpi-num" style={{ color: "#B91C1C", marginBottom: 2 }}>{overCount}</div>
            </div>
            <div className="kpi-v2" style={{ background: "var(--card)", border: "1px solid var(--line)", borderRadius: 12, padding: "16px 18px", boxShadow: "var(--shadow)", borderTop: "2px solid #1D4ED8" }}>
              <div className="kpi-label" style={{ marginBottom: 8 }}>{"Underpriced (< Low)"}</div>
              <div className="kpi-num" style={{ color: "#1D4ED8", marginBottom: 2 }}>{underCount}</div>
            </div>
          </div>

          <div className="panel">
            <h2 style={{ marginBottom: 12 }}>Rate Card Internal</h2>
            <table className="data-table">
              <thead>
                <tr><th>Role</th><th>COGS</th><th>Low Rate</th><th>Med Rate</th><th>Max Price</th></tr>
              </thead>
              <tbody>
                {roles.map(r => (
                  <tr key={r.id} style={{ cursor: isViewer ? "default" : "pointer" }} onClick={() => openEditRole(r)}>
                    <td><b>{r.role_name}</b></td>
                    <td>{fmtIDR(r.cogs)}</td>
                    <td>{fmtIDR(r.low_rate)}</td>
                    <td>{fmtIDR(r.med_rate)}</td>
                    <td>{fmtIDR(r.max_price)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="mobile-cards">
              {roles.map(r => (
                <div key={r.id} className="mcard" onClick={() => openEditRole(r)}>
                  <div className="mcard-head"><div className="mcard-title">{r.role_name}</div></div>
                  <div className="mcard-row"><span>COGS</span><b>{fmtIDR(r.cogs)}</b></div>
                  <div className="mcard-row"><span>Low Rate</span><b>{fmtIDR(r.low_rate)}</b></div>
                  <div className="mcard-row"><span>Med Rate</span><b>{fmtIDR(r.med_rate)}</b></div>
                  <div className="mcard-row"><span>Max Price</span><b>{fmtIDR(r.max_price)}</b></div>
                </div>
              ))}
            </div>
          </div>

          {clients.length === 0 ? (
            <div className="panel">
              <EmptyState icon="📭" label="Belum ada rate client." sub="Tambahkan rate aktual client untuk dibandingkan dengan rate card internal." />
            </div>
          ) : (
            Object.entries(byClient).sort(([a], [b]) => a.localeCompare(b)).map(([clientLabel, entries]) => {
              const rateLabels: string[] = [];
              entries.forEach(e => { if (!rateLabels.includes(e.rate_label)) rateLabels.push(e.rate_label); });
              const roleIds = Array.from(new Set(entries.map(e => e.role_id)))
                .sort((a, b) => roleName(a).localeCompare(roleName(b)));
              const cell = (roleId: string, label: string) => entries.find(e => e.role_id === roleId && e.rate_label === label);

              return (
                <div className="panel" key={clientLabel}>
                  <h2 style={{ marginBottom: 12 }}>{clientLabel}</h2>
                  <div style={{ overflowX: "auto" }}>
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Role</th>
                          {rateLabels.map(l => <th key={l}>{l}</th>)}
                        </tr>
                      </thead>
                      <tbody>
                        {roleIds.map(roleId => (
                          <tr key={roleId}>
                            <td><b>{roleName(roleId)}</b></td>
                            {rateLabels.map(label => {
                              const e = cell(roleId, label);
                              return (
                                <td key={label} style={{ cursor: e && !isViewer ? "pointer" : "default" }} onClick={() => e && openEditRate(e)}>
                                  {e ? (
                                    <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                                      <span>{fmtIDR(e.rate_value)}</span>
                                      <ClassBadge classification={e.classification} />
                                    </div>
                                  ) : "—"}
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })
          )}
        </>
      )}

      <MandaysRoleModal open={roleModalOpen} role={editRole} onSave={onSaveRole} onDelete={onDeleteRole} onClose={() => setRoleModalOpen(false)} />
      <MandaysClientRateModal open={rateModalOpen} rate={editRate} roles={roles} defaultRoleId={defaultRoleId} onSave={onSaveClientRate} onDelete={onDeleteClientRate} onClose={() => setRateModalOpen(false)} />
    </section>
  );
}
