"use client";
import { useState } from "react";
import { AppData } from "@/hooks/useData";
import { MandaysRole, MandaysClientRate } from "@/types";
import { fmtIDR, onActivateKey } from "@/lib/utils";
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

// Zone color is derived from where a value actually falls against the role's
// own COGS/Low/Med/Max bands — not from the (sometimes inconsistently worded,
// e.g. "< Medium" vs "Low") classification text stored on the record — so the
// gauge and every marker stay visually consistent no matter how a rate was
// originally labeled in the source spreadsheet.
function zoneFor(value: number, role: MandaysRole) {
  if (value < role.low_rate) return { key: "< Low", bg: "#DBEAFE", fg: "#1D4ED8" };
  if (value < role.med_rate) return { key: "Low–Medium", bg: "#DCFCE7", fg: "#15803D" };
  if (value < role.max_price) return { key: "Medium–Max", bg: "#FEF3C7", fg: "#B45309" };
  return { key: "> Max", bg: "#FEE2E2", fg: "#B91C1C" };
}

// Ranked horizontal bar chart: one bar per client rate, sorted ascending.
// Low/Medium/Max are drawn as vertical guide lines shared by every bar in the
// chart, so you can read directly which zone each bar's tip lands in without
// hovering over anything — every client name and number stays on-screen.
function RoleBars({ role, entries, isViewer, onEditRate }: {
  role: MandaysRole; entries: MandaysClientRate[]; isViewer?: boolean; onEditRate: (r: MandaysClientRate) => void;
}) {
  const scaleMax = Math.max(role.max_price, ...entries.map(e => e.rate_value), 1) * 1.08;
  const pct = (v: number) => Math.min(100, (v / scaleMax) * 100);
  const sorted = [...entries].sort((a, b) => a.rate_value - b.rate_value);

  const GuideLines = () => (
    <>
      <div style={{ position: "absolute", left: `${pct(role.low_rate)}%`, top: 0, bottom: 0, width: 1, background: "rgba(0,0,0,.22)" }} />
      <div style={{ position: "absolute", left: `${pct(role.med_rate)}%`, top: 0, bottom: 0, width: 1, background: "rgba(0,0,0,.22)" }} />
      <div style={{ position: "absolute", left: `${pct(role.max_price)}%`, top: 0, bottom: 0, width: 1, background: "rgba(0,0,0,.22)" }} />
    </>
  );

  return (
    <div className="panel">
      <h2 style={{ marginBottom: 4 }}>{role.role_name}</h2>
      <div style={{ fontSize: 12, color: "var(--ink-soft)", marginBottom: 12 }}>
        COGS {fmtIDR(role.cogs)} · Low {fmtIDR(role.low_rate)} · Med {fmtIDR(role.med_rate)} · Max {fmtIDR(role.max_price)}
      </div>

      {entries.length === 0 ? (
        <div style={{ fontSize: 12.5, color: "var(--ink-soft)" }}>Belum ada rate client untuk role ini.</div>
      ) : (
        <>
          {/* Label row sits above each full-width bar (rather than a fixed side
              column) so the bar itself stays readable down to phone widths.
              "Medium" gets its own row below Low/Max — when a role has a big
              outlier rate (e.g. Senior IT/IT1 with entries well past Max),
              the band compresses and same-row labels collide otherwise. */}
          <div style={{ position: "relative", height: 28, marginBottom: 6, fontSize: 10.5, color: "var(--ink-soft)" }}>
            <span style={{ position: "absolute", top: 0, left: `${pct(role.low_rate)}%`, transform: "translateX(-50%)" }}>Low</span>
            <span style={{ position: "absolute", top: 0, left: `${pct(role.max_price)}%`, transform: "translateX(-50%)" }}>Max</span>
            <span style={{ position: "absolute", top: 14, left: `${pct(role.med_rate)}%`, transform: "translateX(-50%)" }}>Medium</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {sorted.map(e => {
              const zone = zoneFor(e.rate_value, role);
              return (
                <div key={e.id} onClick={() => !isViewer && onEditRate(e)} style={{ cursor: isViewer ? "default" : "pointer" }}
                  onKeyDown={onActivateKey(() => !isViewer && onEditRate(e))} role="button" tabIndex={0}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8, marginBottom: 4 }}>
                    <div style={{ minWidth: 0, lineHeight: 1.3 }}>
                      <span style={{ fontSize: 12.5, fontWeight: 700 }}>{e.client_label}</span>
                      <span style={{ fontSize: 11, color: "var(--ink-soft)", marginLeft: 6 }}>{e.rate_label}</span>
                    </div>
                    <div style={{ flexShrink: 0, fontSize: 12.5, fontWeight: 700, color: zone.fg, whiteSpace: "nowrap" }}>
                      {fmtIDR(e.rate_value)}
                    </div>
                  </div>
                  <div style={{ position: "relative", height: 16, background: "var(--line)", borderRadius: 5, overflow: "hidden" }}>
                    <GuideLines />
                    <div style={{ width: `${pct(e.rate_value)}%`, height: "100%", background: zone.fg, borderRadius: 5 }} />
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
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

  const clients = Array.from(new Set(mandays_client_rates.map(r => r.client_label))).sort();
  const filteredRates = clientFilter === "all" ? mandays_client_rates : mandays_client_rates.filter(r => r.client_label === clientFilter);

  const overCount = mandays_client_rates.filter(r => zoneFor(r.rate_value, roles.find(role => role.id === r.role_id) || roles[0]).key === "> Max").length;
  const underCount = mandays_client_rates.filter(r => zoneFor(r.rate_value, roles.find(role => role.id === r.role_id) || roles[0]).key === "< Low").length;

  function openNewRole() { setEditRole(null); setRoleModalOpen(true); }
  function openEditRole(r: MandaysRole) { if (isViewer) return; setEditRole(r); setRoleModalOpen(true); }
  function openNewRate(roleId?: string) { setEditRate(null); setDefaultRoleId(roleId); setRateModalOpen(true); }
  function openEditRate(r: MandaysClientRate) { if (isViewer) return; setEditRate(r); setDefaultRoleId(undefined); setRateModalOpen(true); }

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
                  <tr key={r.id} style={{ cursor: isViewer ? "default" : "pointer" }} onClick={() => openEditRole(r)}
                    onKeyDown={onActivateKey(() => openEditRole(r))} role="button" tabIndex={0}>
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
                <div key={r.id} className="mcard" onClick={() => openEditRole(r)}
                  onKeyDown={onActivateKey(() => openEditRole(r))} role="button" tabIndex={0}>
                  <div className="mcard-head"><div className="mcard-title">{r.role_name}</div></div>
                  <div className="mcard-row"><span>COGS</span><b>{fmtIDR(r.cogs)}</b></div>
                  <div className="mcard-row"><span>Low Rate</span><b>{fmtIDR(r.low_rate)}</b></div>
                  <div className="mcard-row"><span>Med Rate</span><b>{fmtIDR(r.med_rate)}</b></div>
                  <div className="mcard-row"><span>Max Price</span><b>{fmtIDR(r.max_price)}</b></div>
                </div>
              ))}
            </div>
          </div>

          {roles.map(role => (
            <RoleBars
              key={role.id}
              role={role}
              entries={filteredRates.filter(e => e.role_id === role.id)}
              isViewer={isViewer}
              onEditRate={openEditRate}
            />
          ))}
        </>
      )}

      <MandaysRoleModal open={roleModalOpen} role={editRole} onSave={onSaveRole} onDelete={onDeleteRole} onClose={() => setRoleModalOpen(false)} />
      <MandaysClientRateModal open={rateModalOpen} rate={editRate} roles={roles} defaultRoleId={defaultRoleId} onSave={onSaveClientRate} onDelete={onDeleteClientRate} onClose={() => setRateModalOpen(false)} />
    </section>
  );
}
